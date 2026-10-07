import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";

function addColumn(db: Database.Database, table: string, name: string, ddl: string) {
  const cols = new Set(
    (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name),
  );
  if (!cols.has(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}

function hasColumn(db: Database.Database, table: string, name: string) {
  const cols = (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name);
  return cols.includes(name);
}

function dropColumnIfExists(db: Database.Database, table: string, name: string) {
  if (!hasColumn(db, table, name)) return;
  db.exec(`ALTER TABLE ${table} DROP COLUMN ${name}`);
}

function migrationApplied(db: Database.Database, id: string) {
  return Boolean(db.prepare("SELECT 1 AS ok FROM _migrations WHERE id = ?").get(id));
}

/** 0017 sonrası parça/kg kolonları kalkar; boy+ek kolonları kalır. */
function ensureAppointmentsP11(db: Database.Database) {
  if (!migrationApplied(db, "0019_appointments_p11.sql")) return;
  db.exec(`
    CREATE TABLE IF NOT EXISTS provider_stats (
      provider_id TEXT PRIMARY KEY REFERENCES providers(id),
      expired_count INTEGER NOT NULL DEFAULT 0
    );
  `);
  addColumn(db, "orders", "respond_by", "respond_by TEXT");
  addColumn(db, "orders", "respond_reminder_sent", "respond_reminder_sent INTEGER NOT NULL DEFAULT 0");
  const hasKind = db.prepare(`PRAGMA table_info(appointments)`).all() as { name: string }[];
  if (hasKind.length && !hasKind.some((c) => c.name === "kind")) {
    db.exec(`
      CREATE TABLE appointments_p11 (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL REFERENCES orders(id),
        kind TEXT NOT NULL CHECK (kind IN ('pickup', 'delivery')),
        date TEXT NOT NULL,
        window_start TEXT NOT NULL,
        window_end TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE (order_id, kind)
      );
      INSERT INTO appointments_p11 (id, order_id, kind, date, window_start, window_end, created_at)
      SELECT id, order_id, 'pickup', date, window_start, window_end, created_at FROM appointments;
      DROP TABLE appointments;
      ALTER TABLE appointments_p11 RENAME TO appointments;
      CREATE INDEX IF NOT EXISTS idx_appointments_order ON appointments(order_id);
    `);
  }
}

function ensureHandoffSchema(db: Database.Database) {
  if (!migrationApplied(db, "0020_handoff_codes.sql")) return;
  addColumn(db, "orders", "public_code", "public_code TEXT");
  addColumn(db, "orders", "pickup_summary_approved_at", "pickup_summary_approved_at TEXT");
  addColumn(db, "orders", "admin_hold", "admin_hold INTEGER NOT NULL DEFAULT 0");
  addColumn(db, "orders", "dispute_window_end", "dispute_window_end TEXT");
  addColumn(db, "users", "super_admin", "super_admin INTEGER NOT NULL DEFAULT 0");
  db.exec(`
    CREATE TABLE IF NOT EXISTS handoff_codes (
      order_id TEXT NOT NULL REFERENCES orders(id),
      kind TEXT NOT NULL CHECK (kind IN ('pickup', 'return')),
      code TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      locked INTEGER NOT NULL DEFAULT 0,
      expires_at TEXT,
      used_at TEXT,
      entered_by TEXT,
      override_reason TEXT,
      PRIMARY KEY (order_id, kind)
    );
    CREATE TABLE IF NOT EXISTS delivery_override_requests (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
      provider_id TEXT NOT NULL,
      photo_id TEXT NOT NULL,
      lat REAL,
      lng REAL,
      note TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      admin_reason TEXT,
      created_at TEXT NOT NULL,
      resolved_at TEXT,
      resolved_by TEXT
    );
  `);
}

function ensureCapacityCalendar(db: Database.Database) {
  if (!migrationApplied(db, "0018_capacity_calendar.sql")) return;
  db.exec(`
    CREATE TABLE IF NOT EXISTS provider_capacity_settings (
      provider_id TEXT PRIMARY KEY REFERENCES providers(id),
      half_units_per_day INTEGER NOT NULL CHECK (half_units_per_day > 0),
      working_days TEXT NOT NULL,
      max_units_per_order INTEGER NOT NULL CHECK (max_units_per_order > 0)
    );
    CREATE TABLE IF NOT EXISTS provider_capacity_days (
      provider_id TEXT NOT NULL REFERENCES providers(id),
      date TEXT NOT NULL,
      max_units INTEGER NOT NULL CHECK (max_units > 0),
      used_units INTEGER NOT NULL DEFAULT 0 CHECK (used_units >= 0),
      PRIMARY KEY (provider_id, date),
      CHECK (used_units <= max_units)
    );
  `);
  addColumn(db, "orders", "estimated_delivery_date", "estimated_delivery_date TEXT");
  addColumn(db, "orders", "promised_delivery_date", "promised_delivery_date TEXT");
  addColumn(db, "orders", "capacity_allocations", "capacity_allocations TEXT");
  addColumn(db, "orders", "delay_count", "delay_count INTEGER NOT NULL DEFAULT 0");
  dropColumnIfExists(db, "providers", "remaining");
}

function ensureOrderSizeModel(db: Database.Database) {
  if (!migrationApplied(db, "0017_order_size_model.sql")) return;
  addColumn(db, "orders", "size", "size TEXT");
  addColumn(db, "orders", "confirmed_size", "confirmed_size TEXT");
  addColumn(db, "orders", "machine_units", "machine_units INTEGER NOT NULL DEFAULT 0");
  addColumn(db, "orders", "pickup_confirmed_at", "pickup_confirmed_at TEXT");
  addColumn(db, "orders", "color_groups", "color_groups INTEGER");
  addColumn(db, "orders", "price_change", "price_change TEXT NOT NULL DEFAULT 'none'");
  addColumn(db, "orders", "cancel_reason", "cancel_reason TEXT");
  for (const col of [
    "pieces",
    "price_per_kg_snapshot",
    "estimated_weight",
    "actual_weight",
    "estimated_price",
    "final_price",
  ]) {
    dropColumnIfExists(db, "orders", col);
  }
}

function backfillHistory(db: Database.Database) {
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'order_status_history'")
    .get() as { name: string } | undefined;
  if (!tables) return;
  db.exec(`
    INSERT INTO order_status_history (
      id, order_id, from_status, to_status, from_lifecycle, to_lifecycle,
      actor_id, actor_role, note, created_at
    )
    SELECT
      'ev-' || e.id,
      e.order_id,
      e.from_status,
      e.to_status,
      CASE e.from_status
        WHEN 'onay_bekliyor' THEN 'pending'
        WHEN 'teslim_alindi' THEN 'accepted'
        WHEN 'yikaniyor' THEN 'washing'
        WHEN 'utuleniyor' THEN 'ironing'
        WHEN 'hazir' THEN 'ready'
        WHEN 'teslim_edildi' THEN 'completed'
        WHEN 'iptal' THEN 'cancelled'
        ELSE NULL
      END,
      CASE e.to_status
        WHEN 'onay_bekliyor' THEN 'pending'
        WHEN 'teslim_alindi' THEN 'accepted'
        WHEN 'yikaniyor' THEN 'washing'
        WHEN 'utuleniyor' THEN 'ironing'
        WHEN 'hazir' THEN 'ready'
        WHEN 'teslim_edildi' THEN 'completed'
        WHEN 'iptal' THEN 'cancelled'
        ELSE 'pending'
      END,
      NULL,
      NULL,
      NULL,
      e.at
    FROM order_events e
    WHERE NOT EXISTS (
      SELECT 1 FROM order_status_history h WHERE h.id = 'ev-' || e.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM order_status_history h
      WHERE h.order_id = e.order_id
        AND h.created_at = e.at
        AND h.to_status = e.to_status
    );
  `);
}

function backfillPayments(db: Database.Database) {
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'payments'")
    .get() as { name: string } | undefined;
  if (!tables) return;
  const done = db.prepare("SELECT id FROM _migrations WHERE id = '0007_payments.backfill'").get() as
    | { id: string }
    | undefined;
  if (done) return;
  db.exec(`
    INSERT INTO payments (
      id, order_id, amount, commission, status, provider_reference, created_at, updated_at
    )
    SELECT
      'pay-bf-' || o.id,
      o.id,
      o.total,
      o.commission,
      CASE o.payment_status
        WHEN 'captured' THEN 'captured'
        WHEN 'voided' THEN 'voided'
        ELSE 'authorized'
      END,
      'sim-backfill-' || o.id,
      o.created_at,
      COALESCE(o.updated_at, o.created_at)
    FROM orders o
    WHERE NOT EXISTS (SELECT 1 FROM payments p WHERE p.order_id = o.id);
  `);
  db.prepare("INSERT INTO _migrations (id, applied_at) VALUES (?, ?)").run(
    "0007_payments.backfill",
    new Date().toISOString(),
  );
}

function backfillCategories(db: Database.Database) {
  const cats = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'service_categories'")
    .get() as { name: string } | undefined;
  if (!cats) return;
  addColumn(db, "provider_profiles", "category_id", "category_id TEXT");
  addColumn(db, "service_packages", "category_id", "category_id TEXT");
  addColumn(db, "providers", "category_id", "category_id TEXT");
  db.exec(`
    UPDATE provider_profiles SET category_id = 'camasir' WHERE category_id IS NULL;
    UPDATE service_packages SET category_id = 'camasir' WHERE category_id IS NULL;
    UPDATE providers SET category_id = 'camasir' WHERE category_id IS NULL;
  `);
}

function ensureColumns(db: Database.Database) {
  addColumn(db, "orders", "pickup_code", "pickup_code TEXT");
  addColumn(db, "orders", "code_attempts", "code_attempts INTEGER NOT NULL DEFAULT 0");
  addColumn(db, "orders", "paid_at", "paid_at TEXT");
  addColumn(db, "orders", "payment_status", "payment_status TEXT NOT NULL DEFAULT 'authorized'");
  addColumn(db, "orders", "user_id", "user_id TEXT");
  if (!migrationApplied(db, "0017_order_size_model.sql")) {
    addColumn(db, "orders", "price_per_kg_snapshot", "price_per_kg_snapshot REAL");
    addColumn(db, "orders", "estimated_weight", "estimated_weight REAL");
    addColumn(db, "orders", "actual_weight", "actual_weight REAL");
    addColumn(db, "orders", "estimated_price", "estimated_price INTEGER");
    addColumn(db, "orders", "final_price", "final_price INTEGER");
  }
  addColumn(db, "orders", "delivery_mode", "delivery_mode TEXT");
  addColumn(db, "orders", "scheduled_window_start", "scheduled_window_start TEXT");
  addColumn(db, "orders", "scheduled_window_end", "scheduled_window_end TEXT");
  addColumn(db, "orders", "lifecycle", "lifecycle TEXT");
  addColumn(db, "order_photos", "kind", "kind TEXT NOT NULL DEFAULT 'dropoff'");
  addColumn(db, "users", "role", "role TEXT NOT NULL DEFAULT 'customer'");
  addColumn(db, "users", "full_name", "full_name TEXT NOT NULL DEFAULT ''");
  addColumn(db, "users", "avatar_url", "avatar_url TEXT");
  addColumn(db, "otp_codes", "consumed_at", "consumed_at TEXT");
  db.exec(`
    UPDATE users SET full_name = name WHERE (full_name = '' OR full_name IS NULL) AND name != '';
    UPDATE orders SET payment_status = 'captured'
      WHERE status = 'teslim_edildi' AND payment_status = 'authorized';
    UPDATE orders SET payment_status = 'voided'
      WHERE status = 'iptal' AND payment_status = 'authorized';
    UPDATE orders SET paid_at = updated_at
      WHERE payment_status = 'captured' AND paid_at IS NULL;
    UPDATE orders SET delivery_mode = CASE drop_method
      WHEN 'kapi' THEN 'door'
      ELSE 'point'
    END WHERE delivery_mode IS NULL;
    UPDATE orders SET scheduled_window_start = slot
      WHERE scheduled_window_start IS NULL;
    UPDATE orders SET lifecycle = CASE status
      WHEN 'onay_bekliyor' THEN 'pending'
      WHEN 'teslim_alindi' THEN 'accepted'
      WHEN 'yikaniyor' THEN 'washing'
      WHEN 'utuleniyor' THEN 'ironing'
      WHEN 'hazir' THEN 'ready'
      WHEN 'teslim_edildi' THEN 'completed'
      WHEN 'iptal' THEN 'cancelled'
      ELSE lifecycle
    END WHERE lifecycle IS NULL;
    CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(user_id);
  `);
  ensureOrderSizeModel(db);
  ensureCapacityCalendar(db);
  ensureAppointmentsP11(db);
  ensureHandoffSchema(db);
  backfillHistory(db);
  backfillPayments(db);
  backfillCategories(db);
  addColumn(db, "service_categories", "icon", "icon TEXT");
  addColumn(db, "service_categories", "is_active", "is_active INTEGER NOT NULL DEFAULT 1");
  addColumn(db, "service_categories", "blurb", "blurb TEXT");
  addColumn(db, "service_categories", "sort_order", "sort_order INTEGER NOT NULL DEFAULT 0");
  addColumn(db, "users", "preferred_category_ids", "preferred_category_ids TEXT");
  addColumn(db, "users", "preferred_intent", "preferred_intent TEXT");
  addColumn(db, "users", "onboarding_completed_at", "onboarding_completed_at TEXT");
  addColumn(db, "users", "home_lat", "home_lat REAL");
  addColumn(db, "users", "home_lng", "home_lng REAL");
  addColumn(db, "users", "home_neighborhood", "home_neighborhood TEXT");
  db.exec(`
    UPDATE service_categories SET icon = 'laundry' WHERE id = 'camasir' AND (icon IS NULL OR icon = '');
    UPDATE service_categories SET is_active = 1 WHERE is_active IS NULL;
    UPDATE service_categories SET
      name = 'Çamaşır Yıkama',
      blurb = 'Yıka, katla, kapıda bırak',
      sort_order = 1,
      is_active = 1
    WHERE id = 'camasir';
    DELETE FROM service_categories WHERE id != 'camasir';
    UPDATE provider_profiles SET category_id = 'camasir' WHERE category_id IS NULL OR category_id != 'camasir';
    UPDATE service_packages SET category_id = 'camasir' WHERE category_id IS NULL OR category_id != 'camasir';
    UPDATE providers SET category_id = 'camasir' WHERE category_id IS NULL OR category_id != 'camasir';
  `);
  for (const name of [
    "provider_products",
    "provider_services",
    "provider_repairs",
    "provider_tech",
    "provider_couriers",
    "provider_gardens",
    "provider_cargos",
    "provider_prints",
    "provider_preserves",
    "provider_carpets",
    "provider_lessons",
    "provider_talks",
    "provider_graves",
  ]) {
    db.exec(`DROP TABLE IF EXISTS ${name}`);
  }
  /* 0010_washes / araba kategorisi kaldırıldı (v0.3 çamaşır-only) */
  db.exec(`DROP TABLE IF EXISTS provider_washes`);
  db.exec(`DROP TABLE IF EXISTS provider_drop_points`);
  db.exec(`DROP TABLE IF EXISTS drop_points`);
  addColumn(db, "orders", "product_id", "product_id TEXT");
  addColumn(db, "orders", "product_name", "product_name TEXT");
  addColumn(db, "orders", "guest_count", "guest_count INTEGER");
  addColumn(db, "orders", "allergy_note", "allergy_note TEXT");
  addColumn(db, "orders", "fulfillment_type", "fulfillment_type TEXT NOT NULL DEFAULT 'dropoff'");
  addColumn(db, "orders", "visit_district", "visit_district TEXT");
  addColumn(db, "orders", "visit_neighborhood", "visit_neighborhood TEXT");
  addColumn(db, "orders", "visit_address", "visit_address TEXT");
  addColumn(db, "orders", "address_share_consent", "address_share_consent INTEGER NOT NULL DEFAULT 0");
  addColumn(db, "orders", "dispute_window_hours", "dispute_window_hours INTEGER");
  addColumn(db, "orders", "cancel_free_hours", "cancel_free_hours INTEGER");
  addColumn(db, "reviews", "quality", "quality INTEGER");
  addColumn(db, "reviews", "timeliness", "timeliness INTEGER");
  addColumn(db, "reviews", "communication", "communication INTEGER");
  addColumn(db, "reviews", "would_repeat", "would_repeat INTEGER");
  db.exec(`
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
      date TEXT NOT NULL,
      window_start TEXT NOT NULL,
      window_end TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_appointments_order ON appointments(order_id);
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS wallets (
      user_id TEXT PRIMARY KEY REFERENCES users(id),
      balance INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS wallet_ledger (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      amount INTEGER NOT NULL,
      kind TEXT NOT NULL,
      method TEXT,
      order_id TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_wallet_ledger_user ON wallet_ledger(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_wallet_ledger_order ON wallet_ledger(order_id);
  `);
  backfillCapturedEarnings(db);
  remapRetiredCategoryIds(db);
}

function backfillCapturedEarnings(db: Database.Database) {
  const hasPay = db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'payments'`).get();
  const hasLed = db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'wallet_ledger'`).get();
  const hasOrders = db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'orders'`).get();
  if (!hasPay || !hasLed || !hasOrders) return;
  const rows = db
    .prepare(
      `SELECT p.order_id AS orderId, p.amount AS amount, p.commission AS commission, o.provider_id AS providerId
       FROM payments p
       JOIN orders o ON o.id = p.order_id
       WHERE p.status = 'captured'`,
    )
    .all() as { orderId: string; amount: number; commission: number; providerId: string }[];
  const at = new Date().toISOString();
  const hasEarn = db.prepare(`SELECT id FROM wallet_ledger WHERE order_id = ? AND kind = 'earn' LIMIT 1`);
  const wallet = db.prepare(`SELECT user_id FROM wallets WHERE user_id = ?`);
  const insWallet = db.prepare(`INSERT INTO wallets (user_id, balance, updated_at) VALUES (?, 0, ?)`);
  const add = db.prepare(`UPDATE wallets SET balance = balance + ?, updated_at = ? WHERE user_id = ?`);
  const led = db.prepare(
    `INSERT INTO wallet_ledger (id, user_id, amount, kind, method, order_id, created_at)
     VALUES (?, ?, ?, 'earn', NULL, ?, ?)`,
  );
  for (const row of rows) {
    if (hasEarn.get(row.orderId)) continue;
    const net = Math.max(0, row.amount - row.commission);
    if (net <= 0 || !row.providerId) continue;
    const user = db.prepare(`SELECT id FROM users WHERE id = ?`).get(row.providerId);
    if (!user) continue;
    if (!wallet.get(row.providerId)) insWallet.run(row.providerId, at);
    add.run(net, at, row.providerId);
    led.run(`wl-bf-${row.orderId}`.slice(0, 24), row.providerId, net, row.orderId, at);
  }
}

function remapRetiredCategoryIds(db: Database.Database) {
  const hasUsers = db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'`)
    .get();
  if (!hasUsers) return;
  const rows = db
    .prepare(
      `SELECT id, preferred_category_ids FROM users
       WHERE preferred_category_ids IS NOT NULL AND preferred_category_ids != ''`,
    )
    .all() as { id: string; preferred_category_ids: string }[];
  const upd = db.prepare(`UPDATE users SET preferred_category_ids = ? WHERE id = ?`);
  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.preferred_category_ids) as unknown;
      if (!Array.isArray(parsed)) continue;
      const next: string[] = [];
      const seen = new Set<string>();
      for (const raw of parsed) {
        if (raw !== "camasir" || seen.has(raw)) continue;
        seen.add(raw);
        next.push(raw);
      }
      const json = JSON.stringify(next);
      if (json !== row.preferred_category_ids) upd.run(json, row.id);
    } catch {
      /* bozuk JSON’u atla */
    }
  }
  const hasProfiles = db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'provider_profiles'`)
    .get();
  if (hasProfiles) {
    db.exec(`UPDATE provider_profiles SET category_id = 'camasir' WHERE category_id IS NULL OR category_id != 'camasir'`);
  }
}

export function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `);
  const dir = path.join(process.cwd(), "db", "migrations");
  const files = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()
    : [];
  const applied = new Set(
    (db.prepare("SELECT id FROM _migrations").all() as { id: string }[]).map((r) => r.id),
  );
  const insert = db.prepare("INSERT INTO _migrations (id, applied_at) VALUES (?, ?)");
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    db.exec(sql);
    insert.run(file, new Date().toISOString());
  }
  ensureColumns(db);
}

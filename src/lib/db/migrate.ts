import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";

function addColumn(db: Database.Database, table: string, name: string, ddl: string) {
  const cols = new Set(
    (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name),
  );
  if (!cols.has(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
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

function ensureColumns(db: Database.Database) {
  addColumn(db, "orders", "pickup_code", "pickup_code TEXT");
  addColumn(db, "orders", "code_attempts", "code_attempts INTEGER NOT NULL DEFAULT 0");
  addColumn(db, "orders", "paid_at", "paid_at TEXT");
  addColumn(db, "orders", "payment_status", "payment_status TEXT NOT NULL DEFAULT 'authorized'");
  addColumn(db, "orders", "user_id", "user_id TEXT");
  addColumn(db, "orders", "price_per_kg_snapshot", "price_per_kg_snapshot REAL");
  addColumn(db, "orders", "estimated_weight", "estimated_weight REAL");
  addColumn(db, "orders", "actual_weight", "actual_weight REAL");
  addColumn(db, "orders", "estimated_price", "estimated_price INTEGER");
  addColumn(db, "orders", "final_price", "final_price INTEGER");
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
    UPDATE orders SET estimated_weight = pieces WHERE estimated_weight IS NULL;
    UPDATE orders SET estimated_price = total WHERE estimated_price IS NULL;
    UPDATE orders SET price_per_kg_snapshot = CASE
      WHEN pieces > 0 THEN CAST(total AS REAL) / pieces
      ELSE 0
    END WHERE price_per_kg_snapshot IS NULL;
    UPDATE orders SET delivery_mode = CASE drop_method
      WHEN 'kapi' THEN 'door'
      ELSE 'point'
    END WHERE delivery_mode IS NULL;
    UPDATE orders SET scheduled_window_start = slot
      WHERE scheduled_window_start IS NULL;
    UPDATE orders SET final_price = total
      WHERE status = 'teslim_edildi' AND final_price IS NULL;
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
  backfillHistory(db);
  backfillPayments(db);
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

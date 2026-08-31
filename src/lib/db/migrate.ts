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
      blurb = 'Yıka, katla, kapıda veya noktada bırak',
      sort_order = 1
    WHERE id = 'camasir';
    UPDATE service_categories SET
      name = 'Davet İkramlık',
      icon = 'feast',
      blurb = 'Kısır, pasta, kurabiye — evden sofraya',
      is_active = 1,
      sort_order = 2
    WHERE id = 'davet';
    INSERT OR IGNORE INTO service_categories (id, name, fulfillment_mode, pricing_model)
    VALUES ('dikis', 'Dikiş & Tadilat', 'delivery', 'fixed');
    UPDATE service_categories SET
      name = 'Dikiş & Tadilat',
      icon = 'needle',
      blurb = 'Kıyafet tadilatı, tamir, özel dikim, ev tekstili',
      is_active = 1,
      sort_order = 3
    WHERE id = 'dikis';
    INSERT OR IGNORE INTO service_categories (id, name, fulfillment_mode, pricing_model)
    VALUES ('tamir', 'Tamir', 'delivery', 'fixed');
    UPDATE service_categories SET
      name = 'Tamir',
      icon = 'wrench',
      blurb = 'Elektronik, ev eşyası, mobilya — atölyede yap, teslim al',
      is_active = 1,
      sort_order = 4
    WHERE id = 'tamir';
    INSERT OR IGNORE INTO service_categories (id, name, fulfillment_mode, pricing_model)
    VALUES ('teknoloji', 'Teknoloji & Kurulum', 'delivery', 'fixed');
    UPDATE service_categories SET
      name = 'Teknoloji & Kurulum',
      icon = 'chip',
      blurb = 'Format, kurulum, veri — atölyede veya yerinde',
      is_active = 1,
      sort_order = 5
    WHERE id = 'teknoloji';
    INSERT OR IGNORE INTO service_categories (id, name, fulfillment_mode, pricing_model)
    VALUES ('araba', 'Araba Yıkama', 'delivery', 'fixed');
    UPDATE service_categories SET
      name = 'Araba Yıkama',
      icon = 'car',
      blurb = 'Dış yıkama, iç temizlik — getir, al',
      is_active = 1,
      sort_order = 6
    WHERE id = 'araba';
    INSERT OR IGNORE INTO service_categories (id, name, fulfillment_mode, pricing_model)
    VALUES ('kurye', 'Yakın Mesafe Kurye', 'delivery', 'fixed');
    UPDATE service_categories SET
      name = 'Yakın Mesafe Kurye',
      icon = 'scooter',
      blurb = 'Evrak, küçük paket — yakında kapıdan kapıya',
      is_active = 1,
      sort_order = 7
    WHERE id = 'kurye';
    INSERT OR IGNORE INTO service_categories (id, name, fulfillment_mode, pricing_model)
    VALUES ('bahce', 'Bahçe & Bitki', 'delivery', 'fixed');
    UPDATE service_categories SET
      name = 'Bahçe & Bitki',
      icon = 'seedling',
      blurb = 'Çim, budama, saksı — bahçede yerinde',
      is_active = 1,
      sort_order = 8
    WHERE id = 'bahce';
    INSERT OR IGNORE INTO service_categories (id, name, fulfillment_mode, pricing_model)
    VALUES ('kargo', 'Kargo & Paket', 'delivery', 'fixed');
    UPDATE service_categories SET
      name = 'Kargo & Paket',
      icon = 'package',
      blurb = 'Şubeden al, noktaya bırak — yakında',
      is_active = 1,
      sort_order = 9
    WHERE id = 'kargo';
    INSERT OR IGNORE INTO service_categories (id, name, fulfillment_mode, pricing_model)
    VALUES ('cikti', 'Evde Çıktı Alma', 'delivery', 'fixed');
    UPDATE service_categories SET
      name = 'Evde Çıktı Alma',
      icon = 'printer',
      blurb = 'A4 çıktı — yakında al',
      is_active = 1,
      sort_order = 10
    WHERE id = 'cikti';
    INSERT OR IGNORE INTO service_categories (id, name, fulfillment_mode, pricing_model)
    VALUES ('kislik', 'Kışlık & Dondurucu Hazırlığı', 'delivery', 'fixed');
    UPDATE service_categories SET
      name = 'Kışlık & Dondurucu Hazırlığı',
      icon = 'jar',
      blurb = 'Salça, tarhana, dondurucu — yakında al',
      is_active = 1,
      sort_order = 11
    WHERE id = 'kislik';
    INSERT OR IGNORE INTO service_categories (id, name, fulfillment_mode, pricing_model)
    VALUES ('hali', 'Halı Yıkama', 'delivery', 'fixed');
    UPDATE service_categories SET
      name = 'Halı Yıkama',
      icon = 'soap',
      blurb = 'Halı, kilim — yakında al-ver',
      is_active = 1,
      sort_order = 12
    WHERE id = 'hali';
    INSERT OR IGNORE INTO service_categories (id, name, fulfillment_mode, pricing_model)
    VALUES ('odev', 'İlkokul / Ortaokul Ödev Eşliği', 'delivery', 'fixed');
    UPDATE service_categories SET
      name = 'İlkokul / Ortaokul Ödev Eşliği',
      icon = 'book',
      blurb = 'Ödev, okuma — evde, ortak alanda veya online',
      is_active = 1,
      sort_order = 13
    WHERE id = 'odev';
    INSERT OR IGNORE INTO service_categories (id, name, fulfillment_mode, pricing_model)
    VALUES ('dil', 'Yabancı Dil Pratiği', 'delivery', 'fixed');
    UPDATE service_categories SET
      name = 'Yabancı Dil Pratiği',
      icon = 'globe',
      blurb = 'Konuşma, sohbet — evde, ortak alanda veya online',
      is_active = 1,
      sort_order = 14
    WHERE id = 'dil';
    INSERT OR IGNORE INTO service_categories (id, name, fulfillment_mode, pricing_model)
    VALUES ('mezar', 'Mezar Bakımı & Çiçeklendirme', 'delivery', 'fixed');
    UPDATE service_categories SET
      name = 'Mezar Bakımı & Çiçeklendirme',
      icon = 'headstone',
      blurb = 'Mezarlıkta temizlik, çiçek — eve kimse girmez',
      is_active = 1,
      sort_order = 15
    WHERE id = 'mezar';
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS provider_services (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL REFERENCES provider_profiles(user_id),
      name TEXT NOT NULL,
      description TEXT,
      subcategory TEXT NOT NULL DEFAULT 'diger',
      photo_url TEXT,
      price INTEGER NOT NULL,
      price_unit TEXT NOT NULL DEFAULT 'adet',
      min_order INTEGER NOT NULL DEFAULT 1,
      lead_days INTEGER,
      max_per_week INTEGER,
      delivery_adres INTEGER NOT NULL DEFAULT 1,
      delivery_nokta INTEGER NOT NULL DEFAULT 1,
      delivery_yakin INTEGER NOT NULL DEFAULT 0,
      work_radius_km INTEGER,
      notes TEXT,
      material TEXT NOT NULL DEFAULT 'customer',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_services_provider ON provider_services(provider_id);
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS provider_repairs (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL REFERENCES provider_profiles(user_id),
      name TEXT NOT NULL,
      description TEXT,
      kind TEXT NOT NULL DEFAULT 'diger',
      item TEXT,
      job TEXT NOT NULL DEFAULT 'onarim',
      photo_url TEXT,
      price INTEGER NOT NULL DEFAULT 0,
      price_type TEXT NOT NULL DEFAULT 'sabit',
      price_unit TEXT NOT NULL DEFAULT 'adet',
      parts TEXT NOT NULL DEFAULT 'either',
      lead_days INTEGER,
      max_per_week INTEGER,
      delivery_adres INTEGER NOT NULL DEFAULT 1,
      delivery_nokta INTEGER NOT NULL DEFAULT 1,
      delivery_yakin INTEGER NOT NULL DEFAULT 0,
      work_radius_km INTEGER,
      inspect_required INTEGER NOT NULL DEFAULT 0,
      quote_from TEXT NOT NULL DEFAULT 'seen',
      warranty_days INTEGER,
      notes TEXT,
      work_hours TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_repairs_provider ON provider_repairs(provider_id);
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS provider_tech (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL REFERENCES provider_profiles(user_id),
      name TEXT NOT NULL,
      description TEXT,
      kind TEXT NOT NULL DEFAULT 'diger',
      item TEXT,
      job TEXT NOT NULL DEFAULT 'kurulum',
      photo_url TEXT,
      price INTEGER NOT NULL DEFAULT 0,
      price_type TEXT NOT NULL DEFAULT 'sabit',
      price_unit TEXT NOT NULL DEFAULT 'cihaz',
      materials TEXT NOT NULL DEFAULT 'none',
      lead_hours INTEGER,
      lead_days INTEGER,
      max_per_week INTEGER,
      delivery_adres INTEGER NOT NULL DEFAULT 1,
      delivery_nokta INTEGER NOT NULL DEFAULT 1,
      delivery_yakin INTEGER NOT NULL DEFAULT 0,
      delivery_yerinde INTEGER NOT NULL DEFAULT 0,
      inspect_required INTEGER NOT NULL DEFAULT 0,
      quote_from_photo INTEGER NOT NULL DEFAULT 0,
      platform TEXT,
      warranty_days INTEGER,
      notes TEXT,
      work_hours TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_tech_provider ON provider_tech(provider_id);
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS provider_washes (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL REFERENCES provider_profiles(user_id),
      name TEXT NOT NULL,
      description TEXT,
      job TEXT NOT NULL DEFAULT 'dis',
      vehicle TEXT NOT NULL DEFAULT 'otomobil',
      photo_url TEXT,
      price INTEGER NOT NULL DEFAULT 0,
      include_dis INTEGER NOT NULL DEFAULT 0,
      include_supurme INTEGER NOT NULL DEFAULT 0,
      include_cam INTEGER NOT NULL DEFAULT 0,
      include_torpido INTEGER NOT NULL DEFAULT 0,
      include_jant INTEGER NOT NULL DEFAULT 0,
      include_kurulama INTEGER NOT NULL DEFAULT 0,
      duration_min INTEGER,
      max_per_day INTEGER,
      booking TEXT NOT NULL DEFAULT 'musait',
      location TEXT,
      work_hours TEXT,
      materials TEXT NOT NULL DEFAULT 'provider',
      notes TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_washes_provider ON provider_washes(provider_id);
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS provider_couriers (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL REFERENCES provider_profiles(user_id),
      name TEXT NOT NULL,
      description TEXT,
      photo_url TEXT,
      transport_yaya INTEGER NOT NULL DEFAULT 0,
      transport_bisiklet INTEGER NOT NULL DEFAULT 0,
      transport_ebike INTEGER NOT NULL DEFAULT 0,
      transport_motor INTEGER NOT NULL DEFAULT 0,
      size_kucuk INTEGER NOT NULL DEFAULT 0,
      size_orta INTEGER NOT NULL DEFAULT 0,
      size_buyuk INTEGER NOT NULL DEFAULT 0,
      max_km INTEGER NOT NULL DEFAULT 5,
      price INTEGER NOT NULL DEFAULT 0,
      price_type TEXT NOT NULL DEFAULT 'sabit',
      duration_min INTEGER,
      route_adres_adres INTEGER NOT NULL DEFAULT 1,
      route_nokta_adres INTEGER NOT NULL DEFAULT 0,
      route_nokta_nokta INTEGER NOT NULL DEFAULT 0,
      avail TEXT NOT NULL DEFAULT 'hemen',
      work_hours TEXT,
      region TEXT,
      carry_evrak INTEGER NOT NULL DEFAULT 0,
      carry_paket INTEGER NOT NULL DEFAULT 0,
      carry_kiyafet INTEGER NOT NULL DEFAULT 0,
      carry_anahtar INTEGER NOT NULL DEFAULT 0,
      carry_hediye INTEGER NOT NULL DEFAULT 0,
      carry_kisisel INTEGER NOT NULL DEFAULT 0,
      carry_diger INTEGER NOT NULL DEFAULT 0,
      carry_other TEXT,
      refuse TEXT,
      confirm_kod INTEGER NOT NULL DEFAULT 1,
      confirm_app INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_couriers_provider ON provider_couriers(provider_id);
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS provider_gardens (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL REFERENCES provider_profiles(user_id),
      name TEXT NOT NULL,
      description TEXT,
      photo_url TEXT,
      job_cim INTEGER NOT NULL DEFAULT 0,
      job_budama INTEGER NOT NULL DEFAULT 0,
      job_ot INTEGER NOT NULL DEFAULT 0,
      job_yaprak INTEGER NOT NULL DEFAULT 0,
      job_dikim INTEGER NOT NULL DEFAULT 0,
      job_saksi INTEGER NOT NULL DEFAULT 0,
      job_tasima INTEGER NOT NULL DEFAULT 0,
      job_sulama INTEGER NOT NULL DEFAULT 0,
      job_duzen INTEGER NOT NULL DEFAULT 0,
      job_diger INTEGER NOT NULL DEFAULT 0,
      area_kucuk INTEGER NOT NULL DEFAULT 0,
      area_orta INTEGER NOT NULL DEFAULT 0,
      area_buyuk INTEGER NOT NULL DEFAULT 0,
      price INTEGER NOT NULL DEFAULT 0,
      price_type TEXT NOT NULL DEFAULT 'sabit',
      duration_min INTEGER,
      equipment TEXT NOT NULL DEFAULT 'provider',
      location TEXT,
      max_km INTEGER NOT NULL DEFAULT 5,
      avail TEXT NOT NULL DEFAULT 'randevu',
      work_hours TEXT,
      can_do TEXT,
      cannot_do TEXT,
      notes TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_gardens_provider ON provider_gardens(provider_id);
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS provider_cargos (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL REFERENCES provider_profiles(user_id),
      name TEXT NOT NULL,
      photo_url TEXT,
      job_sube_al INTEGER NOT NULL DEFAULT 0,
      job_sube_birak INTEGER NOT NULL DEFAULT 0,
      job_nokta_nokta INTEGER NOT NULL DEFAULT 0,
      job_al_nokta INTEGER NOT NULL DEFAULT 0,
      job_teslim_sube INTEGER NOT NULL DEFAULT 0,
      size_kucuk INTEGER NOT NULL DEFAULT 0,
      size_orta INTEGER NOT NULL DEFAULT 0,
      size_buyuk INTEGER NOT NULL DEFAULT 0,
      max_km INTEGER NOT NULL DEFAULT 5,
      branches TEXT,
      points TEXT,
      price INTEGER NOT NULL DEFAULT 0,
      price_type TEXT NOT NULL DEFAULT 'sabit',
      duration_min INTEGER,
      avail TEXT NOT NULL DEFAULT 'hemen',
      work_hours TEXT,
      pick_sube INTEGER NOT NULL DEFAULT 0,
      pick_adres INTEGER NOT NULL DEFAULT 0,
      pick_nokta INTEGER NOT NULL DEFAULT 0,
      drop_sube INTEGER NOT NULL DEFAULT 0,
      drop_adres INTEGER NOT NULL DEFAULT 0,
      drop_nokta INTEGER NOT NULL DEFAULT 0,
      confirm_kod INTEGER NOT NULL DEFAULT 1,
      confirm_app INTEGER NOT NULL DEFAULT 0,
      refuse TEXT,
      notes TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_cargos_provider ON provider_cargos(provider_id);
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS provider_prints (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL REFERENCES provider_profiles(user_id),
      name TEXT NOT NULL,
      photo_url TEXT,
      color_bw INTEGER NOT NULL DEFAULT 0,
      color_renkli INTEGER NOT NULL DEFAULT 0,
      paper_a4 INTEGER NOT NULL DEFAULT 1,
      side_tek INTEGER NOT NULL DEFAULT 0,
      side_cift INTEGER NOT NULL DEFAULT 0,
      file_pdf INTEGER NOT NULL DEFAULT 0,
      file_word INTEGER NOT NULL DEFAULT 0,
      file_image INTEGER NOT NULL DEFAULT 0,
      file_other INTEGER NOT NULL DEFAULT 0,
      price INTEGER NOT NULL DEFAULT 0,
      min_pages INTEGER NOT NULL DEFAULT 1,
      duration_min INTEGER,
      send_app INTEGER NOT NULL DEFAULT 0,
      send_email INTEGER NOT NULL DEFAULT 0,
      send_other INTEGER NOT NULL DEFAULT 0,
      pick_adres INTEGER NOT NULL DEFAULT 0,
      pick_nokta INTEGER NOT NULL DEFAULT 0,
      avail TEXT NOT NULL DEFAULT 'hemen',
      work_hours TEXT,
      notes TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_prints_provider ON provider_prints(provider_id);
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS provider_preserves (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL REFERENCES provider_profiles(user_id),
      name TEXT NOT NULL,
      description TEXT,
      photo_url TEXT,
      kind_salca INTEGER NOT NULL DEFAULT 0,
      kind_tarhana INTEGER NOT NULL DEFAULT 0,
      kind_eriste INTEGER NOT NULL DEFAULT 0,
      kind_manti INTEGER NOT NULL DEFAULT 0,
      kind_sarma INTEGER NOT NULL DEFAULT 0,
      kind_dondurucu INTEGER NOT NULL DEFAULT 0,
      kind_other INTEGER NOT NULL DEFAULT 0,
      portion TEXT,
      ingredients TEXT,
      material TEXT NOT NULL DEFAULT 'provider',
      price INTEGER NOT NULL DEFAULT 0,
      price_unit TEXT NOT NULL DEFAULT 'kg',
      min_order INTEGER NOT NULL DEFAULT 1,
      lead_days INTEGER,
      notice_days INTEGER,
      store_frozen INTEGER NOT NULL DEFAULT 0,
      store_fresh INTEGER NOT NULL DEFAULT 0,
      store_dried INTEGER NOT NULL DEFAULT 0,
      store_jarred INTEGER NOT NULL DEFAULT 0,
      pick_adres INTEGER NOT NULL DEFAULT 0,
      pick_nokta INTEGER NOT NULL DEFAULT 0,
      season TEXT,
      allergens TEXT,
      notes TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_preserves_provider ON provider_preserves(provider_id);
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS provider_carpets (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL REFERENCES provider_profiles(user_id),
      name TEXT NOT NULL,
      description TEXT,
      photo_url TEXT,
      kind_hali INTEGER NOT NULL DEFAULT 0,
      kind_kilim INTEGER NOT NULL DEFAULT 0,
      kind_yolluk INTEGER NOT NULL DEFAULT 0,
      kind_other INTEGER NOT NULL DEFAULT 0,
      size_kucuk INTEGER NOT NULL DEFAULT 0,
      size_orta INTEGER NOT NULL DEFAULT 0,
      size_buyuk INTEGER NOT NULL DEFAULT 0,
      size_xl INTEGER NOT NULL DEFAULT 0,
      min_order INTEGER NOT NULL DEFAULT 1,
      clean_genel INTEGER NOT NULL DEFAULT 0,
      clean_leke INTEGER NOT NULL DEFAULT 0,
      clean_koku INTEGER NOT NULL DEFAULT 0,
      clean_ozel INTEGER NOT NULL DEFAULT 0,
      price INTEGER NOT NULL DEFAULT 0,
      lead_days INTEGER,
      pick_adres INTEGER NOT NULL DEFAULT 0,
      pick_nokta INTEGER NOT NULL DEFAULT 0,
      ready_at TEXT,
      products TEXT,
      notice_days INTEGER,
      notes TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_carpets_provider ON provider_carpets(provider_id);
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS provider_lessons (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL REFERENCES provider_profiles(user_id),
      name TEXT NOT NULL,
      description TEXT,
      photo_url TEXT,
      kind_takip INTEGER NOT NULL DEFAULT 0,
      kind_okuma INTEGER NOT NULL DEFAULT 0,
      kind_eslik INTEGER NOT NULL DEFAULT 0,
      kind_tekrar INTEGER NOT NULL DEFAULT 0,
      kind_sinav INTEGER NOT NULL DEFAULT 0,
      kind_other INTEGER NOT NULL DEFAULT 0,
      level_ilkokul INTEGER NOT NULL DEFAULT 0,
      level_ortaokul INTEGER NOT NULL DEFAULT 0,
      level_lise INTEGER NOT NULL DEFAULT 0,
      sub_turkce INTEGER NOT NULL DEFAULT 0,
      sub_matematik INTEGER NOT NULL DEFAULT 0,
      sub_fen INTEGER NOT NULL DEFAULT 0,
      sub_sosyal INTEGER NOT NULL DEFAULT 0,
      sub_ingilizce INTEGER NOT NULL DEFAULT 0,
      sub_all INTEGER NOT NULL DEFAULT 0,
      sub_other INTEGER NOT NULL DEFAULT 0,
      subject_other TEXT,
      dur_30 INTEGER NOT NULL DEFAULT 0,
      dur_45 INTEGER NOT NULL DEFAULT 0,
      dur_60 INTEGER NOT NULL DEFAULT 0,
      dur_90 INTEGER NOT NULL DEFAULT 0,
      price INTEGER NOT NULL DEFAULT 0,
      place_ev INTEGER NOT NULL DEFAULT 0,
      place_ortak INTEGER NOT NULL DEFAULT 0,
      place_online INTEGER NOT NULL DEFAULT 0,
      weekly INTEGER NOT NULL DEFAULT 1,
      mat_student INTEGER NOT NULL DEFAULT 0,
      mat_provider INTEGER NOT NULL DEFAULT 0,
      mat_none INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_lessons_provider ON provider_lessons(provider_id);
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS provider_talks (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL REFERENCES provider_profiles(user_id),
      name TEXT NOT NULL,
      description TEXT,
      photo_url TEXT,
      lang_en INTEGER NOT NULL DEFAULT 0,
      lang_de INTEGER NOT NULL DEFAULT 0,
      lang_es INTEGER NOT NULL DEFAULT 0,
      lang_fr INTEGER NOT NULL DEFAULT 0,
      lang_it INTEGER NOT NULL DEFAULT 0,
      lang_ar INTEGER NOT NULL DEFAULT 0,
      lang_other INTEGER NOT NULL DEFAULT 0,
      lang_other_text TEXT,
      kind_speaking INTEGER NOT NULL DEFAULT 0,
      kind_chat INTEGER NOT NULL DEFAULT 0,
      kind_beginner INTEGER NOT NULL DEFAULT 0,
      kind_vocab INTEGER NOT NULL DEFAULT 0,
      kind_pronun INTEGER NOT NULL DEFAULT 0,
      kind_grammar INTEGER NOT NULL DEFAULT 0,
      kind_exam INTEGER NOT NULL DEFAULT 0,
      level_a1 INTEGER NOT NULL DEFAULT 0,
      level_a2 INTEGER NOT NULL DEFAULT 0,
      level_b INTEGER NOT NULL DEFAULT 0,
      dur_30 INTEGER NOT NULL DEFAULT 0,
      dur_45 INTEGER NOT NULL DEFAULT 0,
      dur_60 INTEGER NOT NULL DEFAULT 0,
      price INTEGER NOT NULL DEFAULT 0,
      place_ev INTEGER NOT NULL DEFAULT 0,
      place_ortak INTEGER NOT NULL DEFAULT 0,
      place_online INTEGER NOT NULL DEFAULT 0,
      mat_provider INTEGER NOT NULL DEFAULT 0,
      mat_student INTEGER NOT NULL DEFAULT 0,
      mat_together INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_talks_provider ON provider_talks(provider_id);
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS provider_graves (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL REFERENCES provider_profiles(user_id),
      name TEXT NOT NULL,
      description TEXT,
      photo_url TEXT,
      kind_temizlik INTEGER NOT NULL DEFAULT 0,
      kind_cicek INTEGER NOT NULL DEFAULT 0,
      kind_sulama INTEGER NOT NULL DEFAULT 0,
      kind_ot INTEGER NOT NULL DEFAULT 0,
      kind_cevre INTEGER NOT NULL DEFAULT 0,
      kind_ziyaret INTEGER NOT NULL DEFAULT 0,
      kind_other INTEGER NOT NULL DEFAULT 0,
      cemetery TEXT,
      radius_km INTEGER NOT NULL DEFAULT 10,
      price INTEGER NOT NULL DEFAULT 0,
      price_visit INTEGER NOT NULL DEFAULT 0,
      price_job INTEGER NOT NULL DEFAULT 0,
      price_monthly INTEGER NOT NULL DEFAULT 0,
      price_other INTEGER NOT NULL DEFAULT 0,
      flower_customer INTEGER NOT NULL DEFAULT 0,
      flower_provider INTEGER NOT NULL DEFAULT 0,
      flower_together INTEGER NOT NULL DEFAULT 0,
      fee_included INTEGER NOT NULL DEFAULT 0,
      fee_extra INTEGER NOT NULL DEFAULT 0,
      duration_min INTEGER,
      photo_before_after INTEGER NOT NULL DEFAULT 0,
      photo_after INTEGER NOT NULL DEFAULT 0,
      photo_none INTEGER NOT NULL DEFAULT 0,
      avail_once INTEGER NOT NULL DEFAULT 0,
      avail_weekly INTEGER NOT NULL DEFAULT 0,
      avail_monthly INTEGER NOT NULL DEFAULT 0,
      avail_days INTEGER NOT NULL DEFAULT 0,
      work_hours TEXT,
      notes TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_graves_provider ON provider_graves(provider_id);
  `);
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
  addColumn(db, "provider_repairs", "fulfillment_type", "fulfillment_type TEXT NOT NULL DEFAULT 'dropoff'");
  addColumn(db, "provider_profiles", "kyc_status", "kyc_status TEXT");
  addColumn(db, "provider_profiles", "criminal_record_declared", "criminal_record_declared INTEGER NOT NULL DEFAULT 0");
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
  addColumn(db, "provider_products", "photo_url", "photo_url TEXT");
  addColumn(db, "provider_products", "description", "description TEXT");
  addColumn(db, "provider_products", "category", "category TEXT");
  addColumn(db, "provider_products", "price_unit", "price_unit TEXT NOT NULL DEFAULT 'kisi'");
  addColumn(db, "provider_products", "min_order", "min_order INTEGER NOT NULL DEFAULT 1");
  addColumn(db, "provider_products", "max_qty", "max_qty INTEGER");
  addColumn(db, "provider_products", "lead_hours", "lead_hours INTEGER");
  addColumn(db, "provider_products", "delivery", "delivery TEXT NOT NULL DEFAULT 'ikisi'");
  addColumn(db, "provider_products", "allergens", "allergens TEXT");
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

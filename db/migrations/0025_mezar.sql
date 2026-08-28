-- Mezar bakımı: Tip A. İş mezarlıkta. Eve girilmez.

INSERT OR IGNORE INTO service_categories (id, name, fulfillment_mode, pricing_model)
VALUES ('mezar', 'Mezar Bakımı & Çiçeklendirme', 'delivery', 'fixed');

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

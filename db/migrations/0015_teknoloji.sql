-- Teknoloji & Kurulum: Tip A teslim. Cihaz bırakılır / yerinde kurulum kapi olarak akar.

INSERT OR IGNORE INTO service_categories (id, name, fulfillment_mode, pricing_model)
VALUES ('teknoloji', 'Teknoloji & Kurulum', 'delivery', 'fixed');

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

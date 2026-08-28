-- Tamir: Tip A teslim. Veren evde/atölyede yapar; müşteri bırakır, alır.

INSERT OR IGNORE INTO service_categories (id, name, fulfillment_mode, pricing_model)
VALUES ('tamir', 'Tamir', 'delivery', 'fixed');

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

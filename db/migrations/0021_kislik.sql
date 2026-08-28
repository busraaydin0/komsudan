-- Kışlık & dondurucu: Tip A teslim. Evde hazırla, adresten / noktada al.

INSERT OR IGNORE INTO service_categories (id, name, fulfillment_mode, pricing_model)
VALUES ('kislik', 'Kışlık & Dondurucu Hazırlığı', 'delivery', 'fixed');

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

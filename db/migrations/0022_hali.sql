-- Halı yıkama: Tip A teslim. Yıka, adresten / noktada al-ver.

INSERT OR IGNORE INTO service_categories (id, name, fulfillment_mode, pricing_model)
VALUES ('hali', 'Halı Yıkama', 'delivery', 'fixed');

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

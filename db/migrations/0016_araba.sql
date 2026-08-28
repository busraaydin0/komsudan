-- Araba yıkama: Tip A teslim. Araç yıkanır, yerinde bırakılır / alınır.

INSERT OR IGNORE INTO service_categories (id, name, fulfillment_mode, pricing_model)
VALUES ('araba', 'Araba Yıkama', 'delivery', 'fixed');

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

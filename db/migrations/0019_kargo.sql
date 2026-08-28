-- Kargo & paket: Tip A teslim. Şubeden al, noktaya / adrese bırak.

INSERT OR IGNORE INTO service_categories (id, name, fulfillment_mode, pricing_model)
VALUES ('kargo', 'Kargo & Paket', 'delivery', 'fixed');

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

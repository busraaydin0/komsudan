-- Bahçe & bitki: Tip A teslim. İş bahçede / yerinde yapılır.

INSERT OR IGNORE INTO service_categories (id, name, fulfillment_mode, pricing_model)
VALUES ('bahce', 'Bahçe & Bitki', 'delivery', 'fixed');

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

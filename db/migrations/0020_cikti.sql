-- Evde çıktı alma: Tip A teslim. A4 bas, adresten / noktada al.

INSERT OR IGNORE INTO service_categories (id, name, fulfillment_mode, pricing_model)
VALUES ('cikti', 'Evde Çıktı Alma', 'delivery', 'fixed');

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

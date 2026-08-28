-- Ödev eşliği: Tip A. Verenin evinde, ortak alanda veya online. Eve girilmez.

INSERT OR IGNORE INTO service_categories (id, name, fulfillment_mode, pricing_model)
VALUES ('odev', 'İlkokul / Ortaokul Ödev Eşliği', 'delivery', 'fixed');

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

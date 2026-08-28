-- Yabancı dil pratiği: Tip A. Verenin evinde, ortak alanda veya online. Eve girilmez.

INSERT OR IGNORE INTO service_categories (id, name, fulfillment_mode, pricing_model)
VALUES ('dil', 'Yabancı Dil Pratiği', 'delivery', 'fixed');

CREATE TABLE IF NOT EXISTS provider_talks (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL REFERENCES provider_profiles(user_id),
  name TEXT NOT NULL,
  description TEXT,
  photo_url TEXT,
  lang_en INTEGER NOT NULL DEFAULT 0,
  lang_de INTEGER NOT NULL DEFAULT 0,
  lang_es INTEGER NOT NULL DEFAULT 0,
  lang_fr INTEGER NOT NULL DEFAULT 0,
  lang_it INTEGER NOT NULL DEFAULT 0,
  lang_ar INTEGER NOT NULL DEFAULT 0,
  lang_other INTEGER NOT NULL DEFAULT 0,
  lang_other_text TEXT,
  kind_speaking INTEGER NOT NULL DEFAULT 0,
  kind_chat INTEGER NOT NULL DEFAULT 0,
  kind_beginner INTEGER NOT NULL DEFAULT 0,
  kind_vocab INTEGER NOT NULL DEFAULT 0,
  kind_pronun INTEGER NOT NULL DEFAULT 0,
  kind_grammar INTEGER NOT NULL DEFAULT 0,
  kind_exam INTEGER NOT NULL DEFAULT 0,
  level_a1 INTEGER NOT NULL DEFAULT 0,
  level_a2 INTEGER NOT NULL DEFAULT 0,
  level_b INTEGER NOT NULL DEFAULT 0,
  dur_30 INTEGER NOT NULL DEFAULT 0,
  dur_45 INTEGER NOT NULL DEFAULT 0,
  dur_60 INTEGER NOT NULL DEFAULT 0,
  price INTEGER NOT NULL DEFAULT 0,
  place_ev INTEGER NOT NULL DEFAULT 0,
  place_ortak INTEGER NOT NULL DEFAULT 0,
  place_online INTEGER NOT NULL DEFAULT 0,
  mat_provider INTEGER NOT NULL DEFAULT 0,
  mat_student INTEGER NOT NULL DEFAULT 0,
  mat_together INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_talks_provider ON provider_talks(provider_id);

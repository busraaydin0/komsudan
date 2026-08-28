-- Faz 7: davet menüsü. Her aşçı kendi ürününü girer; fiyat kişi başı, sunucuda çarpılır.

CREATE TABLE IF NOT EXISTS provider_products (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL REFERENCES provider_profiles(user_id),
  name TEXT NOT NULL,
  price_per_person INTEGER NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_provider ON provider_products(provider_id);

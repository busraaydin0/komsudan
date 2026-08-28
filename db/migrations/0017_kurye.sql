-- Yakın mesafe kurye: Tip A teslim. Paket alınır, yakında bırakılır.

INSERT OR IGNORE INTO service_categories (id, name, fulfillment_mode, pricing_model)
VALUES ('kurye', 'Yakın Mesafe Kurye', 'delivery', 'fixed');

CREATE TABLE IF NOT EXISTS provider_couriers (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL REFERENCES provider_profiles(user_id),
  name TEXT NOT NULL,
  description TEXT,
  photo_url TEXT,
  transport_yaya INTEGER NOT NULL DEFAULT 0,
  transport_bisiklet INTEGER NOT NULL DEFAULT 0,
  transport_ebike INTEGER NOT NULL DEFAULT 0,
  transport_motor INTEGER NOT NULL DEFAULT 0,
  size_kucuk INTEGER NOT NULL DEFAULT 0,
  size_orta INTEGER NOT NULL DEFAULT 0,
  size_buyuk INTEGER NOT NULL DEFAULT 0,
  max_km INTEGER NOT NULL DEFAULT 5,
  price INTEGER NOT NULL DEFAULT 0,
  price_type TEXT NOT NULL DEFAULT 'sabit',
  duration_min INTEGER,
  route_adres_adres INTEGER NOT NULL DEFAULT 1,
  route_nokta_adres INTEGER NOT NULL DEFAULT 0,
  route_nokta_nokta INTEGER NOT NULL DEFAULT 0,
  avail TEXT NOT NULL DEFAULT 'hemen',
  work_hours TEXT,
  region TEXT,
  carry_evrak INTEGER NOT NULL DEFAULT 0,
  carry_paket INTEGER NOT NULL DEFAULT 0,
  carry_kiyafet INTEGER NOT NULL DEFAULT 0,
  carry_anahtar INTEGER NOT NULL DEFAULT 0,
  carry_hediye INTEGER NOT NULL DEFAULT 0,
  carry_kisisel INTEGER NOT NULL DEFAULT 0,
  carry_diger INTEGER NOT NULL DEFAULT 0,
  carry_other TEXT,
  refuse TEXT,
  confirm_kod INTEGER NOT NULL DEFAULT 1,
  confirm_app INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_couriers_provider ON provider_couriers(provider_id);

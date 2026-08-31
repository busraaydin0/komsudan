-- Faz 8: Tamir alt-tipi home_visit. Aynı sipariş tablosu.
-- Kolonlar ensureColumns ile eklenir (tekrar ALTER patlamasın).
-- Ayrı musluk kategorisi / provider_taps yok.

DELETE FROM service_categories WHERE id = 'musluk';
DROP TABLE IF EXISTS provider_taps;

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
  date TEXT NOT NULL,
  window_start TEXT NOT NULL,
  window_end TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_appointments_order ON appointments(order_id);

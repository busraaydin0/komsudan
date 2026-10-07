-- Randevu satırı. Çamaşır siparişi slot string kullanır; tablo ileride takvim için durur.

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
  date TEXT NOT NULL,
  window_start TEXT NOT NULL,
  window_end TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_appointments_order ON appointments(order_id);

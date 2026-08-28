-- Faz 6: ödeme kaydı. iyzico henüz yok; provider_reference simüle id.
-- Sipariş satırındaki payment_status PWA köprüsü olarak kalır.

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL,
  commission INTEGER NOT NULL,
  status TEXT NOT NULL,
  provider_reference TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

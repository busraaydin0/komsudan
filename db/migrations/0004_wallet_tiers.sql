-- Cüzdan kademeleri: kullanılabilir (balance) / rezerv / bekleyen.

ALTER TABLE wallets ADD COLUMN reserved INTEGER NOT NULL DEFAULT 0;
ALTER TABLE wallets ADD COLUMN pending INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS wallet_pending_earnings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
  amount INTEGER NOT NULL,
  available_at TEXT NOT NULL,
  released_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pending_earnings_user
  ON wallet_pending_earnings(user_id, available_at);

-- Geriye dönük: authorize ödemelerin tutarı müşteri rezervinde; balance zaten düşülmüş.
UPDATE wallets
SET reserved = COALESCE((
  SELECT SUM(p.amount)
  FROM payments p
  INNER JOIN orders o ON o.id = p.order_id
  WHERE o.user_id = wallets.user_id
    AND p.status = 'authorized'
), 0);

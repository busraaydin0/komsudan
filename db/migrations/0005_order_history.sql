-- Faz 4: durum geçmişi. Sipariş fotoğraf kind ve orders.lifecycle
-- kolonları migrate.ts ensureColumns ile (idempotent ALTER).

CREATE TABLE IF NOT EXISTS order_status_history (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  from_lifecycle TEXT,
  to_lifecycle TEXT NOT NULL,
  actor_id TEXT,
  actor_role TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE INDEX IF NOT EXISTS idx_order_history_order ON order_status_history(order_id);

-- Faz 3: sipariş çekirdeği indeksleri (0001 kolonları).
-- user_id indeksi migrate.ts ensureColumns içinde (kolon orada eklenir).

CREATE INDEX IF NOT EXISTS idx_orders_provider ON orders(provider_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_events_order ON order_events(order_id);

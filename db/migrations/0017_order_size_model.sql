-- Boy + ek fiyat modeli (v0.3 P4). Prototip: eski siparişler silinir.

DELETE FROM order_status_history;
DELETE FROM order_events;
DELETE FROM order_photos;
DELETE FROM payments;
DELETE FROM wallet_ledger WHERE order_id IS NOT NULL;
DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations);
DELETE FROM conversations;
DELETE FROM orders;

CREATE TABLE IF NOT EXISTS provider_prices (
  provider_id TEXT NOT NULL,
  package_id TEXT NOT NULL,
  size TEXT NOT NULL CHECK (size IN ('kucuk', 'orta', 'buyuk')),
  price INTEGER NOT NULL,
  PRIMARY KEY (provider_id, package_id, size),
  FOREIGN KEY (provider_id) REFERENCES providers(id)
);

CREATE TABLE IF NOT EXISTS provider_addon_prices (
  provider_id TEXT NOT NULL,
  addon TEXT NOT NULL CHECK (addon IN ('yorgan', 'battaniye')),
  variant TEXT NOT NULL CHECK (variant IN ('tek', 'cift')),
  price INTEGER NOT NULL,
  PRIMARY KEY (provider_id, addon, variant),
  FOREIGN KEY (provider_id) REFERENCES providers(id)
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  kind TEXT NOT NULL CHECK (kind IN ('size', 'addon')),
  variant TEXT NOT NULL,
  qty INTEGER NOT NULL CHECK (qty >= 0),
  unit_price INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

ALTER TABLE orders ADD COLUMN size TEXT CHECK (size IN ('kucuk', 'orta', 'buyuk'));
ALTER TABLE orders ADD COLUMN confirmed_size TEXT CHECK (confirmed_size IN ('kucuk', 'orta', 'buyuk'));
ALTER TABLE orders ADD COLUMN machine_units INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN pickup_confirmed_at TEXT;
ALTER TABLE orders ADD COLUMN color_groups INTEGER CHECK (color_groups BETWEEN 1 AND 3);
ALTER TABLE orders ADD COLUMN price_change TEXT NOT NULL DEFAULT 'none'
  CHECK (price_change IN ('none', 'pending', 'approved', 'rejected'));
ALTER TABLE orders ADD COLUMN cancel_reason TEXT;

-- Eski parça/kg kolonları (prototip, geriye uyum yok)
ALTER TABLE orders DROP COLUMN pieces;

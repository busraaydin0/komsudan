-- P11: pickup/delivery randevuları, respond_by, provider_stats

CREATE TABLE IF NOT EXISTS appointments_new (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  kind TEXT NOT NULL CHECK (kind IN ('pickup', 'delivery')),
  date TEXT NOT NULL,
  window_start TEXT NOT NULL,
  window_end TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (order_id, kind)
);

INSERT INTO appointments_new (id, order_id, kind, date, window_start, window_end, created_at)
SELECT id, order_id, 'pickup', date, window_start, window_end, created_at FROM appointments;

DROP TABLE appointments;
ALTER TABLE appointments_new RENAME TO appointments;

CREATE INDEX IF NOT EXISTS idx_appointments_order ON appointments(order_id);

ALTER TABLE orders ADD COLUMN respond_by TEXT;
ALTER TABLE orders ADD COLUMN respond_reminder_sent INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS provider_stats (
  provider_id TEXT PRIMARY KEY REFERENCES providers(id),
  expired_count INTEGER NOT NULL DEFAULT 0
);

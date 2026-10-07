-- P2 kod sistemi: KL referans, handoff_codes, kodsuz teslim talebi

ALTER TABLE orders ADD COLUMN public_code TEXT;
ALTER TABLE orders ADD COLUMN pickup_summary_approved_at TEXT;
ALTER TABLE orders ADD COLUMN admin_hold INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN dispute_window_end TEXT;

CREATE TABLE IF NOT EXISTS handoff_codes (
  order_id TEXT NOT NULL REFERENCES orders(id),
  kind TEXT NOT NULL CHECK (kind IN ('pickup', 'return')),
  code TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  locked INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT,
  used_at TEXT,
  entered_by TEXT,
  override_reason TEXT,
  PRIMARY KEY (order_id, kind)
);

ALTER TABLE users ADD COLUMN super_admin INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS delivery_override_requests (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
  provider_id TEXT NOT NULL,
  photo_id TEXT NOT NULL,
  lat REAL,
  lng REAL,
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_reason TEXT,
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  resolved_by TEXT
);

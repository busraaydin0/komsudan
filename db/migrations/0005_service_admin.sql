-- Hizmet Admini (K-009): service_admin rolü, askı bayrağı, audit.

PRAGMA foreign_keys = OFF;

CREATE TABLE users_new (
  id TEXT PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'provider', 'admin', 'service_admin')),
  identity_verified INTEGER NOT NULL DEFAULT 0,
  passkey_id TEXT,
  avatar_url TEXT,
  preferred_category_ids TEXT,
  preferred_intent TEXT,
  onboarding_completed_at TEXT,
  home_lat REAL,
  home_lng REAL,
  home_neighborhood TEXT,
  super_admin INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO users_new (
  id, phone, name, full_name, role, identity_verified, passkey_id, avatar_url,
  preferred_category_ids, preferred_intent, onboarding_completed_at,
  home_lat, home_lng, home_neighborhood, super_admin, created_at, updated_at
)
SELECT
  id, phone, name, full_name, role, identity_verified, passkey_id, avatar_url,
  preferred_category_ids, preferred_intent, onboarding_completed_at,
  home_lat, home_lng, home_neighborhood, super_admin, created_at, updated_at
FROM users;

DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

PRAGMA foreign_keys = ON;

ALTER TABLE provider_profiles ADD COLUMN suspended INTEGER NOT NULL DEFAULT 0;
ALTER TABLE provider_profiles ADD COLUMN suspended_at TEXT;
ALTER TABLE provider_profiles ADD COLUMN suspended_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_provider_suspended ON provider_profiles(suspended);

CREATE TABLE admin_audit (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_admin_audit_target ON admin_audit(target_id, created_at);
CREATE INDEX idx_admin_audit_created ON admin_audit(created_at);

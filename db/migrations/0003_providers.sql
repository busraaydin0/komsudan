CREATE TABLE IF NOT EXISTS provider_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  bio TEXT,
  avatar_url TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  neighborhood TEXT,
  has_dryer INTEGER NOT NULL DEFAULT 0,
  is_founder INTEGER NOT NULL DEFAULT 0,
  verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK(verification_status IN ('pending','verified','rejected')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused')),
  commission_rate REAL NOT NULL DEFAULT 0.10,
  rating_avg REAL NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  completed_orders INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_provider_location ON provider_profiles(lat, lng);
CREATE INDEX IF NOT EXISTS idx_provider_status ON provider_profiles(status);

CREATE TABLE IF NOT EXISTS service_packages (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL REFERENCES provider_profiles(user_id),
  name TEXT NOT NULL,
  price_per_kg REAL NOT NULL,
  min_order_amount REAL NOT NULL DEFAULT 0,
  express_available INTEGER NOT NULL DEFAULT 0,
  express_surcharge_pct REAL NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_packages_provider ON service_packages(provider_id);

-- PWA `drop_points` (payload JSON) duruyor. Sağlayıcı noktaları ayrı tabloda.
CREATE TABLE IF NOT EXISTS provider_drop_points (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL REFERENCES provider_profiles(user_id),
  label TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_provider_drops ON provider_drop_points(provider_id);

CREATE TABLE IF NOT EXISTS availability_slots (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL REFERENCES provider_profiles(user_id),
  day_of_week INTEGER NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  delivery_mode TEXT NOT NULL CHECK(delivery_mode IN ('door','point','both')),
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_availability_provider ON availability_slots(provider_id);

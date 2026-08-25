CREATE TABLE IF NOT EXISTS providers (
  id TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  remaining INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS drop_points (
  id TEXT PRIMARY KEY,
  payload TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  package_id TEXT NOT NULL,
  pieces INTEGER NOT NULL,
  express INTEGER NOT NULL,
  drop_method TEXT NOT NULL,
  drop_point_id TEXT,
  slot TEXT NOT NULL,
  note TEXT NOT NULL,
  total INTEGER NOT NULL,
  commission INTEGER NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (provider_id) REFERENCES providers(id)
);

CREATE TABLE IF NOT EXISTS order_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  at TEXT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE TABLE IF NOT EXISTS order_photos (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  mime TEXT NOT NULL,
  ext TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  order_id TEXT UNIQUE,
  provider_id TEXT NOT NULL,
  rating INTEGER NOT NULL,
  body TEXT NOT NULL,
  author TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (provider_id) REFERENCES providers(id)
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  identity_verified INTEGER NOT NULL DEFAULT 0,
  passkey_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS otps (
  phone TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS gallery_photos (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  order_id TEXT,
  review_id TEXT,
  kind TEXT NOT NULL,
  mime TEXT NOT NULL,
  ext TEXT NOT NULL,
  created_at TEXT NOT NULL
);

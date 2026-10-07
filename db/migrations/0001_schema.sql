-- Katla çamaşır pilot — tek şema (prototip, geriye uyum yok).

PRAGMA foreign_keys = ON;

-- Auth & kullanıcı
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'provider', 'admin')),
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

CREATE TABLE otp_codes (
  id TEXT PRIMARY KEY,
  phone TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  consumed_at TEXT
);

CREATE INDEX idx_otp_codes_phone ON otp_codes(phone);
CREATE INDEX idx_otp_codes_created ON otp_codes(phone, created_at);

CREATE TABLE refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_refresh_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_hash ON refresh_tokens(token_hash);

CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX idx_sessions_user ON sessions(user_id);

-- Kategori (yalnız çamaşır)
CREATE TABLE service_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  fulfillment_mode TEXT NOT NULL CHECK (fulfillment_mode IN ('delivery', 'home_visit')),
  pricing_model TEXT NOT NULL CHECK (pricing_model IN ('per_piece', 'per_kg', 'fixed', 'hourly')),
  is_active INTEGER NOT NULL DEFAULT 1,
  blurb TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Keşif kartı (JSON payload)
CREATE TABLE providers (
  id TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  category_id TEXT NOT NULL DEFAULT 'camasir' REFERENCES service_categories(id)
);

CREATE TABLE provider_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  bio TEXT,
  avatar_url TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  neighborhood TEXT,
  has_dryer INTEGER NOT NULL DEFAULT 0,
  is_founder INTEGER NOT NULL DEFAULT 0,
  verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  commission_rate REAL NOT NULL DEFAULT 0.10,
  rating_avg REAL NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  completed_orders INTEGER NOT NULL DEFAULT 0,
  category_id TEXT REFERENCES service_categories(id),
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_provider_location ON provider_profiles(lat, lng);
CREATE INDEX idx_provider_status ON provider_profiles(status);

CREATE TABLE service_packages (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL REFERENCES provider_profiles(user_id),
  name TEXT NOT NULL,
  price_per_kg REAL NOT NULL,
  min_order_amount REAL NOT NULL DEFAULT 0,
  express_available INTEGER NOT NULL DEFAULT 0,
  express_surcharge_pct REAL NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  category_id TEXT REFERENCES service_categories(id)
);

CREATE INDEX idx_packages_provider ON service_packages(provider_id);

CREATE TABLE availability_slots (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL REFERENCES provider_profiles(user_id),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  delivery_mode TEXT NOT NULL DEFAULT 'door' CHECK (delivery_mode IN ('door', 'point', 'both')),
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_availability_provider ON availability_slots(provider_id);

CREATE TABLE provider_prices (
  provider_id TEXT NOT NULL REFERENCES providers(id),
  package_id TEXT NOT NULL,
  size TEXT NOT NULL CHECK (size IN ('kucuk', 'orta', 'buyuk')),
  price INTEGER NOT NULL,
  PRIMARY KEY (provider_id, package_id, size)
);

CREATE TABLE provider_addon_prices (
  provider_id TEXT NOT NULL REFERENCES providers(id),
  addon TEXT NOT NULL CHECK (addon IN ('yorgan', 'battaniye')),
  variant TEXT NOT NULL CHECK (variant IN ('tek', 'cift')),
  price INTEGER NOT NULL,
  PRIMARY KEY (provider_id, addon, variant)
);

CREATE TABLE provider_capacity_settings (
  provider_id TEXT PRIMARY KEY REFERENCES providers(id),
  half_units_per_day INTEGER NOT NULL CHECK (half_units_per_day > 0),
  working_days TEXT NOT NULL,
  max_units_per_order INTEGER NOT NULL CHECK (max_units_per_order > 0)
);

CREATE TABLE provider_capacity_days (
  provider_id TEXT NOT NULL REFERENCES providers(id),
  date TEXT NOT NULL,
  max_units INTEGER NOT NULL CHECK (max_units > 0),
  used_units INTEGER NOT NULL DEFAULT 0 CHECK (used_units >= 0),
  PRIMARY KEY (provider_id, date),
  CHECK (used_units <= max_units)
);

CREATE INDEX idx_capacity_days_date ON provider_capacity_days(provider_id, date);

CREATE TABLE provider_stats (
  provider_id TEXT PRIMARY KEY REFERENCES providers(id),
  expired_count INTEGER NOT NULL DEFAULT 0
);

-- Sipariş
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL REFERENCES providers(id),
  user_id TEXT REFERENCES users(id),
  package_id TEXT NOT NULL,
  express INTEGER NOT NULL DEFAULT 0,
  drop_method TEXT NOT NULL DEFAULT 'kapi' CHECK (drop_method = 'kapi'),
  slot TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  total INTEGER NOT NULL,
  commission INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN (
    'pending', 'accepted', 'dropped_off', 'washing', 'ironing', 'ready',
    'admin_pending', 'completed', 'rejected', 'cancelled', 'disputed'
  )),
  payment_status TEXT NOT NULL DEFAULT 'authorized',
  paid_at TEXT,
  delivery_mode TEXT,
  scheduled_window_start TEXT,
  size TEXT CHECK (size IN ('kucuk', 'orta', 'buyuk')),
  confirmed_size TEXT CHECK (confirmed_size IN ('kucuk', 'orta', 'buyuk')),
  machine_units INTEGER NOT NULL DEFAULT 0,
  pickup_confirmed_at TEXT,
  color_groups INTEGER CHECK (color_groups BETWEEN 1 AND 3),
  price_change TEXT NOT NULL DEFAULT 'none'
    CHECK (price_change IN ('none', 'pending', 'approved', 'rejected')),
  cancel_reason TEXT,
  estimated_delivery_date TEXT,
  promised_delivery_date TEXT,
  capacity_allocations TEXT,
  delay_count INTEGER NOT NULL DEFAULT 0,
  cancel_free_hours INTEGER,
  respond_by TEXT,
  respond_reminder_sent INTEGER NOT NULL DEFAULT 0,
  public_code TEXT,
  pickup_summary_approved_at TEXT,
  admin_hold INTEGER NOT NULL DEFAULT 0,
  dispute_window_end TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_orders_customer ON orders(user_id);
CREATE INDEX idx_orders_provider ON orders(provider_id);
CREATE INDEX idx_orders_status ON orders(status);

CREATE TABLE order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  kind TEXT NOT NULL CHECK (kind IN ('size', 'addon')),
  variant TEXT NOT NULL,
  qty INTEGER NOT NULL CHECK (qty >= 0),
  unit_price INTEGER NOT NULL
);

CREATE INDEX idx_order_items_order ON order_items(order_id);

CREATE TABLE order_status_history (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  from_status TEXT,
  to_status TEXT NOT NULL,
  actor_id TEXT,
  actor_role TEXT,
  note TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_order_history_order ON order_status_history(order_id);

CREATE TABLE order_photos (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  provider_id TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'dropoff',
  mime TEXT NOT NULL,
  ext TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_order_photos_order ON order_photos(order_id);

CREATE TABLE appointments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  kind TEXT NOT NULL CHECK (kind IN ('pickup', 'delivery')),
  date TEXT NOT NULL,
  window_start TEXT NOT NULL,
  window_end TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (order_id, kind)
);

CREATE INDEX idx_appointments_order ON appointments(order_id);

CREATE TABLE handoff_codes (
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

CREATE TABLE delivery_override_requests (
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

CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
  amount INTEGER NOT NULL,
  commission INTEGER NOT NULL,
  status TEXT NOT NULL,
  provider_reference TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_payments_status ON payments(status);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  order_id TEXT REFERENCES orders(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'in_app',
  read_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read_at);

CREATE TABLE wallets (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  balance INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE wallet_ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL,
  kind TEXT NOT NULL,
  method TEXT,
  order_id TEXT REFERENCES orders(id),
  created_at TEXT NOT NULL
);

CREATE INDEX idx_wallet_ledger_user ON wallet_ledger(user_id, created_at);
CREATE INDEX idx_wallet_ledger_order ON wallet_ledger(order_id);

CREATE TABLE disputes (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  opened_by TEXT NOT NULL REFERENCES users(id),
  opener_role TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  resolved_at TEXT
);

CREATE INDEX idx_disputes_order ON disputes(order_id);
CREATE INDEX idx_disputes_opened_by ON disputes(opened_by);
CREATE INDEX idx_disputes_status ON disputes(status);

CREATE TABLE reviews (
  id TEXT PRIMARY KEY,
  order_id TEXT UNIQUE REFERENCES orders(id),
  provider_id TEXT NOT NULL REFERENCES providers(id),
  rating INTEGER NOT NULL,
  body TEXT NOT NULL,
  author TEXT NOT NULL,
  quality INTEGER,
  timeliness INTEGER,
  communication INTEGER,
  would_repeat INTEGER,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_reviews_provider ON reviews(provider_id);

CREATE TABLE gallery_photos (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  order_id TEXT REFERENCES orders(id),
  review_id TEXT REFERENCES reviews(id),
  kind TEXT NOT NULL,
  mime TEXT NOT NULL,
  ext TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_gallery_provider ON gallery_photos(provider_id);

CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  closed_at TEXT
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id),
  sender_id TEXT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  client_message_id TEXT,
  moderation_status TEXT NOT NULL,
  moderation_reason TEXT,
  read_at TEXT,
  deleted_at TEXT,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX idx_messages_client_id
  ON messages(conversation_id, client_message_id)
  WHERE client_message_id IS NOT NULL;

CREATE INDEX idx_messages_thread ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_sender_time ON messages(sender_id, created_at);
CREATE INDEX idx_messages_unread ON messages(conversation_id, read_at);

CREATE TABLE message_reports (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES messages(id),
  reporter_id TEXT NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX idx_message_reports_unique ON message_reports(message_id, reporter_id);

CREATE TABLE message_moderation_events (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES messages(id),
  action TEXT NOT NULL,
  reason TEXT,
  actor_type TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_moderation_events_message ON message_moderation_events(message_id, created_at);

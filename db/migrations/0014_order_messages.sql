-- Sipariş içi konuşma. Global chat yok. Fiziksel silme yok.

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  closed_at TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  body TEXT NOT NULL,
  client_message_id TEXT,
  moderation_status TEXT NOT NULL,
  moderation_reason TEXT,
  read_at TEXT,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id),
  FOREIGN KEY (sender_id) REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_client_id
  ON messages(conversation_id, client_message_id)
  WHERE client_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_thread
  ON messages(conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_messages_sender_time
  ON messages(sender_id, created_at);

CREATE INDEX IF NOT EXISTS idx_messages_unread
  ON messages(conversation_id, read_at);

CREATE TABLE IF NOT EXISTS message_reports (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  reporter_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (message_id) REFERENCES messages(id),
  FOREIGN KEY (reporter_id) REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_message_reports_unique
  ON message_reports(message_id, reporter_id);

CREATE TABLE IF NOT EXISTS message_moderation_events (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  action TEXT NOT NULL,
  reason TEXT,
  actor_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (message_id) REFERENCES messages(id)
);

CREATE INDEX IF NOT EXISTS idx_moderation_events_message
  ON message_moderation_events(message_id, created_at);

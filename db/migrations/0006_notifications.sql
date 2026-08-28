-- Faz 5: sipariş bildirimleri (in-app + SMS simülasyonu). Gerçek SMS/push yok.

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  order_id TEXT,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'in_app',
  read_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read_at);

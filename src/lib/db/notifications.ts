import { randomUUID } from "node:crypto";
import { db } from "./client";

export type NotificationRow = {
  id: string;
  user_id: string;
  order_id: string | null;
  type: string;
  title: string;
  body: string;
  channel: string;
  read_at: string | null;
  created_at: string;
};

export function insertNotification(input: {
  userId: string;
  orderId?: string | null;
  type: string;
  title: string;
  body: string;
  channel?: string;
}) {
  const now = new Date().toISOString();
  const row: NotificationRow = {
    id: `n-${randomUUID().slice(0, 10)}`,
    user_id: input.userId,
    order_id: input.orderId ?? null,
    type: input.type,
    title: input.title,
    body: input.body,
    channel: input.channel ?? "in_app",
    read_at: null,
    created_at: now,
  };
  db()
    .prepare(
      `INSERT INTO notifications (
        id, user_id, order_id, type, title, body, channel, read_at, created_at
      ) VALUES (
        @id, @user_id, @order_id, @type, @title, @body, @channel, NULL, @created_at
      )`,
    )
    .run(row);
  return row;
}

export function listNotificationsForUser(userId: string, unreadOnly = false, limit = 50): NotificationRow[] {
  const sql = unreadOnly
    ? `SELECT * FROM notifications WHERE user_id = ? AND read_at IS NULL
       ORDER BY created_at DESC LIMIT ?`
    : `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`;
  return db().prepare(sql).all(userId, limit) as NotificationRow[];
}

export function countUnread(userId: string) {
  const row = db()
    .prepare("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL")
    .get(userId) as { n: number };
  return row.n;
}

export function getNotification(id: string): NotificationRow | undefined {
  return db().prepare("SELECT * FROM notifications WHERE id = ?").get(id) as NotificationRow | undefined;
}

export function markNotificationRead(id: string, userId: string, at: string) {
  const result = db()
    .prepare("UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ? AND read_at IS NULL")
    .run(at, id, userId);
  return result.changes;
}

export function markAllNotificationsRead(userId: string, at: string) {
  const result = db()
    .prepare("UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL")
    .run(at, userId);
  return result.changes;
}

export function deleteNotificationsForUser(userId: string) {
  db().prepare("DELETE FROM notifications WHERE user_id = ?").run(userId);
}

export function latestNotificationOfType(userId: string, type: string): NotificationRow | undefined {
  return db()
    .prepare(
      `SELECT * FROM notifications WHERE user_id = ? AND type = ?
       ORDER BY created_at DESC LIMIT 1`,
    )
    .get(userId, type) as NotificationRow | undefined;
}

import { db } from "./client";

export type ConversationStatus = "open" | "closed" | "blocked";
export type ModerationStatus = "allow" | "warn" | "block";

export type ConversationRow = {
  id: string;
  order_id: string;
  status: ConversationStatus;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  client_message_id: string | null;
  moderation_status: ModerationStatus;
  moderation_reason: string | null;
  read_at: string | null;
  deleted_at: string | null;
  created_at: string;
};

export function getConversationByOrderId(orderId: string): ConversationRow | undefined {
  return db()
    .prepare("SELECT * FROM conversations WHERE order_id = ?")
    .get(orderId) as ConversationRow | undefined;
}

export function getConversationById(id: string): ConversationRow | undefined {
  return db().prepare("SELECT * FROM conversations WHERE id = ?").get(id) as ConversationRow | undefined;
}

export function insertConversation(row: ConversationRow) {
  db()
    .prepare(
      `INSERT INTO conversations (id, order_id, status, created_at, updated_at, closed_at)
       VALUES (@id, @order_id, @status, @created_at, @updated_at, @closed_at)`,
    )
    .run(row);
}

export function touchConversation(id: string, at: string) {
  db().prepare("UPDATE conversations SET updated_at = ? WHERE id = ?").run(at, id);
}

export function insertMessage(row: MessageRow) {
  db()
    .prepare(
      `INSERT INTO messages (
         id, conversation_id, sender_id, body, client_message_id,
         moderation_status, moderation_reason, read_at, deleted_at, created_at
       ) VALUES (
         @id, @conversation_id, @sender_id, @body, @client_message_id,
         @moderation_status, @moderation_reason, @read_at, @deleted_at, @created_at
       )`,
    )
    .run(row);
}

export function findMessage(id: string): MessageRow | undefined {
  return db().prepare("SELECT * FROM messages WHERE id = ?").get(id) as MessageRow | undefined;
}

export function findMessageByClientId(
  conversationId: string,
  clientMessageId: string,
): MessageRow | undefined {
  return db()
    .prepare("SELECT * FROM messages WHERE conversation_id = ? AND client_message_id = ?")
    .get(conversationId, clientMessageId) as MessageRow | undefined;
}

export function listVisibleMessages(conversationId: string): MessageRow[] {
  return db()
    .prepare(
      `SELECT * FROM messages
       WHERE conversation_id = ? AND moderation_status != 'block'
       ORDER BY created_at ASC`,
    )
    .all(conversationId) as MessageRow[];
}

export function countUnreadForViewer(conversationId: string, viewerId: string): number {
  const row = db()
    .prepare(
      `SELECT COUNT(*) AS n FROM messages
       WHERE conversation_id = ?
         AND sender_id != ?
         AND read_at IS NULL
         AND deleted_at IS NULL
         AND moderation_status != 'block'`,
    )
    .get(conversationId, viewerId) as { n: number };
  return Number(row.n);
}

export type InboxRow = {
  order_id: string;
  provider_id: string;
  user_id: string | null;
  status: string;
  product_name: string | null;
  package_id: string;
  conversation_id: string | null;
  conversation_status: string | null;
  updated_at: string;
  preview: string | null;
  unread: number;
  peer_name: string | null;
};

export function listInboxRows(userId: string): InboxRow[] {
  return db()
    .prepare(
      `SELECT
         o.id AS order_id,
         o.provider_id,
         o.user_id,
         o.status,
         o.product_name,
         o.package_id,
         c.id AS conversation_id,
         c.status AS conversation_status,
         COALESCE(c.updated_at, o.created_at) AS updated_at,
         (
           SELECT CASE WHEN m.deleted_at IS NOT NULL THEN 'Bu mesaj kaldırıldı' ELSE m.body END
           FROM messages m
           WHERE m.conversation_id = c.id AND m.moderation_status != 'block'
           ORDER BY m.created_at DESC LIMIT 1
         ) AS preview,
         (
           SELECT COUNT(*) FROM messages m
           WHERE m.conversation_id = c.id
             AND m.sender_id != ?
             AND m.read_at IS NULL
             AND m.deleted_at IS NULL
             AND m.moderation_status != 'block'
         ) AS unread,
         CASE WHEN o.user_id = ? THEN pu.name ELSE cu.name END AS peer_name
       FROM orders o
       LEFT JOIN conversations c ON c.order_id = o.id
       LEFT JOIN users pu ON pu.id = o.provider_id
       LEFT JOIN users cu ON cu.id = o.user_id
       WHERE o.user_id = ? OR o.provider_id = ?
       ORDER BY COALESCE(c.updated_at, o.created_at) DESC
       LIMIT 80`,
    )
    .all(userId, userId, userId, userId) as InboxRow[];
}

export function markMessagesRead(conversationId: string, viewerId: string, at: string) {
  return db()
    .prepare(
      `UPDATE messages SET read_at = ?
       WHERE conversation_id = ?
         AND sender_id != ?
         AND read_at IS NULL
         AND deleted_at IS NULL
         AND moderation_status != 'block'`,
    )
    .run(at, conversationId, viewerId).changes;
}

export function countSenderSince(conversationId: string, senderId: string, sinceIso: string) {
  const row = db()
    .prepare(
      `SELECT COUNT(*) AS n FROM messages
       WHERE conversation_id = ? AND sender_id = ? AND created_at >= ?`,
    )
    .get(conversationId, senderId, sinceIso) as { n: number };
  return Number(row.n);
}

export function countSameBodySince(
  conversationId: string,
  senderId: string,
  body: string,
  sinceIso: string,
) {
  const row = db()
    .prepare(
      `SELECT COUNT(*) AS n FROM messages
       WHERE conversation_id = ? AND sender_id = ? AND body = ? AND created_at >= ?`,
    )
    .get(conversationId, senderId, body, sinceIso) as { n: number };
  return Number(row.n);
}

export function softDeleteMessage(id: string, at: string) {
  return db()
    .prepare("UPDATE messages SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL")
    .run(at, id).changes;
}

export function insertReport(row: {
  id: string;
  message_id: string;
  reporter_id: string;
  reason: string;
  status: string;
  created_at: string;
}) {
  db()
    .prepare(
      `INSERT INTO message_reports (id, message_id, reporter_id, reason, status, created_at)
       VALUES (@id, @message_id, @reporter_id, @reason, @status, @created_at)`,
    )
    .run(row);
}

export function findReport(messageId: string, reporterId: string) {
  return db()
    .prepare("SELECT id FROM message_reports WHERE message_id = ? AND reporter_id = ?")
    .get(messageId, reporterId) as { id: string } | undefined;
}

export function insertModerationEvent(row: {
  id: string;
  message_id: string;
  action: string;
  reason: string | null;
  actor_type: string;
  created_at: string;
}) {
  db()
    .prepare(
      `INSERT INTO message_moderation_events (
         id, message_id, action, reason, actor_type, created_at
       ) VALUES (
         @id, @message_id, @action, @reason, @actor_type, @created_at
       )`,
    )
    .run(row);
}

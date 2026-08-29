import { randomUUID } from "node:crypto";
import type { AuthUser } from "@/lib/auth/types";
import type { OrderConversation, OrderMessage } from "@/lib/types";
import { getOrderRow } from "@/lib/db/orders";
import {
  countSameBodySince,
  countSenderSince,
  countUnreadForViewer,
  findMessage,
  findMessageByClientId,
  findReport,
  getConversationByOrderId,
  insertConversation,
  insertMessage,
  insertModerationEvent,
  insertReport,
  listVisibleMessages,
  markMessagesRead,
  softDeleteMessage,
  touchConversation,
  type ConversationRow,
  type MessageRow,
} from "@/lib/db/messages";
import { moderateMessage } from "@/lib/moderation/messageModeration";
import { collapseSpaces } from "@/lib/moderation/normalize";
import { canSeeOrder } from "@/lib/services/orderService";
import { notifyOrderMessage } from "@/lib/services/notificationService";
import { ApiError } from "@/server/rules";

export const MSG_PER_MINUTE = 8;
export const MSG_PER_HOUR = 40;
export const MSG_MAX = 500;
export const MSG_BLOCKED_COPY =
  "Bu mesaj gönderilemedi. Lütfen Komşudan üzerinden güvenli ve saygılı iletişim kur.";
const REMOVED = "Bu mesaj kaldırıldı";

function requireOrderParty(user: AuthUser, orderId: string) {
  const row = getOrderRow(orderId);
  if (!row || !canSeeOrder(user, row)) {
    throw new ApiError(404, "Sipariş yok.", "NOT_FOUND");
  }
  return row;
}

function otherPartyId(order: { user_id: string | null; provider_id: string }, senderId: string) {
  if (senderId === order.provider_id) return order.user_id;
  return order.provider_id;
}

function toPublicMessage(row: MessageRow): OrderMessage {
  const deleted = Boolean(row.deleted_at);
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: deleted ? REMOVED : row.body,
    warning: row.moderation_status === "warn",
    readAt: row.read_at,
    deleted,
    createdAt: row.created_at,
  };
}

function toPublicConversation(row: ConversationRow): OrderConversation {
  return {
    id: row.id,
    orderId: row.order_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getOrCreateConversation(orderId: string): ConversationRow {
  const existing = getConversationByOrderId(orderId);
  if (existing) return existing;
  const now = new Date().toISOString();
  const row: ConversationRow = {
    id: `c-${randomUUID().slice(0, 10)}`,
    order_id: orderId,
    status: "open",
    created_at: now,
    updated_at: now,
    closed_at: null,
  };
  try {
    insertConversation(row);
    return row;
  } catch {
    return getConversationByOrderId(orderId) ?? row;
  }
}

function assertOpen(convo: ConversationRow) {
  if (convo.status === "closed" || convo.status === "blocked") {
    throw new ApiError(409, "Bu konuşma kapalı.", "CONVERSATION_CLOSED");
  }
}

function assertRateLimit(conversationId: string, senderId: string) {
  const now = Date.now();
  if (countSenderSince(conversationId, senderId, new Date(now - 60_000).toISOString()) >= MSG_PER_MINUTE) {
    throw new ApiError(429, "Biraz yavaş, dakikada çok mesaj oldu.", "MESSAGE_RATE_LIMITED");
  }
  if (countSenderSince(conversationId, senderId, new Date(now - 3_600_000).toISOString()) >= MSG_PER_HOUR) {
    throw new ApiError(429, "Saatlik mesaj limiti doldu.", "MESSAGE_RATE_LIMITED");
  }
}

function audit(messageId: string, action: string, reason: string | null) {
  insertModerationEvent({
    id: `me-${randomUUID().slice(0, 10)}`,
    message_id: messageId,
    action,
    reason,
    actor_type: "system",
    created_at: new Date().toISOString(),
  });
}

export function listOrderMessages(user: AuthUser, orderId: string) {
  requireOrderParty(user, orderId);
  const convo = getOrCreateConversation(orderId);
  return {
    conversation: toPublicConversation(convo),
    messages: listVisibleMessages(convo.id).map(toPublicMessage),
    unreadCount: countUnreadForViewer(convo.id, user.id),
  };
}

export function sendOrderMessage(
  user: AuthUser,
  orderId: string,
  input: { body: string; clientMessageId?: string },
) {
  const order = requireOrderParty(user, orderId);
  const body = collapseSpaces(input.body ?? "");
  if (!body) throw new ApiError(400, "Mesaj boş olamaz.", "MESSAGE_EMPTY");
  if (body.length > MSG_MAX) throw new ApiError(400, "Mesaj en fazla 500 karakter.", "MESSAGE_TOO_LONG");

  const convo = getOrCreateConversation(orderId);
  assertOpen(convo);

  const clientId = input.clientMessageId?.trim() || null;
  if (clientId) {
    const dup = findMessageByClientId(convo.id, clientId);
    if (dup) {
      if (dup.sender_id !== user.id) throw new ApiError(404, "Sipariş yok.", "NOT_FOUND");
      if (dup.moderation_status === "block") {
        throw new ApiError(400, MSG_BLOCKED_COPY, "MESSAGE_BLOCKED");
      }
      return { message: toPublicMessage(dup), warning: dup.moderation_status === "warn" };
    }
  }

  assertRateLimit(convo.id, user.id);
  if (countSameBodySince(convo.id, user.id, body, new Date(Date.now() - 10 * 60_000).toISOString()) >= 3) {
    throw new ApiError(400, MSG_BLOCKED_COPY, "MESSAGE_BLOCKED");
  }

  const verdict = moderateMessage(body);
  const now = new Date().toISOString();
  const row: MessageRow = {
    id: `m-${randomUUID().slice(0, 10)}`,
    conversation_id: convo.id,
    sender_id: user.id,
    body,
    client_message_id: clientId,
    moderation_status: verdict.decision,
    moderation_reason: verdict.reason,
    read_at: null,
    deleted_at: null,
    created_at: now,
  };

  try {
    insertMessage(row);
  } catch {
    if (clientId) {
      const again = findMessageByClientId(convo.id, clientId);
      if (again) {
        if (again.moderation_status === "block") {
          throw new ApiError(400, MSG_BLOCKED_COPY, "MESSAGE_BLOCKED");
        }
        return { message: toPublicMessage(again), warning: again.moderation_status === "warn" };
      }
    }
    throw new ApiError(409, "Mesaj kaydedilemedi.", "MESSAGE_NOT_ALLOWED");
  }

  audit(row.id, verdict.decision, verdict.reason);
  touchConversation(convo.id, now);

  if (verdict.decision === "block") {
    throw new ApiError(400, MSG_BLOCKED_COPY, "MESSAGE_BLOCKED");
  }

  const other = otherPartyId(order, user.id);
  notifyOrderMessage(other, orderId);
  return { message: toPublicMessage(row), warning: verdict.decision === "warn" };
}

export function readOrderMessages(user: AuthUser, orderId: string) {
  requireOrderParty(user, orderId);
  const convo = getConversationByOrderId(orderId);
  if (!convo) throw new ApiError(404, "Konuşma yok.", "CONVERSATION_NOT_FOUND");
  markMessagesRead(convo.id, user.id, new Date().toISOString());
  return listOrderMessages(user, orderId);
}

export function reportOrderMessage(
  user: AuthUser,
  orderId: string,
  messageId: string,
  reason: string,
) {
  requireOrderParty(user, orderId);
  const convo = getConversationByOrderId(orderId);
  if (!convo) throw new ApiError(404, "Konuşma yok.", "CONVERSATION_NOT_FOUND");
  const msg = findMessage(messageId);
  if (!msg || msg.conversation_id !== convo.id || msg.moderation_status === "block") {
    throw new ApiError(404, "Mesaj yok.", "MESSAGE_NOT_FOUND");
  }
  if (findReport(messageId, user.id)) {
    throw new ApiError(409, "Bu mesajı zaten bildirdin.", "MESSAGE_ALREADY_REPORTED");
  }
  insertReport({
    id: `mr-${randomUUID().slice(0, 10)}`,
    message_id: messageId,
    reporter_id: user.id,
    reason: reason.trim(),
    status: "open",
    created_at: new Date().toISOString(),
  });
  audit(messageId, "report", reason.trim());
  return { ok: true as const };
}

export function deleteOrderMessage(user: AuthUser, orderId: string, messageId: string) {
  requireOrderParty(user, orderId);
  const convo = getConversationByOrderId(orderId);
  if (!convo) throw new ApiError(404, "Konuşma yok.", "CONVERSATION_NOT_FOUND");
  const msg = findMessage(messageId);
  if (!msg || msg.conversation_id !== convo.id || msg.moderation_status === "block") {
    throw new ApiError(404, "Mesaj yok.", "MESSAGE_NOT_FOUND");
  }
  if (msg.sender_id !== user.id && user.role !== "admin") {
    throw new ApiError(404, "Mesaj yok.", "MESSAGE_NOT_FOUND");
  }
  const at = new Date().toISOString();
  softDeleteMessage(messageId, at);
  const next = findMessage(messageId)!;
  return { message: toPublicMessage({ ...next, deleted_at: next.deleted_at ?? at }) };
}

export function unreadCountForOrder(user: AuthUser, orderId: string) {
  const row = getOrderRow(orderId);
  if (!row || !canSeeOrder(user, row)) return 0;
  const convo = getConversationByOrderId(orderId);
  if (!convo) return 0;
  return countUnreadForViewer(convo.id, user.id);
}

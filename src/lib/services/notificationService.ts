import type { ApiLifecycle, AppNotification } from "@/lib/types";
import { ApiError } from "@/server/rules";
import type { AuthUser } from "@/lib/auth/types";
import type { OrderRow } from "@/lib/db/orders";
import { customerHasOpenOrder } from "@/lib/db/orders";
import { pickNudgeCopy } from "@/lib/nudgeCopy";
import {
  countUnread,
  deleteNotificationsForUser,
  getNotification,
  insertNotification,
  latestNotificationOfType,
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRow,
} from "@/lib/db/notifications";

export { deleteNotificationsForUser };
export type { AppNotification };

function toPublic(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    orderId: row.order_id,
    type: row.type,
    title: row.title,
    body: row.body,
    channel: row.channel,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

function pushTo(userId: string | null | undefined, input: {
  orderId?: string | null;
  type: string;
  title: string;
  body: string;
}) {
  if (!userId) return;
  try {
    insertNotification({ userId, ...input });
  } catch (e) {
    console.error("Bildirim yazılamadı.", e);
  }
}

export function notifyNewOrder(row: { id: string; provider_id: string; user_id: string | null; pieces: number }) {
  if (row.provider_id === row.user_id) return;
  pushTo(row.provider_id, {
    orderId: row.id,
    type: "order_created",
    title: "Yeni sipariş",
    body: `${row.pieces} parçalık sipariş geldi. Kabul veya red için Hizmet’e bak.`,
  });
}

export function notifyStatusChange(input: {
  row: OrderRow;
  from: ApiLifecycle;
  next: ApiLifecycle;
  actorId: string;
  pickupCode?: string | null;
}) {
  const { row, from, next, actorId, pickupCode } = input;
  const customerId = row.user_id;
  const providerId = row.provider_id;
  const other = actorId === customerId ? providerId : customerId;

  if (next === "accepted" || (next === "dropped_off" && from === "pending")) {
    if (customerId && customerId !== actorId) {
      pushTo(customerId, {
        orderId: row.id,
        type: "order_accepted",
        title: "Sipariş kabul edildi",
        body: `${row.id} alındı. Yıkama sırasına girdi.`,
      });
    }
    return;
  }
  if (next === "dropped_off") return;
  if (next === "ready") {
    if (customerId && customerId !== actorId) {
      const code = pickupCode ? ` Teslim kodun: ${pickupCode}.` : "";
      pushTo(customerId, {
        orderId: row.id,
        type: "order_ready",
        title: "Sipariş hazır",
        body: `${row.id} teslime hazır.${code} (SMS simülasyonu, gerçek SMS yok.)`,
      });
    }
    return;
  }
  if (next === "rejected") {
    const byCustomer = actorId === customerId;
    pushTo(other, {
      orderId: row.id,
      type: byCustomer ? "order_cancelled" : "order_rejected",
      title: byCustomer ? "Sipariş iptal edildi" : "Sipariş reddedildi",
      body: byCustomer
        ? `${row.id} iptal. Ön otorizasyon çözüldü, para çekilmedi.`
        : `${row.id} kabul edilmedi. Ön otorizasyon çözüldü.`,
    });
    return;
  }
  if (next === "cancelled") {
    pushTo(other, {
      orderId: row.id,
      type: "order_cancelled",
      title: "Sipariş iptal edildi",
      body: `${row.id} iptal. Ön otorizasyon çözüldü, para çekilmedi.`,
    });
    return;
  }
  if (next === "completed") {
    pushTo(other, {
      orderId: row.id,
      type: "order_completed",
      title: "Teslim bitti",
      body: `${row.id} teslim edildi. Ödeme alındı.`,
    });
  }
}

export function notifyPickupCodeRotated(row: OrderRow, code: string) {
  pushTo(row.user_id, {
    orderId: row.id,
    type: "pickup_code",
    title: "Yeni teslim kodu",
    body: `Beş hatalı deneme oldu. Yeni kod: ${code} (SMS simülasyonu, gerçek SMS yok.)`,
  });
}

/** Açık siparişi yoksa günde ~bir hatırlatma. GET kutusu açılınca yazılır. */
const NUDGE_GAP_MS = 18 * 60 * 60 * 1000;

export function maybeEngagementNudge(user: AuthUser) {
  if (user.role !== "customer") return;
  if (customerHasOpenOrder(user.id)) return;
  const last = latestNotificationOfType(user.id, "nudge");
  if (last && Date.now() - Date.parse(last.created_at) < NUDGE_GAP_MS) return;
  const copy = pickNudgeCopy(last?.title);
  pushTo(user.id, {
    type: "nudge",
    title: copy.title,
    body: copy.body,
  });
}

export function listMyNotifications(user: AuthUser, unreadOnly = false, withNudge = true) {
  if (withNudge) maybeEngagementNudge(user);
  return {
    notifications: listNotificationsForUser(user.id, unreadOnly).map(toPublic),
    unread: countUnread(user.id),
  };
}

export function readNotification(user: AuthUser, id: string) {
  const row = getNotification(id);
  if (!row || row.user_id !== user.id) {
    throw new ApiError(404, "Bildirim yok.", "NOT_FOUND");
  }
  markNotificationRead(id, user.id, new Date().toISOString());
  return listMyNotifications(user, false, false);
}

export function readAllNotifications(user: AuthUser) {
  markAllNotificationsRead(user.id, new Date().toISOString());
  return listMyNotifications(user, false, false);
}

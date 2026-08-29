import { logger } from "@/lib/logger";
import type { ApiLifecycle, AppNotification } from "@/lib/types";
import { ApiError } from "@/server/rules";
import type { AuthUser } from "@/lib/auth/types";
import { customerHasOpenOrder, getOrderRow, type OrderRow } from "@/lib/db/orders";
import { pickNudgeCopy, pickOrderNotice } from "@/lib/noticeCopy";
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
    logger.error({ err: e }, "Bildirim yazılamadı.");
  }
}

export function notifyNewOrder(row: { id: string; provider_id: string; user_id: string | null; pieces: number }) {
  if (row.provider_id === row.user_id) return;
  const order = getOrderRow(row.id);
  const copy = pickOrderNotice("created", {
    packageId: order?.package_id,
    pieces: order?.guest_count ?? order?.pieces ?? row.pieces,
    productName: order?.product_name,
    orderId: row.id,
  });
  pushTo(row.provider_id, {
    orderId: row.id,
    type: "order_created",
    title: copy.title,
    body: copy.body,
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
  const ctx = {
    packageId: row.package_id,
    pieces: row.guest_count ?? row.pieces,
    productName: row.product_name,
    orderId: row.id,
    pickupCode: pickupCode ?? undefined,
  };

  if (next === "accepted" || (next === "dropped_off" && from === "pending")) {
    if (customerId && customerId !== actorId) {
      const copy = pickOrderNotice("accepted", ctx);
      pushTo(customerId, {
        orderId: row.id,
        type: "order_accepted",
        title: copy.title,
        body: copy.body,
      });
    }
    return;
  }
  if (next === "dropped_off") return;
  if (next === "ready") {
    if (customerId && customerId !== actorId) {
      const copy = pickOrderNotice("ready", ctx);
      pushTo(customerId, {
        orderId: row.id,
        type: "order_ready",
        title: copy.title,
        body: copy.body,
      });
    }
    return;
  }
  if (next === "rejected") {
    const byCustomer = actorId === customerId;
    const copy = pickOrderNotice(byCustomer ? "cancelled" : "rejected", ctx);
    pushTo(other, {
      orderId: row.id,
      type: byCustomer ? "order_cancelled" : "order_rejected",
      title: copy.title,
      body: copy.body,
    });
    return;
  }
  if (next === "cancelled") {
    const copy = pickOrderNotice("cancelled", ctx);
    pushTo(other, {
      orderId: row.id,
      type: "order_cancelled",
      title: copy.title,
      body: copy.body,
    });
    return;
  }
  if (next === "completed") {
    const copy = pickOrderNotice("completed", ctx);
    pushTo(other, {
      orderId: row.id,
      type: "order_completed",
      title: copy.title,
      body: copy.body,
    });
  }
}

export function notifyPickupCodeRotated(row: OrderRow, code: string) {
  const copy = pickOrderNotice("pickup", {
    packageId: row.package_id,
    pieces: row.guest_count ?? row.pieces,
    productName: row.product_name,
    orderId: row.id,
    pickupCode: code,
  });
  pushTo(row.user_id, {
    orderId: row.id,
    type: "pickup_code",
    title: copy.title,
    body: copy.body,
  });
}

/** Açık siparişi yoksa günde ~bir hatırlatma. GET kutusu açılınca yazılır. */
const NUDGE_GAP_MS = 18 * 60 * 60 * 1000;

export function notifyOrderMessage(userId: string | null | undefined, orderId: string) {
  pushTo(userId, {
    orderId,
    type: "order_message",
    title: "Yeni mesaj",
    body: "Siparişinde yeni bir mesaj var.",
  });
}

export function maybeEngagementNudge(user: AuthUser) {
  if (user.role !== "customer") return;
  if (customerHasOpenOrder(user.id)) return;
  const last = latestNotificationOfType(user.id, "nudge");
  if (last && Date.now() - Date.parse(last.created_at) < NUDGE_GAP_MS) return;
  const copy = pickNudgeCopy(last?.title, user.preferredCategoryIds);
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

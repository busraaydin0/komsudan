import { dateAtNoonIstanbul, isoDateInIstanbul } from "@/lib/capacity/istanbul";
import { getOrderRow, updateOrderDelay } from "@/lib/db/orders";
import type { AuthUser } from "@/lib/auth/types";
import { ApiError } from "@/lib/errors";
import { isOrderStatus, type OrderStatusId } from "@/lib/status";
import { notifyOrderDelayed } from "./notificationService";

const MAX_DELAY_MS = 72 * 3_600_000;

function canDelayStatus(status: OrderStatusId) {
  return status === "accepted" || status === "dropped_off" || status === "washing" || status === "ironing" || status === "ready";
}

export function delayOrder(user: AuthUser, orderId: string, reason: string, extendHours: number) {
  const row = getOrderRow(orderId);
  if (!row) throw new ApiError(404, "Sipariş yok.", "NOT_FOUND");
  if (user.role !== "admin" && row.provider_id !== user.id) {
    throw new ApiError(403, "Ertelemeyi hizmet veren yapar.", "FORBIDDEN");
  }
  if (!isOrderStatus(row.status) || !canDelayStatus(row.status)) {
    throw new ApiError(409, "Bu aşamada erteleme yok.", "INVALID_TRANSITION");
  }
  const note = reason.trim();
  if (note.length < 3) {
    throw new ApiError(400, "Erteleme gerekçesi zorunlu.", "VALIDATION_ERROR");
  }
  if (!Number.isFinite(extendHours) || extendHours < 1 || extendHours > 72) {
    throw new ApiError(400, "Erteleme en fazla 72 saat.", "VALIDATION_ERROR");
  }
  const current = row.promised_delivery_date ?? row.estimated_delivery_date;
  if (!current) throw new ApiError(409, "Teslim tarihi henüz yok.", "INVALID_TRANSITION");

  const base = dateAtNoonIstanbul(current);
  const ms = Math.min(MAX_DELAY_MS, extendHours * 3_600_000);
  const nextDate = isoDateInIstanbul(new Date(base.getTime() + ms));
  const now = new Date().toISOString();
  const delayCount = (row.delay_count ?? 0) + 1;

  updateOrderDelay({
    id: orderId,
    promisedDeliveryDate: nextDate,
    delayCount,
    updatedAt: now,
    cancelFreeHours: 72,
  });

  notifyOrderDelayed(row, nextDate, note);
  return orderId;
}

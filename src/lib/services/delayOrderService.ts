import { dateAtNoonIstanbul, isoDateInIstanbul } from "@/lib/capacity/istanbul";
import { getOrderRow, updateOrderDelay } from "@/lib/db/orders";
import type { AuthUser } from "@/lib/auth/types";
import { ApiError } from "@/server/rules";
import { lifecycleOf } from "@/lib/status";
import type { OrderStatus } from "@/lib/types";
import { notifyOrderDelayed } from "./notificationService";

const MAX_DELAY_MS = 72 * 3_600_000;

function canDelayLifecycle(lc: string) {
  return lc === "accepted" || lc === "dropped_off" || lc === "washing" || lc === "ironing" || lc === "ready";
}

export function delayOrder(user: AuthUser, orderId: string, reason: string, extendHours: number) {
  const row = getOrderRow(orderId);
  if (!row) throw new ApiError(404, "Sipariş yok.", "NOT_FOUND");
  if (user.role !== "admin" && row.provider_id !== user.id) {
    throw new ApiError(403, "Ertelemeyi hizmet veren yapar.", "FORBIDDEN");
  }
  const lc = lifecycleOf(row.status as OrderStatus, row.lifecycle);
  if (!canDelayLifecycle(lc)) {
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

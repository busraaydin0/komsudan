import { insertDeliveryOverride, getDeliveryOverrideByOrder, resolveDeliveryOverride } from "@/lib/db/deliveryOverride";
import { getOrderRow, setOrderAdminHold } from "@/lib/db/orders";
import type { AuthUser } from "@/lib/auth/types";
import { ApiError } from "@/server/rules";
import { lifecycleOf } from "@/lib/status";
import type { OrderStatus } from "@/lib/types";
import { photosForOrder } from "@/server/photos";
import { notifyDeliveryOverrideOpened } from "@/lib/services/notificationService";
import { completeOrderOverride } from "@/lib/services/orderService";
import { assertSuperAdmin } from "@/lib/auth/superAdmin";

const DISPUTE_HOURS = 24;

export function requestDeliveryOverride(
  user: AuthUser,
  orderId: string,
  input: { photoId: string; lat?: number; lng?: number; note: string },
) {
  const row = getOrderRow(orderId);
  if (!row) throw new ApiError(404, "Sipariş yok.", "NOT_FOUND");
  if (user.role !== "admin" && row.provider_id !== user.id) {
    throw new ApiError(403, "Kodsuz teslim talebini hizmet veren açar.", "FORBIDDEN");
  }
  const lc = lifecycleOf(row.status as OrderStatus, row.lifecycle);
  if (lc !== "ready") throw new ApiError(409, "Talep yalnızca hazır siparişte.", "INVALID_TRANSITION");
  if (getDeliveryOverrideByOrder(orderId)?.status === "pending") {
    throw new ApiError(409, "Bekleyen talep var.", "CONFLICT");
  }
  const photos = photosForOrder(orderId);
  if (!photos.some((p) => p.id === input.photoId)) {
    throw new ApiError(400, "Fotoğraf siparişe ait değil.", "VALIDATION_ERROR");
  }
  const note = input.note.trim();
  if (note.length < 3) throw new ApiError(400, "Gerekçe zorunlu.", "VALIDATION_ERROR");

  const now = new Date().toISOString();
  const end = new Date(Date.now() + DISPUTE_HOURS * 3_600_000).toISOString();
  insertDeliveryOverride({
    orderId,
    providerId: row.provider_id,
    photoId: input.photoId,
    lat: input.lat,
    lng: input.lng,
    note,
    at: now,
  });
  setOrderAdminHold(orderId, true, end, now);
  notifyDeliveryOverrideOpened(row, end);
  return orderId;
}

export function adminResolveOverride(user: AuthUser, orderId: string, approve: boolean, reason: string) {
  assertSuperAdmin(user);
  const row = getOrderRow(orderId);
  if (!row) throw new ApiError(404, "Sipariş yok.", "NOT_FOUND");
  const ov = getDeliveryOverrideByOrder(orderId);
  if (!ov || ov.status !== "pending") {
    throw new ApiError(409, "Bekleyen kodsuz teslim talebi yok.", "INVALID_TRANSITION");
  }
  const now = new Date().toISOString();
  const why = reason.trim();
  if (why.length < 3) throw new ApiError(400, "Admin gerekçesi zorunlu.", "VALIDATION_ERROR");

  resolveDeliveryOverride(ov.id, approve ? "approved" : "rejected", user.id, why, now);
  setOrderAdminHold(orderId, false, null, now);
  if (approve) {
    return completeOrderOverride(user, orderId, why);
  }
  return orderId;
}

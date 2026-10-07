import { addonKey, type LaundrySize, type OrderAddonLine } from "@/lib/laundryModel";
import { requiresPriceApproval } from "@/lib/pickupRules";
import {
  addonsFromItems,
  listOrderItems,
  orderedSizeFromItems,
  replaceAddonItems,
} from "@/lib/db/orderItems";
import { ensureProviderPriceGrid, getAddonPrice } from "@/lib/db/providerPrices";
import {
  getOrderRow,
  runOrderTx,
  updateOrderCancelReason,
  updateOrderPickupConfirm,
  updateOrderPriceChange,
  updateOrderStatus,
  recordTransition,
} from "@/lib/db/orders";
import type { AuthUser } from "@/lib/auth/types";
import { ApiError } from "@/server/rules";
import { quoteForProviderOrder } from "@/lib/pricingServer";
import { isOrderStatus } from "@/lib/status";
import type { PackageId } from "@/lib/types";
import { photosForOrder } from "@/server/photos";
import { parseAllocations } from "@/lib/db/providerCapacity";
import { releaseOrderCapacity } from "@/lib/services/capacityService";
import { authorizePayment, voidPayment } from "@/lib/services/paymentService";

function normalizeAddons(raw: OrderAddonLine[]) {
  return raw.filter((a) => a.qty > 0);
}

function assertProviderAtDoor(user: AuthUser, row: NonNullable<ReturnType<typeof getOrderRow>>) {
  if (user.role === "admin") return;
  if (user.role === "provider" && row.provider_id === user.id) return;
  throw new ApiError(403, "Kapı doğrulamasını hizmet veren yapar.", "FORBIDDEN");
}

export function confirmPickupAtDoor(
  user: AuthUser,
  orderId: string,
  input: { confirmedSize: LaundrySize; addons: OrderAddonLine[]; colorGroups: number },
) {
  const row = getOrderRow(orderId);
  if (!row) throw new ApiError(404, "Sipariş yok.", "NOT_FOUND");
  assertProviderAtDoor(user, row);
  if (!isOrderStatus(row.status) || row.status !== "accepted") {
    throw new ApiError(409, "Kapı doğrulaması yalnızca kabul sonrası.", "INVALID_TRANSITION");
  }
  const photos = photosForOrder(orderId);
  if (!photos.some((p) => p.kind === "dropoff" || !p.kind)) {
    throw new ApiError(400, "Kapıda en az bir fotoğraf gerekli.", "VALIDATION_ERROR");
  }

  const items = listOrderItems(orderId);
  const orderedSize = orderedSizeFromItems(items) ?? row.size;
  if (!orderedSize) throw new ApiError(500, "Sipariş boyu yok.", "INTERNAL");

  const orderedAddons = addonsFromItems(items);
  const confirmedAddons = normalizeAddons(input.addons);
  ensureProviderPriceGrid(row.provider_id);

  const needsApproval = requiresPriceApproval(
    orderedSize,
    orderedAddons,
    input.confirmedSize,
    confirmedAddons,
  );
  const quote = quoteForProviderOrder(
    row.provider_id,
    row.package_id as PackageId,
    input.confirmedSize,
    confirmedAddons,
    Boolean(row.express),
  );

  const priceChange = needsApproval ? "pending" : "none";
  const now = new Date().toISOString();

  runOrderTx(() => {
    const addonPrices = new Map<string, number>();
    for (const a of confirmedAddons) {
      const key = addonKey(a.addon, a.variant);
      const p = getAddonPrice(row.provider_id, a.addon, a.variant);
      if (p == null) throw new ApiError(400, "Ek fiyatı tanımlı değil.", "VALIDATION_ERROR");
      addonPrices.set(key, p);
    }
    replaceAddonItems(orderId, confirmedAddons, addonPrices);
    updateOrderPickupConfirm({
      id: orderId,
      confirmedSize: input.confirmedSize,
      colorGroups: input.colorGroups,
      machineUnits: quote.machineUnits,
      total: quote.total,
      commission: quote.commission,
      priceChange,
      at: now,
    });
    if (needsApproval) {
      authorizePayment({
        orderId,
        amount: quote.total,
        commission: quote.commission,
        at: now,
      });
    }
  });

  return orderId;
}

export function respondPriceChange(user: AuthUser, orderId: string, action: "approve" | "reject") {
  const row = getOrderRow(orderId);
  if (!row) throw new ApiError(404, "Sipariş yok.", "NOT_FOUND");
  if (row.user_id !== user.id && user.role !== "admin") {
    throw new ApiError(403, "Fiyat onayını müşteri verir.", "FORBIDDEN");
  }
  if (row.price_change !== "pending") {
    throw new ApiError(409, "Bekleyen fiyat değişikliği yok.", "INVALID_TRANSITION");
  }
  const now = new Date().toISOString();
  if (action === "approve") {
    updateOrderPriceChange(orderId, "approved", now);
    return orderId;
  }

  runOrderTx(() => {
    updateOrderPriceChange(orderId, "rejected", now);
    updateOrderCancelReason(orderId, "size_rejected", now);
    updateOrderStatus({
      id: orderId,
      status: "cancelled",
      updatedAt: now,
      paymentStatus: "voided",
    });
    recordTransition({
      orderId,
      fromStatus: row.status,
      toStatus: "cancelled",
      actorId: user.id,
      actorRole: user.role,
      note: "size_rejected",
      at: now,
    });
    releaseOrderCapacity(row.provider_id, parseAllocations(row.capacity_allocations));
    voidPayment(orderId, now);
  });

  return orderId;
}

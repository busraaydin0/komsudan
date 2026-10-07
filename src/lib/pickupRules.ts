import {
  addonKey,
  exceedsOrderedSize,
  type LaundrySize,
  type OrderAddonLine,
} from "@/lib/laundryModel";
import type { OrderRow } from "@/lib/db/orders";
import { ApiError } from "@/server/rules";

export function addonQtyExceeds(
  ordered: OrderAddonLine[],
  confirmed: OrderAddonLine[],
  addon: OrderAddonLine["addon"],
  variant: OrderAddonLine["variant"],
) {
  const key = addonKey(addon, variant);
  const o = ordered.find((a) => addonKey(a.addon, a.variant) === key)?.qty ?? 0;
  const c = confirmed.find((a) => addonKey(a.addon, a.variant) === key)?.qty ?? 0;
  return c > o;
}

export function requiresPriceApproval(
  orderedSize: LaundrySize,
  orderedAddons: OrderAddonLine[],
  confirmedSize: LaundrySize,
  confirmedAddons: OrderAddonLine[],
) {
  if (exceedsOrderedSize(orderedSize, confirmedSize)) return true;
  for (const a of confirmedAddons) {
    if (addonQtyExceeds(orderedAddons, confirmedAddons, a.addon, a.variant)) return true;
  }
  return false;
}

export function assertReadyForDroppedOff(row: OrderRow) {
  if (!row.pickup_confirmed_at) {
    throw new ApiError(409, "Kapıda boy ve fotoğraf onayı gerekli.", "PICKUP_REQUIRED");
  }
  if (row.price_change === "pending") {
    throw new ApiError(409, "Müşteri fiyat onayı bekleniyor.", "PRICE_PENDING");
  }
  if (row.price_change === "rejected") {
    throw new ApiError(409, "Müşteri fiyat değişikliğini reddetti.", "PRICE_REJECTED");
  }
  if (!row.pickup_summary_approved_at) {
    throw new ApiError(
      409,
      "Müşteri alım özetini onaylamadan çamaşır alınamaz.",
      "PICKUP_SUMMARY_REQUIRED",
    );
  }
}

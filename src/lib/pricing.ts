import { isoDateInIstanbul } from "./capacity/istanbul";
import { addonKey, machineUnitsFor, type LaundrySize, type OrderAddonLine } from "./laundryModel";
import type { PackageId } from "./types";

export const COMMISSION = 0.1;
export const EXPRESS_BUMP = 0.4;

/** Zam kısmı: total − round(total / 1.4). Geciken acilde müşteriye iade (K-010). */
export function expressBumpPortion(total: number): number {
  if (total <= 0) return 0;
  return total - Math.round(total / (1 + EXPRESS_BUMP));
}

export function isSameDayPickup(pickupDate: string, now = new Date()) {
  return pickupDate === isoDateInIstanbul(now);
}

/** Zam yalnız sipariş `express=true` iken. Aynı gün otomatik zam yok (K-008). */
export function resolveExpress(requested: boolean) {
  return Boolean(requested);
}

export type LaundryQuote = {
  total: number;
  before: number;
  commission: number;
  providerNet: number;
  subtotal: number;
  machineUnits: number;
  sizePrice: number;
  addonTotal: number;
};

export function quoteLaundry(input: {
  packageId: PackageId;
  size: LaundrySize;
  addons: OrderAddonLine[];
  express: boolean;
  sizePrice: number;
  addonUnitPrices: Record<string, number>;
}): LaundryQuote {
  const sizePrice = input.sizePrice;
  let addonTotal = 0;
  for (const a of input.addons) {
    if (a.qty < 1) continue;
    const key = addonKey(a.addon, a.variant);
    const unit = input.addonUnitPrices[key];
    if (unit == null) {
      throw new Error(`ADDON_PRICE:${key}`);
    }
    addonTotal += unit * a.qty;
  }
  const subtotal = sizePrice + addonTotal;
  const bumped = Math.round(subtotal * (input.express ? 1 + EXPRESS_BUMP : 1));
  const before = bumped;
  const total = Math.max(1, before);
  const commission = Math.round(total * COMMISSION);
  const machineUnits = machineUnitsFor(input.size, input.addons);
  return {
    total,
    before,
    commission,
    providerNet: total - commission,
    subtotal,
    machineUnits,
    sizePrice,
    addonTotal,
  };
}

export function tl(n: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(n);
}

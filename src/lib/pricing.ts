import { isoDateInIstanbul } from "./capacity/istanbul";
import { addonKey, machineUnitsFor, type LaundrySize, type OrderAddonLine } from "./laundryModel";
import type { PackageId } from "./types";

export const COMMISSION = 0.1;
export const EXPRESS_BUMP = 0.25;

/** Aynı gün alım: express zamı (+25%). */
export function isSameDayPickup(pickupDate: string, now = new Date()) {
  return pickupDate === isoDateInIstanbul(now);
}

export function resolveExpress(providerOffersExpress: boolean, pickupDate: string, now = new Date()) {
  return Boolean(providerOffersExpress && isSameDayPickup(pickupDate, now));
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

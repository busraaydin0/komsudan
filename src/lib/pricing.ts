import { addonKey, machineUnitsFor, type LaundrySize, type OrderAddonLine } from "./laundryModel";
import { effectiveLoyaltyRate } from "./loyalty";
import type { PackageId } from "./types";

export const COMMISSION = 0.1;
export const EXPRESS_BUMP = 0.25;

/** Pilot üst sınır (Büyük + ekler); asıl limit sağlayıcı max_units_per_order. */
export const MACHINE_UNITS_MAX = 80;

export function clampMachineUnits(n: number, maxPerOrder?: number) {
  const cap =
    maxPerOrder && maxPerOrder > 0 ? Math.min(MACHINE_UNITS_MAX, maxPerOrder) : MACHINE_UNITS_MAX;
  if (!Number.isFinite(n)) return 1;
  return Math.min(cap, Math.max(1, Math.round(n)));
}

/** Pilot slotlar “Bugün 18:00–19:00” / “Yarın …” — gün önekinden aynı gün. */
export function isSameDaySlot(slot: string) {
  return slot.trim().toLocaleLowerCase("tr-TR").startsWith("bugün");
}

/** Aynı gün zamı kutudan değil slottan: bugün seçildiyse +%25, yarınsa yok. */
export function resolveExpress(providerOffersExpress: boolean, slot: string) {
  return Boolean(providerOffersExpress && isSameDaySlot(slot));
}

export function pickSlotForDay(slots: string[], sameDay: boolean, fallback = "") {
  return slots.find((s) => isSameDaySlot(s) === sameDay) ?? fallback;
}

export type LaundryQuote = {
  total: number;
  before: number;
  loyaltyRate: number;
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
  loyaltyRate?: number;
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
  const rate = effectiveLoyaltyRate(input.loyaltyRate ?? 0);
  const before = bumped;
  const total = Math.max(1, Math.round(before * (1 - rate)));
  const commission = Math.round(total * COMMISSION);
  const machineUnits = machineUnitsFor(input.size, input.addons);
  return {
    total,
    before,
    loyaltyRate: rate,
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

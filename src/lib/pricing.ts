import { addonKey, machineUnitsFor, type LaundrySize, type OrderAddonLine } from "./laundryModel";
import { getAddonPrice, getSizePrice } from "./db/providerPrices";
import { effectiveLoyaltyRate } from "./loyalty";
import type { PackageId } from "./types";

export const COMMISSION = 0.1;
export const EXPRESS_BUMP = 0.25;

/** Kapasite: kalan makine birimi (providers.remaining). */
export const MACHINE_UNITS_MAX = 80;

export function clampMachineUnits(n: number, remaining?: number) {
  const cap = remaining && remaining > 0 ? Math.min(MACHINE_UNITS_MAX, remaining) : MACHINE_UNITS_MAX;
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

export function quoteForProviderOrder(
  providerId: string,
  packageId: PackageId,
  size: LaundrySize,
  addons: OrderAddonLine[],
  express: boolean,
  loyaltyRate = 0,
): LaundryQuote {
  const sizePrice = getSizePrice(providerId, packageId, size);
  if (sizePrice == null) {
    throw new Error("SIZE_PRICE");
  }
  const addonUnitPrices: Record<string, number> = {};
  for (const a of addons) {
    if (a.qty < 1) continue;
    const key = addonKey(a.addon, a.variant);
    if (addonUnitPrices[key] != null) continue;
    const p = getAddonPrice(providerId, a.addon, a.variant);
    if (p == null) throw new Error(`ADDON_PRICE:${key}`);
    addonUnitPrices[key] = p;
  }
  return quoteLaundry({
    packageId,
    size,
    addons,
    express,
    loyaltyRate,
    sizePrice,
    addonUnitPrices,
  });
}

export function tl(n: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(n);
}

import { PACKAGES } from "./data";
import { effectiveLoyaltyRate } from "./loyalty";
import type { PackageId, Provider } from "./types";

export const MIN_ORDER = 100;
export const COMMISSION = 0.1;
export const EXPRESS_BUMP = 0.25;

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
export const PIECES_MIN = 1;
export const PIECES_MAX = 80;

export function clampPieces(n: number, remaining?: number) {
  const cap = remaining && remaining > 0 ? Math.min(PIECES_MAX, remaining) : PIECES_MAX;
  if (!Number.isFinite(n)) return PIECES_MIN;
  return Math.min(cap, Math.max(PIECES_MIN, Math.round(n)));
}

export function estimate(pieces: number, packageId: PackageId, express: boolean, loyaltyRate = 0) {
  const base = PACKAGES.find((p) => p.id === packageId)?.pricePerPiece ?? 0;
  return quote(pieces, base, express, loyaltyRate);
}

export function estimateFor(
  provider: Provider,
  pieces: number,
  packageId: PackageId,
  express: boolean,
  loyaltyRate = 0,
) {
  const base =
    provider.packages.find((p) => p.id === packageId)?.pricePerPiece ??
    PACKAGES.find((p) => p.id === packageId)?.pricePerPiece ??
    0;
  return quote(pieces, base, express, loyaltyRate);
}

function quote(pieces: number, base: number, express: boolean, loyaltyRate = 0) {
  const raw = pieces * base * (express ? 1 + EXPRESS_BUMP : 1);
  const before = Math.max(MIN_ORDER, Math.round(raw));
  const rate = effectiveLoyaltyRate(loyaltyRate);
  const total = Math.max(1, Math.round(before * (1 - rate)));
  const commission = Math.round(total * COMMISSION);
  return {
    total,
    before,
    loyaltyRate: rate,
    commission,
    providerNet: total - commission,
    perPiece: base,
  };
}

export function tl(n: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(n);
}

import { PACKAGES } from "./data";
import type { PackageId } from "./types";

export const MIN_ORDER = 100;
export const COMMISSION = 0.1;
export const EXPRESS_BUMP = 0.25;

export function estimate(pieces: number, packageId: PackageId, express: boolean) {
  const base = PACKAGES.find((p) => p.id === packageId)?.pricePerPiece ?? 0;
  const raw = pieces * base * (express ? 1 + EXPRESS_BUMP : 1);
  const total = Math.max(MIN_ORDER, Math.round(raw));
  const commission = Math.round(total * COMMISSION);
  return { total, commission, providerNet: total - commission, perPiece: base };
}

export function tl(n: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(n);
}

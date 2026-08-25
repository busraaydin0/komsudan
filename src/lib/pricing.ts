import { PACKAGES } from "./data";
import type { PackageId, Provider } from "./types";

export const MIN_ORDER = 100;
export const COMMISSION = 0.1;
export const EXPRESS_BUMP = 0.25;

export function estimate(pieces: number, packageId: PackageId, express: boolean) {
  const base = PACKAGES.find((p) => p.id === packageId)?.pricePerPiece ?? 0;
  return quote(pieces, base, express);
}

export function estimateFor(
  provider: Provider,
  pieces: number,
  packageId: PackageId,
  express: boolean,
) {
  const base =
    provider.packages.find((p) => p.id === packageId)?.pricePerPiece ??
    PACKAGES.find((p) => p.id === packageId)?.pricePerPiece ??
    0;
  return quote(pieces, base, express);
}

function quote(pieces: number, base: number, express: boolean) {
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

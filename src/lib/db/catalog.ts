import { LAUNDRY_PACKAGES } from "@/lib/laundry/packages";
import type { Provider, ServicePackage } from "@/lib/types";
import { listPackages } from "./providers";

function laundryPackagesFor(providerId: string, fallback: ServicePackage[] | undefined): ServicePackage[] {
  const rows = listPackages(providerId);
  if (!rows.length) return fallback ?? [];
  return rows
    .map((row) => {
      const suffix = row.id.includes(":") ? row.id.slice(row.id.lastIndexOf(":") + 1) : row.id;
      const pack =
        LAUNDRY_PACKAGES.find((x) => x.id === suffix) ??
        LAUNDRY_PACKAGES.find((x) => x.title === row.name);
      if (!pack) return null;
      return { ...pack, pricePerPiece: row.price_per_kg };
    })
    .filter((x): x is ServicePackage => Boolean(x));
}

export function toProvider(row: { id: string; payload: string }): Provider {
  const p = JSON.parse(row.payload) as Provider;
  const { capacity: _legacyCap, ...restPayload } = p as Provider & { remaining?: number; capacity?: number };
  void _legacyCap;
  return {
    ...restPayload,
    id: row.id,
    workPhotos: p.workPhotos ?? [],
    avatarUrl: p.avatarUrl ?? null,
    recentReviews: p.recentReviews ?? [],
    packages: laundryPackagesFor(row.id, p.packages),
  };
}

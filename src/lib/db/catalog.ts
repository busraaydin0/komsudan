import { PACKAGES } from "@/lib/data";
import type { DropPoint, Provider, ServicePackage } from "@/lib/types";
import { listPackages } from "./providers";

function laundryPackagesFor(providerId: string, fallback: ServicePackage[] | undefined): ServicePackage[] {
  const rows = listPackages(providerId);
  if (!rows.length) return fallback ?? [];
  return rows
    .map((row) => {
      const suffix = row.id.includes(":") ? row.id.slice(row.id.lastIndexOf(":") + 1) : row.id;
      const pack = PACKAGES.find((x) => x.id === suffix) ?? PACKAGES.find((x) => x.title === row.name);
      if (!pack) return null;
      return { ...pack, pricePerPiece: row.price_per_kg };
    })
    .filter((x): x is ServicePackage => Boolean(x));
}

export function toProvider(row: {
  id: string;
  payload: string;
  remaining: number;
  category_id?: string | null;
}): Provider {
  const p = JSON.parse(row.payload) as Provider;
  const categoryId = row.category_id ?? p.categoryId ?? "camasir";
  return {
    ...p,
    id: row.id,
    remaining: row.remaining,
    workPhotos: p.workPhotos ?? [],
    avatarUrl: p.avatarUrl ?? null,
    recentReviews: p.recentReviews ?? [],
    categoryId,
    packages: laundryPackagesFor(row.id, p.packages),
  };
}

export function toDrop(row: { payload: string }): DropPoint {
  return JSON.parse(row.payload) as DropPoint;
}

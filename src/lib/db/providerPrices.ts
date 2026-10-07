import {
  ADDON_KINDS,
  ADDON_VARIANTS,
  assertPlatformAddonPrice,
  assertPlatformSizePrice,
  DEFAULT_ADDON_PRICES,
  defaultSizePricesFromLegacy,
  type AddonKind,
  type AddonVariant,
  type LaundrySize,
} from "@/lib/laundryModel";
import type { PackageId } from "@/lib/types";
import { db } from "./client";
import { listPackages } from "./providers";
import { LAUNDRY_PACKAGES } from "@/lib/laundry/packages";

export type ProviderPriceRow = {
  provider_id: string;
  package_id: string;
  size: LaundrySize;
  price: number;
};

export type ProviderAddonPriceRow = {
  provider_id: string;
  addon: AddonKind;
  variant: AddonVariant;
  price: number;
};

export function upsertProviderSizePrice(row: ProviderPriceRow) {
  assertPlatformSizePrice(row.package_id as PackageId, row.size, row.price);
  db()
    .prepare(
      `INSERT INTO provider_prices (provider_id, package_id, size, price)
       VALUES (@provider_id, @package_id, @size, @price)
       ON CONFLICT(provider_id, package_id, size) DO UPDATE SET price = excluded.price`,
    )
    .run(row);
}

export function upsertProviderAddonPrice(row: ProviderAddonPriceRow) {
  assertPlatformAddonPrice(row.addon, row.variant, row.price);
  db()
    .prepare(
      `INSERT INTO provider_addon_prices (provider_id, addon, variant, price)
       VALUES (@provider_id, @addon, @variant, @price)
       ON CONFLICT(provider_id, addon, variant) DO UPDATE SET price = excluded.price`,
    )
    .run(row);
}

export function getSizePrice(providerId: string, packageId: PackageId, size: LaundrySize): number | null {
  const row = db()
    .prepare(
      `SELECT price FROM provider_prices
       WHERE provider_id = ? AND package_id = ? AND size = ?`,
    )
    .get(providerId, packageId, size) as { price: number } | undefined;
  return row?.price ?? null;
}

export function getAddonPrice(
  providerId: string,
  addon: AddonKind,
  variant: AddonVariant,
): number | null {
  const row = db()
    .prepare(
      `SELECT price FROM provider_addon_prices
       WHERE provider_id = ? AND addon = ? AND variant = ?`,
    )
    .get(providerId, addon, variant) as { price: number } | undefined;
  return row?.price ?? null;
}

export function listSizePrices(providerId: string, packageId: PackageId): ProviderPriceRow[] {
  return db()
    .prepare(`SELECT * FROM provider_prices WHERE provider_id = ? AND package_id = ?`)
    .all(providerId, packageId) as ProviderPriceRow[];
}

export function listAddonPrices(providerId: string): ProviderAddonPriceRow[] {
  return db()
    .prepare(`SELECT * FROM provider_addon_prices WHERE provider_id = ?`)
    .all(providerId) as ProviderAddonPriceRow[];
}

export function listSizePricesForProviders(providerIds: string[]): ProviderPriceRow[] {
  if (providerIds.length === 0) return [];
  const ph = providerIds.map(() => "?").join(",");
  return db()
    .prepare(`SELECT * FROM provider_prices WHERE provider_id IN (${ph})`)
    .all(...providerIds) as ProviderPriceRow[];
}

export function listAddonPricesForProviders(providerIds: string[]): ProviderAddonPriceRow[] {
  if (providerIds.length === 0) return [];
  const ph = providerIds.map(() => "?").join(",");
  return db()
    .prepare(`SELECT * FROM provider_addon_prices WHERE provider_id IN (${ph})`)
    .all(...providerIds) as ProviderAddonPriceRow[];
}

/** Aktif paketler için eksik boy fiyatlarını doldur. */
export function ensureProviderPriceGrid(providerId: string) {
  const packs = listPackages(providerId);
  for (const row of packs) {
    const suffix = row.id.includes(":") ? row.id.slice(row.id.lastIndexOf(":") + 1) : row.id;
    const packId = suffix as PackageId;
    if (!LAUNDRY_PACKAGES.some((p) => p.id === packId)) continue;
    const existing = listSizePrices(providerId, packId);
    if (existing.length >= 3) continue;
    const legacy =
      row.price_per_kg ||
      LAUNDRY_PACKAGES.find((p) => p.id === packId)?.pricePerPiece ||
      12;
    const defaults = defaultSizePricesFromLegacy(packId, legacy);
    for (const size of ["kucuk", "orta", "buyuk"] as LaundrySize[]) {
      if (existing.some((e) => e.size === size)) continue;
      upsertProviderSizePrice({
        provider_id: providerId,
        package_id: packId,
        size,
        price: defaults[size],
      });
    }
  }
  const addons = listAddonPrices(providerId);
  if (addons.length >= 4) return;
  for (const addon of ADDON_KINDS) {
    for (const variant of ADDON_VARIANTS) {
      if (addons.some((a) => a.addon === addon && a.variant === variant)) continue;
      upsertProviderAddonPrice({
        provider_id: providerId,
        addon,
        variant,
        price: DEFAULT_ADDON_PRICES[`${addon}_${variant}`],
      });
    }
  }
}

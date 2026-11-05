import type { LaundryPackageId } from "./laundry/packages";
import type { PackageId } from "./types";

/** Yarım-makine birimi (tam sayı). Küçük ≈ ½, Orta ≈ 1, Büyük ≈ 2; 3–5 makine orta × adet. */
export const STORED_LAUNDRY_SIZES = ["kucuk", "orta", "buyuk"] as const;
export const EXTRA_MACHINE_SIZES = ["makine3", "makine4", "makine5"] as const;
export const LAUNDRY_SIZES = [...STORED_LAUNDRY_SIZES, ...EXTRA_MACHINE_SIZES] as const;
export type StoredLaundrySize = (typeof STORED_LAUNDRY_SIZES)[number];
export type ExtraMachineSize = (typeof EXTRA_MACHINE_SIZES)[number];
export type LaundrySize = (typeof LAUNDRY_SIZES)[number];

/** 5 makine = 10 yarım-makine birimi. Tek sipariş tavanı. */
export const MAX_ORDER_MACHINES = 5;
export const MAX_UNITS_PER_ORDER = MAX_ORDER_MACHINES * 2;

export const EXTRA_MACHINE_COUNT: Record<ExtraMachineSize, number> = {
  makine3: 3,
  makine4: 4,
  makine5: 5,
};

export const SIZE_MACHINE_UNITS: Record<LaundrySize, number> = {
  kucuk: 1,
  orta: 2,
  buyuk: 4,
  makine3: 6,
  makine4: 8,
  makine5: 10,
};

export const ADDON_KINDS = ["yorgan", "battaniye"] as const;
export type AddonKind = (typeof ADDON_KINDS)[number];

export const ADDON_VARIANTS = ["tek", "cift"] as const;
export type AddonVariant = (typeof ADDON_VARIANTS)[number];

/** Her ek (tek veya çift) 2 yarım-makine birimi = 1 makine. */
export const ADDON_MACHINE_UNITS = 2;

export type OrderAddonLine = {
  addon: AddonKind;
  variant: AddonVariant;
  qty: number;
};

export type PriceChangeStatus = "none" | "pending" | "approved" | "rejected";

export const SIZE_LABELS: Record<LaundrySize, { title: string; hint: string }> = {
  kucuk: { title: "Küçük", hint: "≈ yarım makine" },
  orta: { title: "Orta", hint: "≈ 1 makine" },
  buyuk: { title: "Büyük", hint: "≈ 2 makine" },
  makine3: { title: "3 makine", hint: "Orta boy × 3" },
  makine4: { title: "4 makine", hint: "Orta boy × 4" },
  makine5: { title: "5 makine", hint: "Orta boy × 5" },
};

export function isExtraMachineSize(size: string): size is ExtraMachineSize {
  return (EXTRA_MACHINE_SIZES as readonly string[]).includes(size);
}

export function extraMachineCount(size: LaundrySize): number | null {
  return isExtraMachineSize(size) ? EXTRA_MACHINE_COUNT[size] : null;
}

/** 3–5 makine: sağlayıcı orta boy fiyatı × makine sayısı. */
export function scaledSizePrice(ortaPrice: number, size: LaundrySize): number {
  const n = extraMachineCount(size);
  if (!n) return ortaPrice;
  return Math.round(ortaPrice * n);
}

export function resolveSizePrice(
  size: LaundrySize,
  stored: Partial<Record<LaundrySize, number>> | undefined,
): number | null {
  const direct = stored?.[size];
  if (direct != null) return direct;
  const n = extraMachineCount(size);
  if (!n) return null;
  const orta = stored?.orta;
  if (orta == null) return null;
  return scaledSizePrice(orta, size);
}

export function addonKey(addon: AddonKind, variant: AddonVariant) {
  return `${addon}_${variant}` as `${AddonKind}_${AddonVariant}`;
}

export function parseAddonKey(key: string): { addon: AddonKind; variant: AddonVariant } | null {
  const m = key.match(/^(yorgan|battaniye)_(tek|cift)$/);
  if (!m) return null;
  return { addon: m[1] as AddonKind, variant: m[2] as AddonVariant };
}

export function machineUnitsFor(size: LaundrySize, addons: OrderAddonLine[]) {
  let units = SIZE_MACHINE_UNITS[size];
  for (const a of addons) {
    if (a.qty < 1) continue;
    units += ADDON_MACHINE_UNITS * a.qty;
  }
  return units;
}

/** Boy sırası (kapıda yükseltme kontrolü). */
export function sizeRank(s: LaundrySize) {
  return LAUNDRY_SIZES.indexOf(s);
}

export function exceedsOrderedSize(ordered: LaundrySize, confirmed: LaundrySize) {
  return sizeRank(confirmed) > sizeRank(ordered);
}

const STORED_PLATFORM_SIZE_PRICE: Record<
  PackageId,
  Record<StoredLaundrySize, { min: number; max: number }>
> = {
  yikama: {
    kucuk: { min: 60, max: 220 },
    orta: { min: 90, max: 320 },
    buyuk: { min: 140, max: 480 },
  },
  katlama: {
    kucuk: { min: 80, max: 280 },
    orta: { min: 120, max: 420 },
    buyuk: { min: 180, max: 620 },
  },
  tam: {
    kucuk: { min: 110, max: 380 },
    orta: { min: 160, max: 520 },
    buyuk: { min: 240, max: 780 },
  },
};

function extraPlatformBand(orta: { min: number; max: number }, n: number) {
  return { min: orta.min * n, max: orta.max * n };
}

/** Platform fiyat aralığı (TRY, D-033). Sağlayıcı dışına çıkamaz. */
export const PLATFORM_SIZE_PRICE: Record<
  PackageId,
  Record<LaundrySize, { min: number; max: number }>
> = {
  yikama: {
    ...STORED_PLATFORM_SIZE_PRICE.yikama,
    makine3: extraPlatformBand(STORED_PLATFORM_SIZE_PRICE.yikama.orta, 3),
    makine4: extraPlatformBand(STORED_PLATFORM_SIZE_PRICE.yikama.orta, 4),
    makine5: extraPlatformBand(STORED_PLATFORM_SIZE_PRICE.yikama.orta, 5),
  },
  katlama: {
    ...STORED_PLATFORM_SIZE_PRICE.katlama,
    makine3: extraPlatformBand(STORED_PLATFORM_SIZE_PRICE.katlama.orta, 3),
    makine4: extraPlatformBand(STORED_PLATFORM_SIZE_PRICE.katlama.orta, 4),
    makine5: extraPlatformBand(STORED_PLATFORM_SIZE_PRICE.katlama.orta, 5),
  },
  tam: {
    ...STORED_PLATFORM_SIZE_PRICE.tam,
    makine3: extraPlatformBand(STORED_PLATFORM_SIZE_PRICE.tam.orta, 3),
    makine4: extraPlatformBand(STORED_PLATFORM_SIZE_PRICE.tam.orta, 4),
    makine5: extraPlatformBand(STORED_PLATFORM_SIZE_PRICE.tam.orta, 5),
  },
};

export const PLATFORM_ADDON_PRICE: Record<
  AddonKind,
  Record<AddonVariant, { min: number; max: number }>
> = {
  yorgan: {
    tek: { min: 70, max: 350 },
    cift: { min: 100, max: 480 },
  },
  battaniye: {
    tek: { min: 60, max: 320 },
    cift: { min: 90, max: 450 },
  },
};

export function assertPlatformSizePrice(packageId: LaundryPackageId, size: LaundrySize, price: number) {
  const b = PLATFORM_SIZE_PRICE[packageId]?.[size];
  if (!b || price < b.min || price > b.max) {
    throw new Error("PLATFORM_PRICE");
  }
}

export function assertPlatformAddonPrice(addon: AddonKind, variant: AddonVariant, price: number) {
  const b = PLATFORM_ADDON_PRICE[addon]?.[variant];
  if (!b || price < b.min || price > b.max) {
    throw new Error("PLATFORM_PRICE");
  }
}

/** Seed: eski parça fiyatından orta boy referansı. */
export function defaultSizePricesFromLegacy(packageId: PackageId, pricePerPiece: number) {
  const base = Math.round(Math.max(8, pricePerPiece) * 12);
  const clamp = (n: number, size: LaundrySize) => {
    const b = PLATFORM_SIZE_PRICE[packageId][size];
    return Math.min(b.max, Math.max(b.min, n));
  };
  return {
    kucuk: clamp(Math.round(base * 0.72), "kucuk"),
    orta: clamp(base, "orta"),
    buyuk: clamp(Math.round(base * 1.55), "buyuk"),
  };
}

export const DEFAULT_ADDON_PRICES: Record<`${AddonKind}_${AddonVariant}`, number> = {
  yorgan_tek: 95,
  yorgan_cift: 140,
  battaniye_tek: 85,
  battaniye_cift: 125,
};

/** Müşteri PWA metinleri ve teklif hesabı (çamaşır). */

import type { LaundrySize, OrderAddonLine } from "@/lib/laundryModel";
import { addonKey } from "@/lib/laundryModel";
import { quoteLaundry, resolveExpress, tl } from "@/lib/pricing";
import type { CreateOrderInput, PackageId, Provider } from "@/lib/types";

export const ZERO_QUOTE = {
  total: 0,
  before: 0,
  commission: 0,
  providerNet: 0,
  subtotal: 0,
  machineUnits: 0,
  sizePrice: 0,
  addonTotal: 0,
};

export function helloBlurb(): string {
  return "Eve kimse girmez. Çamaşırı kapında bırak.";
}

export function notePlaceholder(): string {
  return "Nevresim, leke, hassas kumaş, kapı kodu…";
}

export function listPrice(p: Provider): number | null {
  return p.packages.find((x) => x.id === "tam")?.pricePerPiece ?? p.packages.at(-1)?.pricePerPiece ?? null;
}

export function emptyCatalogCopy(): string | null {
  return null;
}

export function listEmptyPriceLabel(): string {
  return "paket yok";
}

export function listPricedTag(price: number): string {
  return `${tl(price)} / orta`;
}

export function continueCta(): string {
  return "Devam · boy ve teslimat";
}

export function checkoutBackLabel(): string {
  return "← Paket";
}

export function quoteForProvider(
  selected: Provider | undefined,
  args: {
    size: LaundrySize;
    addons: OrderAddonLine[];
    pkg: PackageId;
    pickupDate: string;
  },
) {
  if (!selected) return ZERO_QUOTE;
  const grid = selected.laundryPrices;
  if (!grid) return ZERO_QUOTE;
  const sizePrice = grid.sizes[args.pkg]?.[args.size];
  if (sizePrice == null) return ZERO_QUOTE;
  const express = resolveExpress(selected.express, args.pickupDate);
  try {
    const addonUnitPrices: Record<string, number> = {};
    for (const a of args.addons) {
      if (a.qty < 1) continue;
      const key = addonKey(a.addon, a.variant);
      const unit = grid.addons[key];
      if (unit == null) return ZERO_QUOTE;
      addonUnitPrices[key] = unit;
    }
    return quoteLaundry({
      packageId: args.pkg,
      size: args.size,
      addons: args.addons,
      express: express && selected.express,
      sizePrice,
      addonUnitPrices,
    });
  } catch {
    return ZERO_QUOTE;
  }
}

export function placeBlockReason(p: Provider, machineUnits?: number): string | null {
  if (!p.capacity?.configured) return "Bu komşu kapasite ayarını tamamlamadı.";
  if (machineUnits != null && machineUnits > p.capacity.maxUnitsPerOrder) {
    return "Bu boy ve ekler tek sipariş limitini aşıyor (BR-020).";
  }
  return null;
}

export function placeOrderInput(
  p: Provider,
  args: {
    note: string;
    pkg: PackageId;
    size: LaundrySize;
    addons: OrderAddonLine[];
    pickup: import("@/lib/types").AppointmentWindow;
    delivery: import("@/lib/types").AppointmentWindow;
  },
): CreateOrderInput {
  return {
    providerId: p.id,
    drop: "kapi",
    note: args.note,
    packageId: args.pkg,
    size: args.size,
    addons: args.addons,
    pickup: args.pickup,
    delivery: args.delivery,
  };
}

export function checkoutMeta(): { canPlace: boolean } {
  return { canPlace: true };
}

export function catalogOfferCount(p: Provider): number {
  return p.packages.length;
}

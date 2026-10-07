/** Müşteri PWA: çamaşır kayıt defterinden bakış yardımcıları. */

import { estimateFor, resolveExpress, tl } from "@/lib/pricing";
import type { CreateOrderInput, DropMethod, PackageId, Provider } from "@/lib/types";
import { CATEGORIES } from "./registry";

export const ZERO_QUOTE = {
  total: 0,
  before: 0,
  loyaltyRate: 0,
  commission: 0,
  providerNet: 0,
  perPiece: 0,
};

export function helloBlurb(): string {
  return CATEGORIES.camasir.offerBio || "Eve kimse girmez. Çamaşırı kapıda veya gel al noktasında bırak.";
}

export function notePlaceholder(): string {
  return "Nevresim, leke, hassas kumaş, kapı kodu…";
}

export function listPrice(p: Provider): number | null {
  return p.packages.find((x) => x.id === "tam")?.pricePerPiece ?? p.packages.at(-1)?.pricePerPiece ?? null;
}

export function listEmptyPriceLabel(): string {
  return "paket yok";
}

export function listPricedTag(price: number): string {
  return `${tl(price)}/${CATEGORIES.camasir.unitQty}`;
}

export function emptyCatalogCopy(): string | null {
  return null;
}

export function continueCta(): string {
  return "Devam · parça ve teslimat";
}

export function checkoutBackLabel(): string {
  return "← Paket";
}

export function quoteForProvider(
  selected: Provider | undefined,
  args: {
    pieces: number;
    pkg: PackageId;
    express: boolean;
    slot?: string;
  },
) {
  if (!selected) return ZERO_QUOTE;
  const express = resolveExpress(selected.express, args.slot ?? "");
  return estimateFor(selected, args.pieces, args.pkg, express && selected.express, 0);
}

export function placeBlockReason(p: Provider): string | null {
  if (p.categoryId && p.categoryId !== "camasir") return "Bu hizmet alanı şu an kapalı.";
  return null;
}

export function placeOrderInput(
  p: Provider,
  args: {
    drop: DropMethod;
    dropPointId: string | null;
    slot: string;
    note: string;
    pkg: PackageId;
    pieces: number;
    express: boolean;
  },
): CreateOrderInput {
  return {
    providerId: p.id,
    drop: args.drop,
    dropPointId: args.drop === "nokta" ? args.dropPointId : null,
    slot: args.slot ?? "",
    note: args.note,
    packageId: args.pkg,
    pieces: args.pieces,
    express: resolveExpress(p.express, args.slot),
  };
}

export function checkoutMeta(p: Provider): { drops: DropMethod[]; canPlace: boolean } {
  return {
    drops: p.drops,
    canPlace: !p.categoryId || p.categoryId === "camasir",
  };
}

export function catalogOfferCount(p: Provider): number {
  return p.packages.length;
}

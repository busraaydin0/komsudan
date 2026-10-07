/** Müşteri PWA: kategori kayıt defterinden türetilen bakış yardımcıları. JSX yok. */

import { estimateFor, resolveExpress, tl } from "@/lib/pricing";
import type { CreateOrderInput, DropMethod, PackageId, Provider } from "@/lib/types";
import { isCategoryId } from "./registry";

export const ZERO_QUOTE = {
  total: 0,
  before: 0,
  loyaltyRate: 0,
  commission: 0,
  providerNet: 0,
  perPiece: 0,
};

export type QtyUnit = { id: string; label: string; qty: string };

export type CatalogPick = Record<string, never>;

export function isUnitCatalog(_p: Pick<Provider, "categoryId">): boolean {
  return false;
}

export function catalogNames(_p: Provider): { id: string; name: string }[] {
  return [];
}

export function firstCatalogId(p: Provider): string | null {
  return catalogNames(p)[0]?.id ?? null;
}

export function hasCatalogId(p: Provider, id: string | null): boolean {
  if (!id) return false;
  return catalogNames(p).some((x) => x.id === id);
}

export function pickCatalog(_p: Provider, _productId: string | null): CatalogPick {
  return {};
}

export function selectedCatalogName(p: Provider, productId: string | null): string | undefined {
  return catalogNames(p).find((x) => x.id === productId)?.name ?? catalogNames(p)[0]?.name;
}

export function helloBlurb(_categoryIds?: string[]): string {
  return "Eve kimse girmez. Çamaşırı kapıda veya gel al noktasında bırak.";
}

export function notePlaceholder(_categoryId?: string): string {
  return "Nevresim, leke, hassas kumaş, kapı kodu…";
}

export function listPrice(p: Provider): number | null {
  return p.packages.find((x) => x.id === "tam")?.pricePerPiece ?? p.packages.at(-1)?.pricePerPiece ?? null;
}

export function listCatalogHint(_p: Provider): string {
  return "";
}

export function listEmptyPriceLabel(_p: Provider): string {
  return "paket yok";
}

export function listPricedTag(_p: Provider, price: number): string {
  return `${tl(price)}/parça`;
}

export function emptyCatalogCopy(_p: Provider): string | null {
  return null;
}

export function continueCta(_p: Provider): string {
  return "Devam · parça ve teslimat";
}

export function checkoutBackLabel(_p: Provider): string {
  return "← Paket";
}

export function selectedFallbackName(_p: Provider): string {
  return "Seçili paket";
}

export function quoteForProvider(
  selected: Provider | undefined,
  args: {
    guests: number;
    pieces: number;
    pkg: PackageId;
    express: boolean;
    slot?: string;
    loyaltyRate: number;
    pick: CatalogPick;
  },
) {
  if (!selected) return ZERO_QUOTE;
  const express = resolveExpress(selected.express, args.slot ?? "");
  return estimateFor(selected, args.pieces, args.pkg, express && selected.express, args.loyaltyRate);
}

export function placeBlockReason(_p: Provider, _pick: CatalogPick, _allergy: string): string | null {
  return null;
}

export function placeOrderInput(
  p: Provider,
  _pick: CatalogPick,
  args: {
    drop: DropMethod;
    dropPointId: string | null;
    slot: string;
    note: string;
    guests: number;
    allergy: string;
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

export type CheckoutMeta = {
  unit: QtyUnit;
  bounds: { min: number; max: number };
  drops: DropMethod[];
  unitPrice: number;
  canPlace: boolean;
  productId?: string;
};

const LAUNDRY_UNIT: QtyUnit = { id: "parca", label: "Parça", qty: "parça" };

export function checkoutMeta(p: Provider, _pick: CatalogPick): CheckoutMeta {
  return {
    unit: LAUNDRY_UNIT,
    bounds: { min: 1, max: Math.max(1, p.remaining) },
    drops: p.drops,
    unitPrice: 0,
    canPlace: true,
  };
}

export function applyQtyAndDrop(
  p: Provider,
  _productId: string | null,
  current: { guests: number; drop: DropMethod; pieces: number },
  clampPieces: (n: number, remaining: number) => number,
): { guests: number; drop: DropMethod; pieces: number } {
  return { ...current, pieces: clampPieces(current.pieces, p.remaining) };
}

export function catalogOfferCount(p: Provider): number {
  return p.packages.length;
}

export function isCategory(p: Pick<Provider, "categoryId">, id: string): boolean {
  return p.categoryId === id;
}

export function isKnownCategory(id: string | undefined): id is "camasir" {
  return isCategoryId(id);
}

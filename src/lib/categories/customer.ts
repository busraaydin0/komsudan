/** Müşteri PWA: kategori kayıt defterinden türetilen bakış yardımcıları. JSX yok. */

import { estimateFor, resolveExpress, tl } from "@/lib/pricing";
import type { CreateOrderInput, DropMethod, PackageId, Provider } from "@/lib/types";
import { CATEGORIES, clampPublicCategoryIds, isCategoryId } from "./registry";

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

function defFor(categoryId?: string | null) {
  return isCategoryId(categoryId) ? CATEGORIES[categoryId] : CATEGORIES.camasir;
}

export function isUnitCatalog(p: Pick<Provider, "categoryId">): boolean {
  return defFor(p.categoryId).catalogKey !== "packages";
}

export function catalogNames(p: Provider): { id: string; name: string }[] {
  if (defFor(p.categoryId).catalogKey === "packages") return [];
  return [];
}

export function firstCatalogId(p: Provider): string | null {
  return catalogNames(p)[0]?.id ?? null;
}

export function hasCatalogId(p: Provider, id: string | null): boolean {
  if (!id) return false;
  return catalogNames(p).some((x) => x.id === id);
}

export function pickCatalog(p: Provider, productId: string | null): CatalogPick {
  if (!productId || defFor(p.categoryId).catalogKey === "packages") return {};
  return {};
}

export function selectedCatalogName(p: Provider, productId: string | null): string | undefined {
  return catalogNames(p).find((x) => x.id === productId)?.name ?? catalogNames(p)[0]?.name;
}

export function helloBlurb(categoryIds?: string[]): string {
  const id = clampPublicCategoryIds(categoryIds)[0];
  return defFor(id).offerBio || "Eve kimse girmez. Çamaşırı kapıda veya gel al noktasında bırak.";
}

export function notePlaceholder(categoryId?: string): string {
  if (defFor(categoryId).id !== "camasir") return "";
  return "Nevresim, leke, hassas kumaş, kapı kodu…";
}

export function listPrice(p: Provider): number | null {
  return p.packages.find((x) => x.id === "tam")?.pricePerPiece ?? p.packages.at(-1)?.pricePerPiece ?? null;
}

export function listCatalogHint(p: Provider): string {
  if (defFor(p.categoryId).catalogKey === "packages") return "";
  return "";
}

export function listEmptyPriceLabel(p: Provider): string {
  return defFor(p.categoryId).catalogKey === "packages" ? "paket yok" : "paket yok";
}

export function listPricedTag(p: Provider, price: number): string {
  return `${tl(price)}/${defFor(p.categoryId).unitQty}`;
}

export function emptyCatalogCopy(p: Provider): string | null {
  if (defFor(p.categoryId).catalogKey === "packages") return null;
  return null;
}

export function continueCta(p: Provider): string {
  return defFor(p.categoryId).id === "camasir" ? "Devam · parça ve teslimat" : "Devam · parça ve teslimat";
}

export function checkoutBackLabel(p: Provider): string {
  return defFor(p.categoryId).catalogKey === "packages" ? "← Paket" : "← Paket";
}

export function selectedFallbackName(p: Provider): string {
  return defFor(p.categoryId).catalogKey === "packages" ? "Seçili paket" : "Seçili paket";
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
  void args.guests;
  void args.pick;
  const express = resolveExpress(selected.express, args.slot ?? "");
  return estimateFor(selected, args.pieces, args.pkg, express && selected.express, args.loyaltyRate);
}

export function placeBlockReason(p: Provider, pick: CatalogPick, allergy: string): string | null {
  if (defFor(p.categoryId).id !== "camasir") return "Bu hizmet alanı şu an kapalı.";
  void pick;
  void allergy;
  return null;
}

export function placeOrderInput(
  p: Provider,
  pick: CatalogPick,
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
  void pick;
  void args.guests;
  void args.allergy;
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

function laundryUnit(): QtyUnit {
  const qty = CATEGORIES.camasir.unitQty;
  return { id: "parca", label: "Parça", qty };
}

export function checkoutMeta(p: Provider, pick: CatalogPick): CheckoutMeta {
  void pick;
  return {
    unit: laundryUnit(),
    bounds: { min: 1, max: Math.max(1, p.remaining) },
    drops: p.drops,
    unitPrice: 0,
    canPlace: defFor(p.categoryId).id === "camasir",
  };
}

export function applyQtyAndDrop(
  p: Provider,
  productId: string | null,
  current: { guests: number; drop: DropMethod; pieces: number },
  clampPieces: (n: number, remaining: number) => number,
): { guests: number; drop: DropMethod; pieces: number } {
  void productId;
  return { ...current, pieces: clampPieces(current.pieces, p.remaining) };
}

export function catalogOfferCount(p: Provider): number {
  return defFor(p.categoryId).catalogKey === "packages" ? p.packages.length : p.packages.length;
}

export function isCategory(p: Pick<Provider, "categoryId">, id: string): boolean {
  return p.categoryId === id;
}

export function isKnownCategory(id: string | undefined): id is "camasir" {
  return isCategoryId(id);
}

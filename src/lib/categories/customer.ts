/** Müşteri PWA: kategori kayıt defterinden türetilen bakış yardımcıları. JSX yok. */

import { cargoCanOrder, cargoQtyBounds, CARGO_UNIT, dropsForCargo } from "@/lib/cargo";
import { carpetCanOrder, carpetQtyBounds, CARPET_UNIT, dropsForCarpet } from "@/lib/carpet";
import { courierCanOrder, courierQtyBounds, COURIER_UNIT, dropsForCourier } from "@/lib/courier";
import { dropsForFood, foodQtyBounds, foodUnitMeta } from "@/lib/food";
import { dropsForGarden, gardenCanOrder, gardenQtyBounds, GARDEN_UNIT } from "@/lib/garden";
import { dropsForGrave, graveCanOrder, graveQtyBounds, graveUnitMeta } from "@/lib/grave";
import { dropsForLesson, lessonCanOrder, lessonQtyBounds, LESSON_UNIT } from "@/lib/lesson";
import { estimateFood, estimateFor, resolveExpress, tl } from "@/lib/pricing";
import { dropsForPreserve, preserveCanOrder, preserveQtyBounds, preserveUnitMeta } from "@/lib/preserve";
import { dropsForPrint, printCanOrder, printQtyBounds, PRINT_UNIT } from "@/lib/print";
import { dropsForRepair, repairCanOrder, repairQtyBounds, repairUnitMeta } from "@/lib/repair";
import { dropsForSewing, sewingQtyBounds, sewingUnitMeta } from "@/lib/sewing";
import { dropsForTalk, talkCanOrder, talkQtyBounds, TALK_UNIT } from "@/lib/talk";
import { dropsForTech, techCanOrder, techQtyBounds, techUnitMeta } from "@/lib/tech";
import { dropsForWash, washCanOrder, washQtyBounds, WASH_UNIT } from "@/lib/wash";
import type {
  CreateOrderInput,
  DropMethod,
  PackageId,
  Provider,
  ProviderCargo,
  ProviderCarpet,
  ProviderCourier,
  ProviderGarden,
  ProviderGrave,
  ProviderLesson,
  ProviderPreserve,
  ProviderPrint,
  ProviderProduct,
  ProviderRepair,
  ProviderService,
  ProviderTalk,
  ProviderTech,
  ProviderWash,
} from "@/lib/types";
import { CATEGORIES, isCatalogCategoryId, isCategoryId, type CatalogCategoryId } from "./registry";

export const ZERO_QUOTE = {
  total: 0,
  before: 0,
  loyaltyRate: 0,
  commission: 0,
  providerNet: 0,
  perPiece: 0,
};

export type QtyUnit = { id: string; label: string; qty: string };

export type CatalogPick = {
  product?: ProviderProduct;
  service?: ProviderService;
  repair?: ProviderRepair;
  tech?: ProviderTech;
  wash?: ProviderWash;
  courier?: ProviderCourier;
  garden?: ProviderGarden;
  cargo?: ProviderCargo;
  print?: ProviderPrint;
  preserve?: ProviderPreserve;
  carpet?: ProviderCarpet;
  lesson?: ProviderLesson;
  talk?: ProviderTalk;
  grave?: ProviderGrave;
};

const HELLO: Record<CatalogCategoryId, string> = {
  davet: "Eve kimse girmez. Yemek kapıda veya nötr noktada teslim.",
  dikis: "Eve kimse girmez. Dikim kapıda, adresten veya noktada teslim.",
  tamir: "Eve kimse girmez. Tamir atölyede; kapıda, noktada veya yakın buluşmada teslim.",
  teknoloji: "Format ve kurulum atölyede veya yerinde; kapıda, noktada veya yerinde teslim.",
  araba: "Araç yıkanır yerinde; getir, al. Eve kimse girmez.",
  kurye: "Paket alınır, yakında bırakılır. Eve kimse girmez.",
  bahce: "İş bahçede yapılır; çim, budama, saksı. Eve kimse girmez.",
  kargo: "Şubeden al, noktaya veya adrese bırak. Eve kimse girmez.",
  cikti: "A4 çıktı evde basılır; adresten veya noktada al. Eve kimse girmez.",
  kislik: "Kışlık evde hazırlanır; adresten veya noktada al. Eve kimse girmez.",
  hali: "Halı evde yıkanmaz; adresten veya noktada al-ver. Eve kimse girmez.",
  odev: "Ödev eşliği verenin evinde, ortak alanda veya online. Eve kimse girmez.",
  dil: "Dil pratiği verenin evinde, ortak alanda veya online. Eve kimse girmez.",
  mezar: "Mezar bakımı mezarlıkta yapılır. Eve kimse girmez.",
};

const NOTE: Record<CatalogCategoryId, string> = {
  davet: "Kapı kodu, teslim notu…",
  dikis: "Ölçü, kumaş, kapı kodu…",
  tamir: "Arıza, marka, kapı kodu…",
  teknoloji: "Cihaz, model, kapı kodu…",
  araba: "Plaka, araç tipi, kapı kodu…",
  kurye: "Alıcı, kapı kodu, paket içeriği…",
  bahce: "Musluk, otopark, kapı kodu…",
  kargo: "Şube, fiş no, kapı kodu…",
  cikti: "Sayfa, renk, dosya adı…",
  kislik: "Kavanoz, alerji, teslim saati…",
  hali: "Leke, ebat, kapı kodu…",
  odev: "Sınıf, konu, platform…",
  dil: "Hedef, seviye, platform…",
  mezar: "Mezarlık, parsel, çiçek tercihi…",
};

function namedRows(p: Provider, key: CatalogCategoryId): { id: string; name: string }[] {
  const rows = p[CATEGORIES[key].catalogKey];
  if (!Array.isArray(rows)) return [];
  return rows as { id: string; name: string }[];
}

export function isUnitCatalog(p: Pick<Provider, "categoryId">): boolean {
  return isCatalogCategoryId(p.categoryId);
}

export function catalogNames(p: Provider): { id: string; name: string }[] {
  if (!isCatalogCategoryId(p.categoryId)) return [];
  return namedRows(p, p.categoryId);
}

export function firstCatalogId(p: Provider): string | null {
  return catalogNames(p)[0]?.id ?? null;
}

export function hasCatalogId(p: Provider, id: string | null): boolean {
  if (!id) return false;
  return catalogNames(p).some((x) => x.id === id);
}

function pick<T extends { id: string }>(rows: T[] | undefined, productId: string | null): T | undefined {
  return rows?.find((x) => x.id === productId) ?? rows?.[0];
}

export function pickCatalog(p: Provider, productId: string | null): CatalogPick {
  return {
    product: pick(p.products, productId),
    service: pick(p.services, productId),
    repair: pick(p.repairs, productId),
    tech: pick(p.techs, productId),
    wash: pick(p.washes, productId),
    courier: pick(p.couriers, productId),
    garden: pick(p.gardens, productId),
    cargo: pick(p.cargos, productId),
    print: pick(p.prints, productId),
    preserve: pick(p.preserves, productId),
    carpet: pick(p.carpets, productId),
    lesson: pick(p.lessons, productId),
    talk: pick(p.talks, productId),
    grave: pick(p.graves, productId),
  };
}

export function selectedCatalogName(p: Provider, productId: string | null): string | undefined {
  return catalogNames(p).find((x) => x.id === productId)?.name ?? catalogNames(p)[0]?.name;
}

export function helloBlurb(categoryIds?: string[]): string {
  if (categoryIds?.length === 1 && isCatalogCategoryId(categoryIds[0])) {
    return HELLO[categoryIds[0]];
  }
  return "Eve kimse girmez. Çamaşırı kapıda veya nötr noktada bırak.";
}

export function notePlaceholder(categoryId?: string): string {
  if (isCatalogCategoryId(categoryId)) return NOTE[categoryId];
  return "Nevresim, leke, hassas kumaş, kapı kodu…";
}

export function listPrice(p: Provider): number | null {
  const id = p.categoryId;
  if (id === "davet") {
    const prices = (p.products ?? []).map((x) => x.pricePerPerson);
    return prices.length ? Math.min(...prices) : null;
  }
  if (id === "dikis") {
    const prices = (p.services ?? []).map((x) => x.price);
    return prices.length ? Math.min(...prices) : null;
  }
  if (isCatalogCategoryId(id)) {
    const rows = p[CATEGORIES[id].catalogKey] as { price: number }[] | undefined;
    const prices = (rows ?? []).filter((x) => x.price > 0).map((x) => x.price);
    return prices.length ? Math.min(...prices) : null;
  }
  return p.packages.find((x) => x.id === "tam")?.pricePerPiece ?? p.packages.at(-1)?.pricePerPiece ?? null;
}

export function listCatalogHint(p: Provider): string {
  if (!isCatalogCategoryId(p.categoryId)) {
    return "";
  }
  const names = catalogNames(p).map((x) => x.name);
  if (p.categoryId === "davet") {
    return names.length ? ` · ${names.join(", ")}` : " · menü yok";
  }
  return names.length ? ` · ${names.join(", ")}` : " · hizmet yok";
}

export function listEmptyPriceLabel(p: Provider): string {
  if (p.categoryId === "tamir" || p.categoryId === "teknoloji") {
    const rows = p.categoryId === "tamir" ? p.repairs : p.techs;
    return (rows ?? []).length ? "inceleme" : "hizmet yok";
  }
  if (isCatalogCategoryId(p.categoryId) && p.categoryId !== "davet") return "hizmet yok";
  return "menü yok";
}

export function listPricedTag(p: Provider, price: number): string {
  const id = p.categoryId;
  if (id === "davet") return `${tl(price)}/kişi`;
  if (id === "araba") return `${tl(price)}/araç`;
  if (id === "cikti") return `${tl(price)}/sayfa`;
  if (id === "kislik") {
    const unit = preserveUnitMeta(
      (p.preserves ?? []).find((x) => x.price === price)?.priceUnit ?? (p.preserves ?? [])[0]?.priceUnit,
    );
    return `${tl(price)}/${unit.qty}`;
  }
  if (id === "hali") return `${tl(price)}/adet`;
  if (id === "odev") return `${tl(price)}/ders`;
  if (id === "dil") return `${tl(price)}/görüşme`;
  if (id === "mezar") {
    const unit = graveUnitMeta(
      (p.graves ?? []).find((x) => x.price === price)?.pricing ?? (p.graves ?? [])[0]?.pricing,
    );
    return `${tl(price)}/${unit.qty}`;
  }
  if (id === "kargo") {
    const mesafe = (p.cargos ?? []).some((x) => x.price > 0 && x.priceType === "mesafe");
    return mesafe ? `${tl(price)}'den` : `${tl(price)}/paket`;
  }
  if (id === "kurye" || id === "bahce") return `${tl(price)}'den`;
  if (id === "dikis" || id === "tamir" || id === "teknoloji") return `${tl(price)}'den`;
  return `${tl(price)}/parça`;
}

/** Checkout / ProviderPane birim fiyatlı katalog. */
export function emptyCatalogCopy(p: Provider): string | null {
  if (!isCatalogCategoryId(p.categoryId)) return null;
  if (catalogNames(p).length > 0) return null;
  return p.categoryId === "davet" ? "Bu komşu henüz menü eklemedi." : "Bu komşu henüz hizmet eklemedi.";
}

export function continueCta(p: Provider): string {
  if (p.categoryId === "davet") return "Devam · miktar ve alerji";
  if (isUnitCatalog(p)) return "Devam · miktar ve teslimat";
  return "Devam · parça ve teslimat";
}

export function checkoutBackLabel(p: Provider): string {
  if (p.categoryId === "davet") return "← Menü";
  if (isUnitCatalog(p)) return "← Hizmet";
  return "← Paket";
}

export function selectedFallbackName(p: Provider): string {
  return p.categoryId === "davet" ? "Seçili yemek" : "Seçili hizmet";
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
  const { guests, pieces, pkg, loyaltyRate, pick } = args;
  const express = resolveExpress(selected.express, args.slot ?? "");
  const id = selected.categoryId;
  if (id === "davet") {
    if (pick.product) return estimateFood(guests, pick.product.pricePerPerson, loyaltyRate);
    return estimateFor(selected, pieces, pkg, express && selected.express, loyaltyRate);
  }
  if (id === "dikis") {
    if (pick.service) return estimateFood(guests, pick.service.price, loyaltyRate);
    return estimateFor(selected, pieces, pkg, express && selected.express, loyaltyRate);
  }
  if (id === "tamir") {
    if (pick.repair && repairCanOrder(pick.repair)) return estimateFood(guests, pick.repair.price, loyaltyRate);
    return ZERO_QUOTE;
  }
  if (id === "teknoloji") {
    if (pick.tech && techCanOrder(pick.tech)) return estimateFood(guests, pick.tech.price, loyaltyRate);
    return ZERO_QUOTE;
  }
  if (id === "araba") {
    if (pick.wash && washCanOrder(pick.wash)) return estimateFood(guests, pick.wash.price, loyaltyRate);
    return ZERO_QUOTE;
  }
  if (id === "kurye") {
    if (pick.courier && courierCanOrder(pick.courier)) return estimateFood(guests, pick.courier.price, loyaltyRate);
    return ZERO_QUOTE;
  }
  if (id === "bahce") {
    if (pick.garden && gardenCanOrder(pick.garden)) return estimateFood(guests, pick.garden.price, loyaltyRate);
    return ZERO_QUOTE;
  }
  if (id === "kargo") {
    if (pick.cargo && cargoCanOrder(pick.cargo)) return estimateFood(guests, pick.cargo.price, loyaltyRate);
    return ZERO_QUOTE;
  }
  if (id === "cikti") {
    if (pick.print && printCanOrder(pick.print)) return estimateFood(guests, pick.print.price, loyaltyRate);
    return ZERO_QUOTE;
  }
  if (id === "kislik") {
    if (pick.preserve && preserveCanOrder(pick.preserve)) return estimateFood(guests, pick.preserve.price, loyaltyRate);
    return ZERO_QUOTE;
  }
  if (id === "hali") {
    if (pick.carpet && carpetCanOrder(pick.carpet)) return estimateFood(guests, pick.carpet.price, loyaltyRate);
    return ZERO_QUOTE;
  }
  if (id === "odev") {
    if (pick.lesson && lessonCanOrder(pick.lesson)) return estimateFood(guests, pick.lesson.price, loyaltyRate);
    return ZERO_QUOTE;
  }
  if (id === "dil") {
    if (pick.talk && talkCanOrder(pick.talk)) return estimateFood(guests, pick.talk.price, loyaltyRate);
    return ZERO_QUOTE;
  }
  if (id === "mezar") {
    if (pick.grave && graveCanOrder(pick.grave)) return estimateFood(guests, pick.grave.price, loyaltyRate);
    return ZERO_QUOTE;
  }
  return estimateFor(selected, pieces, pkg, express && selected.express, loyaltyRate);
}

export function placeBlockReason(p: Provider, pick: CatalogPick, allergy: string): string | null {
  if (p.categoryId === "davet" && !allergy.trim()) {
    return "Alerji durumunu yaz. Yoksa “yok” de.";
  }
  if (p.categoryId === "tamir" && !repairCanOrder(pick.repair)) {
    return "Bu iş için önce inceleme. Fiyat ürünü görünce netleşir.";
  }
  if (p.categoryId === "teknoloji" && !techCanOrder(pick.tech)) {
    return "Bu iş için önce inceleme. Fiyat cihazı görünce netleşir.";
  }
  const priced: [CatalogCategoryId, boolean][] = [
    ["araba", washCanOrder(pick.wash)],
    ["kurye", courierCanOrder(pick.courier)],
    ["bahce", gardenCanOrder(pick.garden)],
    ["kargo", cargoCanOrder(pick.cargo)],
    ["cikti", printCanOrder(pick.print)],
    ["kislik", preserveCanOrder(pick.preserve)],
    ["hali", carpetCanOrder(pick.carpet)],
    ["odev", lessonCanOrder(pick.lesson)],
    ["dil", talkCanOrder(pick.talk)],
    ["mezar", graveCanOrder(pick.grave)],
  ];
  for (const [id, ok] of priced) {
    if (p.categoryId === id && !ok) return "Bu hizmet için fiyat yok.";
  }
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
  const base = {
    providerId: p.id,
    drop: args.drop,
    dropPointId: args.drop === "nokta" ? args.dropPointId : null,
    slot: args.slot,
    note: args.note,
  };
  if (p.categoryId === "davet") {
    return { ...base, productId: pick.product?.id, guestCount: args.guests, allergyNote: args.allergy };
  }
  if (isCatalogCategoryId(p.categoryId)) {
    const ids: Record<string, string | undefined> = {
      dikis: pick.service?.id,
      tamir: pick.repair?.id,
      teknoloji: pick.tech?.id,
      araba: pick.wash?.id,
      kurye: pick.courier?.id,
      bahce: pick.garden?.id,
      kargo: pick.cargo?.id,
      cikti: pick.print?.id,
      kislik: pick.preserve?.id,
      hali: pick.carpet?.id,
      odev: pick.lesson?.id,
      dil: pick.talk?.id,
      mezar: pick.grave?.id,
    };
    return { ...base, productId: ids[p.categoryId], guestCount: args.guests };
  }
  return {
    ...base,
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

export function checkoutMeta(p: Provider, pick: CatalogPick): CheckoutMeta {
  const remaining = p.remaining;
  const laundryDrops = p.drops;
  switch (p.categoryId) {
    case "davet":
      return {
        unit: foodUnitMeta(pick.product?.priceUnit),
        bounds: foodQtyBounds(pick.product, remaining),
        drops: dropsForFood(pick.product, laundryDrops),
        unitPrice: pick.product?.pricePerPerson ?? 0,
        canPlace: true,
        productId: pick.product?.id,
      };
    case "dikis":
      return {
        unit: sewingUnitMeta(pick.service?.priceUnit),
        bounds: sewingQtyBounds(pick.service, remaining),
        drops: dropsForSewing(pick.service, laundryDrops),
        unitPrice: pick.service?.price ?? 0,
        canPlace: true,
        productId: pick.service?.id,
      };
    case "tamir":
      return {
        unit: repairUnitMeta(pick.repair?.priceUnit),
        bounds: repairQtyBounds(pick.repair, remaining),
        drops: dropsForRepair(pick.repair, laundryDrops),
        unitPrice: pick.repair?.price ?? 0,
        canPlace: repairCanOrder(pick.repair),
        productId: pick.repair?.id,
      };
    case "teknoloji":
      return {
        unit: techUnitMeta(pick.tech?.priceUnit),
        bounds: techQtyBounds(pick.tech, remaining),
        drops: dropsForTech(pick.tech, laundryDrops),
        unitPrice: pick.tech?.price ?? 0,
        canPlace: techCanOrder(pick.tech),
        productId: pick.tech?.id,
      };
    case "araba":
      return {
        unit: WASH_UNIT,
        bounds: washQtyBounds(pick.wash, remaining),
        drops: dropsForWash(pick.wash, laundryDrops),
        unitPrice: pick.wash?.price ?? 0,
        canPlace: washCanOrder(pick.wash),
        productId: pick.wash?.id,
      };
    case "kurye":
      return {
        unit: COURIER_UNIT,
        bounds: courierQtyBounds(pick.courier, remaining),
        drops: dropsForCourier(pick.courier, laundryDrops),
        unitPrice: pick.courier?.price ?? 0,
        canPlace: courierCanOrder(pick.courier),
        productId: pick.courier?.id,
      };
    case "bahce":
      return {
        unit: GARDEN_UNIT,
        bounds: gardenQtyBounds(pick.garden, remaining),
        drops: dropsForGarden(pick.garden, laundryDrops),
        unitPrice: pick.garden?.price ?? 0,
        canPlace: gardenCanOrder(pick.garden),
        productId: pick.garden?.id,
      };
    case "kargo":
      return {
        unit: CARGO_UNIT,
        bounds: cargoQtyBounds(pick.cargo, remaining),
        drops: dropsForCargo(pick.cargo, laundryDrops),
        unitPrice: pick.cargo?.price ?? 0,
        canPlace: cargoCanOrder(pick.cargo),
        productId: pick.cargo?.id,
      };
    case "cikti":
      return {
        unit: PRINT_UNIT,
        bounds: printQtyBounds(pick.print, remaining),
        drops: dropsForPrint(pick.print, laundryDrops),
        unitPrice: pick.print?.price ?? 0,
        canPlace: printCanOrder(pick.print),
        productId: pick.print?.id,
      };
    case "kislik":
      return {
        unit: preserveUnitMeta(pick.preserve?.priceUnit),
        bounds: preserveQtyBounds(pick.preserve, remaining),
        drops: dropsForPreserve(pick.preserve, laundryDrops),
        unitPrice: pick.preserve?.price ?? 0,
        canPlace: preserveCanOrder(pick.preserve),
        productId: pick.preserve?.id,
      };
    case "hali":
      return {
        unit: CARPET_UNIT,
        bounds: carpetQtyBounds(pick.carpet, remaining),
        drops: dropsForCarpet(pick.carpet, laundryDrops),
        unitPrice: pick.carpet?.price ?? 0,
        canPlace: carpetCanOrder(pick.carpet),
        productId: pick.carpet?.id,
      };
    case "odev":
      return {
        unit: LESSON_UNIT,
        bounds: lessonQtyBounds(pick.lesson, remaining),
        drops: dropsForLesson(pick.lesson, laundryDrops),
        unitPrice: pick.lesson?.price ?? 0,
        canPlace: lessonCanOrder(pick.lesson),
        productId: pick.lesson?.id,
      };
    case "dil":
      return {
        unit: TALK_UNIT,
        bounds: talkQtyBounds(pick.talk, remaining),
        drops: dropsForTalk(pick.talk, laundryDrops),
        unitPrice: pick.talk?.price ?? 0,
        canPlace: talkCanOrder(pick.talk),
        productId: pick.talk?.id,
      };
    case "mezar":
      return {
        unit: graveUnitMeta(pick.grave?.pricing),
        bounds: graveQtyBounds(pick.grave, remaining),
        drops: dropsForGrave(pick.grave, laundryDrops),
        unitPrice: pick.grave?.price ?? 0,
        canPlace: graveCanOrder(pick.grave),
        productId: pick.grave?.id,
      };
    default:
      return {
        unit: foodUnitMeta(undefined),
        bounds: foodQtyBounds(undefined, remaining),
        drops: laundryDrops,
        unitPrice: 0,
        canPlace: true,
      };
  }
}

export function applyQtyAndDrop(
  p: Provider,
  productId: string | null,
  current: { guests: number; drop: DropMethod; pieces: number },
  clampPieces: (n: number, remaining: number) => number,
): { guests: number; drop: DropMethod; pieces: number } {
  if (!isUnitCatalog(p)) {
    return { ...current, pieces: clampPieces(current.pieces, p.remaining) };
  }
  const meta = checkoutMeta(p, pickCatalog(p, productId));
  const guests = Math.min(meta.bounds.max, Math.max(meta.bounds.min, current.guests));
  const drop = meta.drops.includes(current.drop) ? current.drop : (meta.drops[0] ?? current.drop);
  return { ...current, guests, drop };
}

export function catalogOfferCount(p: Provider): number {
  if (!isUnitCatalog(p)) return p.packages.length;
  return catalogNames(p).length;
}

export function isCategory(p: Pick<Provider, "categoryId">, id: string): boolean {
  return p.categoryId === id;
}

export function isKnownCategory(id: string | undefined): id is CatalogCategoryId | "camasir" {
  return isCategoryId(id);
}

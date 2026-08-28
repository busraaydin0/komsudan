import type {
  DropMethod,
  GraveAvail,
  GraveFee,
  GraveFlower,
  GraveKind,
  GravePhotoSend,
  GravePrice,
  ProviderGrave,
} from "./types";

export const GRAVE_KINDS: { id: keyof GraveKind; label: string }[] = [
  { id: "temizlik", label: "Mezar temizliği" },
  { id: "cicek", label: "Çiçeklendirme" },
  { id: "sulama", label: "Çiçek sulama" },
  { id: "ot", label: "Yabani ot temizliği" },
  { id: "cevre", label: "Mezar çevresi temizliği" },
  { id: "ziyaret", label: "Mezar ziyareti & fotoğraf gönderme" },
  { id: "other", label: "Diğer" },
];

export const GRAVE_PRICES: { id: keyof GravePrice; label: string }[] = [
  { id: "visit", label: "Ziyaret başına" },
  { id: "job", label: "İşlem başına" },
  { id: "monthly", label: "Aylık" },
  { id: "other", label: "Diğer" },
];

export const GRAVE_FLOWERS: { id: keyof GraveFlower; label: string }[] = [
  { id: "customer", label: "Müşteri seçer" },
  { id: "provider", label: "Hizmet veren seçer" },
  { id: "together", label: "Birlikte belirlenir" },
];

export const GRAVE_FEES: { id: keyof GraveFee; label: string }[] = [
  { id: "included", label: "Fiyata dahil" },
  { id: "extra", label: "Fiyata dahil değil" },
];

export const GRAVE_PHOTOS: { id: keyof GravePhotoSend; label: string }[] = [
  { id: "beforeAfter", label: "İşlem öncesi ve sonrası fotoğraf" },
  { id: "after", label: "İşlem sonrası fotoğraf" },
  { id: "none", label: "Fotoğraf gönderilmiyor" },
];

export const GRAVE_AVAILS: { id: keyof GraveAvail; label: string }[] = [
  { id: "once", label: "Tek seferlik" },
  { id: "weekly", label: "Haftalık" },
  { id: "monthly", label: "Aylık" },
  { id: "days", label: "Belirli günlerde" },
];

export function graveUnitMeta(price?: GravePrice | null) {
  if (price?.monthly && !price.visit && !price.job) {
    return { id: "ay" as const, label: "Ay", qty: "ay" };
  }
  if (price?.visit && !price.job && !price.monthly) {
    return { id: "ziyaret" as const, label: "Ziyaret", qty: "ziyaret" };
  }
  return { id: "islem" as const, label: "İşlem", qty: "işlem" };
}

export function graveKindList(k?: GraveKind | null) {
  if (!k) return [];
  return GRAVE_KINDS.filter((row) => k[row.id]).map((row) => row.label);
}

export function gravePriceList(p?: GravePrice | null) {
  if (!p) return [];
  return GRAVE_PRICES.filter((row) => p[row.id]).map((row) => row.label);
}

export function graveFlowerList(f?: GraveFlower | null) {
  if (!f) return [];
  return GRAVE_FLOWERS.filter((row) => f[row.id]).map((row) => row.label);
}

export function graveFeeList(f?: GraveFee | null) {
  if (!f) return [];
  return GRAVE_FEES.filter((row) => f[row.id]).map((row) => row.label);
}

export function gravePhotoList(p?: GravePhotoSend | null) {
  if (!p) return [];
  return GRAVE_PHOTOS.filter((row) => p[row.id]).map((row) => row.label);
}

export function graveAvailList(a?: GraveAvail | null) {
  if (!a) return [];
  return GRAVE_AVAILS.filter((row) => a[row.id]).map((row) => row.label);
}

export function graveCanOrder(c?: Pick<ProviderGrave, "price"> | null) {
  return Boolean(c && c.price > 0);
}

export function graveQtyBounds(_c?: Pick<ProviderGrave, "price"> | null, remaining?: number) {
  const min = 1;
  let max = 20;
  if (remaining && remaining > 0) max = Math.min(max, remaining);
  if (max < min) max = min;
  return { min, max };
}

export function graveDurationLabel(min?: number | null) {
  if (min == null || min < 0) return "";
  if (min === 0) return "hemen";
  if (min < 60) return `${min} dakika`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (m === 0) return h === 1 ? "1 saat" : `${h} saat`;
  return `${h} saat ${m} dk`;
}

export function dropsForGrave(_card: unknown, providerDrops: DropMethod[]) {
  return providerDrops;
}

export function graveDropLabel(d: DropMethod) {
  return d === "nokta" ? "Belirlenen nokta" : "Mezarlıkta (yerinde)";
}

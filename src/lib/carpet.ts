import type {
  CarpetClean,
  CarpetKind,
  CarpetPickup,
  CarpetSize,
  DropMethod,
  ProviderCarpet,
} from "./types";

export const CARPET_KINDS: { id: keyof CarpetKind; label: string }[] = [
  { id: "hali", label: "Halı" },
  { id: "kilim", label: "Kilim" },
  { id: "yolluk", label: "Yolluk" },
  { id: "other", label: "Diğer" },
];

export const CARPET_SIZES: { id: keyof CarpetSize; label: string }[] = [
  { id: "kucuk", label: "Küçük" },
  { id: "orta", label: "Orta" },
  { id: "buyuk", label: "Büyük" },
  { id: "xl", label: "Çok Büyük" },
];

export const CARPET_CLEANS: { id: keyof CarpetClean; label: string }[] = [
  { id: "genel", label: "Genel yıkama" },
  { id: "leke", label: "Leke çıkarma" },
  { id: "koku", label: "Koku giderme" },
  { id: "ozel", label: "Özel temizlik" },
];

export const CARPET_PICKUPS: { id: keyof CarpetPickup; label: string }[] = [
  { id: "adres", label: "Hizmet verenin adresinden" },
  { id: "nokta", label: "Belirlenen yakın noktadan" },
];

export const CARPET_UNIT = { id: "adet" as const, label: "Adet", qty: "adet" };

export function carpetKindList(k?: CarpetKind | null) {
  if (!k) return [];
  return CARPET_KINDS.filter((row) => k[row.id]).map((row) => row.label);
}

export function carpetSizeList(s?: CarpetSize | null) {
  if (!s) return [];
  return CARPET_SIZES.filter((row) => s[row.id]).map((row) => row.label);
}

export function carpetCleanList(c?: CarpetClean | null) {
  if (!c) return [];
  return CARPET_CLEANS.filter((row) => c[row.id]).map((row) => row.label);
}

export function carpetPickupList(p?: CarpetPickup | null) {
  if (!p) return [];
  return CARPET_PICKUPS.filter((row) => p[row.id]).map((row) => row.label);
}

export function carpetCanOrder(c?: Pick<ProviderCarpet, "price"> | null) {
  return Boolean(c && c.price > 0);
}

export function carpetQtyBounds(c?: Pick<ProviderCarpet, "minOrder"> | null, remaining?: number) {
  const min = Math.max(1, c?.minOrder ?? 1);
  let max = 40;
  if (remaining && remaining > 0) max = Math.min(max, remaining);
  if (max < min) max = min;
  return { min, max };
}

export function carpetDaysLabel(days?: number | null, suffix = "") {
  if (days == null || days < 0) return "";
  if (days === 0) return suffix ? `aynı gün${suffix}` : "aynı gün";
  const body = days === 1 ? "1 gün" : `${days} gün`;
  return suffix ? `${body}${suffix}` : body;
}

export function dropsForCarpet(card: Pick<ProviderCarpet, "pickup"> | undefined, providerDrops: DropMethod[]) {
  if (!card) return providerDrops;
  const want: DropMethod[] = [];
  if (card.pickup.adres) want.push("kapi");
  if (card.pickup.nokta) want.push("nokta");
  const hit = want.filter((d) => providerDrops.includes(d));
  return hit.length ? hit : want.length ? want : providerDrops;
}

export function carpetDropLabel(d: DropMethod) {
  return d === "nokta" ? "Belirlenen yakın noktadan" : "Verenin adresinden";
}

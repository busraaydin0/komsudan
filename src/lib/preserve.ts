import type {
  DropMethod,
  PreserveKind,
  PreserveMaterial,
  PreservePickup,
  PreservePriceUnit,
  PreserveStorage,
  ProviderPreserve,
} from "./types";

export const PRESERVE_KINDS: { id: keyof PreserveKind; label: string }[] = [
  { id: "salca", label: "Salça" },
  { id: "tarhana", label: "Tarhana" },
  { id: "eriste", label: "Erişte" },
  { id: "manti", label: "Mantı" },
  { id: "sarma", label: "Sarma / Dolma" },
  { id: "dondurucu", label: "Dondurucu hazırlığı" },
  { id: "other", label: "Diğer" },
];

export const PRESERVE_MATERIALS: { id: PreserveMaterial; label: string }[] = [
  { id: "provider", label: "Hizmet veren sağlar" },
  { id: "customer", label: "Müşteri sağlar" },
  { id: "together", label: "Birlikte belirlenir" },
];

export const PRESERVE_PRICE_UNITS: { id: PreservePriceUnit; label: string; qty: string }[] = [
  { id: "kg", label: "Kg", qty: "kg" },
  { id: "porsiyon", label: "Porsiyon", qty: "porsiyon" },
  { id: "paket", label: "Paket", qty: "paket" },
  { id: "tepsi", label: "Tepsi", qty: "tepsi" },
  { id: "adet", label: "Adet", qty: "adet" },
];

export const PRESERVE_STORAGES: { id: keyof PreserveStorage; label: string }[] = [
  { id: "frozen", label: "Dondurulmuş teslim" },
  { id: "fresh", label: "Taze teslim" },
  { id: "dried", label: "Kurutulmuş teslim" },
  { id: "jarred", label: "Kavanozlanmış teslim" },
];

export const PRESERVE_PICKUPS: { id: keyof PreservePickup; label: string }[] = [
  { id: "adres", label: "Hizmet verenin adresinden" },
  { id: "nokta", label: "Yakın noktada buluşma" },
];

export function preserveKindList(k?: PreserveKind | null) {
  if (!k) return [];
  return PRESERVE_KINDS.filter((row) => k[row.id]).map((row) => row.label);
}

export function preserveStorageList(s?: PreserveStorage | null) {
  if (!s) return [];
  return PRESERVE_STORAGES.filter((row) => s[row.id]).map((row) => row.label);
}

export function preservePickupList(p?: PreservePickup | null) {
  if (!p) return [];
  return PRESERVE_PICKUPS.filter((row) => p[row.id]).map((row) => row.label);
}

export function preserveMaterialLabel(id?: PreserveMaterial | null) {
  return PRESERVE_MATERIALS.find((m) => m.id === id)?.label ?? "";
}

export function preserveUnitMeta(id?: PreservePriceUnit | null) {
  return PRESERVE_PRICE_UNITS.find((u) => u.id === id) ?? PRESERVE_PRICE_UNITS[0];
}

export function preserveCanOrder(c?: Pick<ProviderPreserve, "price"> | null) {
  return Boolean(c && c.price > 0);
}

export function preserveQtyBounds(c?: Pick<ProviderPreserve, "minOrder"> | null, remaining?: number) {
  const min = Math.max(1, c?.minOrder ?? 1);
  let max = 80;
  if (remaining && remaining > 0) max = Math.min(max, remaining);
  if (max < min) max = min;
  return { min, max };
}

export function preserveDaysLabel(days?: number | null, suffix = "") {
  if (days == null || days < 0) return "";
  if (days === 0) return suffix ? `aynı gün${suffix}` : "aynı gün";
  const body = days === 1 ? "1 gün" : `${days} gün`;
  return suffix ? `${body}${suffix}` : body;
}

export function dropsForPreserve(card: Pick<ProviderPreserve, "pickup"> | undefined, providerDrops: DropMethod[]) {
  if (!card) return providerDrops;
  const want: DropMethod[] = [];
  if (card.pickup.adres) want.push("kapi");
  if (card.pickup.nokta) want.push("nokta");
  const hit = want.filter((d) => providerDrops.includes(d));
  return hit.length ? hit : want.length ? want : providerDrops;
}

export function preserveDropLabel(d: DropMethod) {
  return d === "nokta" ? "Yakın noktada buluşma" : "Verenin adresinden";
}

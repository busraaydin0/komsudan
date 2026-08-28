import type {
  DropMethod,
  ProviderRepair,
  RepairDelivery,
  RepairJob,
  RepairKind,
  RepairParts,
  RepairPriceType,
  RepairPriceUnit,
  RepairQuoteFrom,
} from "./types";

export const REPAIR_KINDS: { id: RepairKind; label: string }[] = [
  { id: "elektronik", label: "Elektronik" },
  { id: "ev", label: "Ev Eşyası" },
  { id: "mobilya", label: "Mobilya" },
  { id: "bisiklet", label: "Bisiklet" },
  { id: "oyuncak", label: "Oyuncak" },
  { id: "aksesuar", label: "Aksesuar" },
  { id: "diger", label: "Diğer" },
];

export const REPAIR_JOBS: { id: RepairJob; label: string }[] = [
  { id: "onarim", label: "Onarım" },
  { id: "parca", label: "Parça Değişimi" },
  { id: "montaj", label: "Montaj" },
  { id: "bakim", label: "Bakım" },
  { id: "temizlik", label: "Temizlik" },
  { id: "diger", label: "Diğer" },
];

export const REPAIR_PRICE_TYPES: { id: RepairPriceType; label: string }[] = [
  { id: "sabit", label: "Sabit fiyat" },
  { id: "baslangic", label: "Başlangıç fiyatı" },
  { id: "inceleme", label: "İnceleme sonrası fiyat" },
];

export const REPAIR_PRICE_UNITS: { id: RepairPriceUnit; label: string; qty: string }[] = [
  { id: "adet", label: "Adet", qty: "adet" },
  { id: "parca", label: "Parça", qty: "parça" },
  { id: "urun", label: "Ürün", qty: "ürün" },
  { id: "saat", label: "Saat", qty: "saat" },
  { id: "is", label: "İş", qty: "iş" },
];

export const REPAIR_PARTS: { id: RepairParts; label: string }[] = [
  { id: "included", label: "Parça fiyata dahil" },
  { id: "extra", label: "Parça hariç" },
  { id: "customer", label: "Müşteri parçasını getirir" },
  { id: "either", label: "Duruma göre değişir" },
];

export const REPAIR_DELIVERIES: { id: keyof RepairDelivery; label: string }[] = [
  { id: "adres", label: "Hizmet verenin adresinden teslim" },
  { id: "nokta", label: "Belirlenen teslim noktası" },
  { id: "yakin", label: "Yakın noktada buluşma" },
];

export const REPAIR_QUOTES: { id: RepairQuoteFrom; label: string }[] = [
  { id: "photo", label: "Fotoğrafa göre yaklaşık fiyat verebilirim" },
  { id: "seen", label: "Ürünü gördükten sonra fiyat belirlerim" },
];

export function repairKindLabel(id?: RepairKind | null) {
  return REPAIR_KINDS.find((c) => c.id === id)?.label ?? "";
}

export function repairJobLabel(id?: RepairJob | null) {
  return REPAIR_JOBS.find((c) => c.id === id)?.label ?? "";
}

export function repairPriceTypeLabel(id?: RepairPriceType | null) {
  return REPAIR_PRICE_TYPES.find((c) => c.id === id)?.label ?? "";
}

export function repairUnitMeta(id?: RepairPriceUnit | null) {
  return REPAIR_PRICE_UNITS.find((u) => u.id === id) ?? REPAIR_PRICE_UNITS[0];
}

export function repairPartsLabel(id?: RepairParts | null) {
  return REPAIR_PARTS.find((p) => p.id === id)?.label ?? "";
}

export function repairQuoteLabel(id?: RepairQuoteFrom | null) {
  return REPAIR_QUOTES.find((q) => q.id === id)?.label ?? "";
}

export function repairCanOrder(r?: Pick<ProviderRepair, "price" | "priceType"> | null) {
  if (!r) return false;
  if (r.priceType === "inceleme" && r.price <= 0) return false;
  return r.price > 0;
}

export function repairQtyBounds(
  r?: Pick<ProviderRepair, "maxPerWeek"> | null,
  remaining?: number,
) {
  const min = 1;
  let max = Math.min(80, r?.maxPerWeek ?? 80);
  if (remaining && remaining > 0) max = Math.min(max, remaining);
  if (max < min) max = min;
  return { min, max };
}

export function repairLeadLabel(days?: number | null) {
  if (days == null || days < 0) return "";
  if (days === 0) return "aynı gün";
  return days === 1 ? "1 gün" : `${days} gün`;
}

export function dropsForRepair(
  repair: Pick<ProviderRepair, "delivery"> | undefined,
  providerDrops: DropMethod[],
) {
  if (!repair) return providerDrops;
  const want: DropMethod[] = [];
  if (repair.delivery.nokta) want.push("nokta");
  if (repair.delivery.adres || repair.delivery.yakin) want.push("kapi");
  const hit = want.filter((d) => providerDrops.includes(d));
  return hit.length ? hit : want.length ? want : providerDrops;
}

export function repairDropLabel(d: DropMethod, delivery?: RepairDelivery) {
  if (d === "nokta") return "Belirlenen teslim noktası";
  if (!delivery) return "Kapı";
  if (delivery.adres && delivery.yakin) return "Adresinden / yakın buluşma";
  if (delivery.adres) return "Hizmet verenin adresinden teslim";
  if (delivery.yakin) return "Yakın noktada buluşma";
  return "Kapı";
}

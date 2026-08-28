import type {
  DropMethod,
  ProviderService,
  SewingDelivery,
  SewingMaterial,
  SewingPriceUnit,
  SewingSubcategory,
} from "./types";

export const SEWING_SUBCATEGORIES: { id: SewingSubcategory; label: string }[] = [
  { id: "kiyafet", label: "Kıyafet Tadilatı" },
  { id: "tamir", label: "Tamir" },
  { id: "ozel", label: "Özel Dikim" },
  { id: "tekstil", label: "Ev Tekstili" },
  { id: "diger", label: "Diğer" },
];

export const SEWING_PRICE_UNITS: { id: SewingPriceUnit; label: string; qty: string }[] = [
  { id: "adet", label: "Adet", qty: "adet" },
  { id: "cift", label: "Çift", qty: "çift" },
  { id: "metre", label: "Metre", qty: "metre" },
  { id: "kg", label: "Kg", qty: "kg" },
  { id: "parca", label: "Parça", qty: "parça" },
  { id: "saat", label: "Saat", qty: "saat" },
  { id: "proje", label: "Proje", qty: "proje" },
];

export const SEWING_DELIVERIES: { id: keyof SewingDelivery; label: string }[] = [
  { id: "adres", label: "Hizmet verenin adresinden teslim" },
  { id: "nokta", label: "Belirlenen teslim noktası" },
  { id: "yakin", label: "Yakın mesafede teslimat" },
];

export const SEWING_MATERIALS: { id: SewingMaterial; label: string }[] = [
  { id: "customer", label: "Müşteri getirir" },
  { id: "provider", label: "Hizmet veren sağlar" },
  { id: "either", label: "Duruma göre değişir" },
];

export function sewingSubcategoryLabel(id?: SewingSubcategory | null) {
  return SEWING_SUBCATEGORIES.find((c) => c.id === id)?.label ?? "";
}

export function sewingUnitMeta(id?: SewingPriceUnit | null) {
  return SEWING_PRICE_UNITS.find((u) => u.id === id) ?? SEWING_PRICE_UNITS[0];
}

export function sewingMaterialLabel(id?: SewingMaterial | null) {
  return SEWING_MATERIALS.find((m) => m.id === id)?.label ?? "";
}

export function sewingQtyBounds(
  s?: Pick<ProviderService, "minOrder" | "maxPerWeek"> | null,
  remaining?: number,
) {
  const min = Math.max(1, s?.minOrder ?? 1);
  let max = Math.min(80, s?.maxPerWeek ?? 80);
  if (remaining && remaining > 0) max = Math.min(max, remaining);
  if (max < min) max = min;
  return { min, max };
}

export function sewingLeadLabel(days?: number | null) {
  if (days == null || days < 0) return "";
  if (days === 0) return "aynı gün";
  return days === 1 ? "1 gün" : `${days} gün`;
}

export function dropsForSewing(
  service: Pick<ProviderService, "delivery"> | undefined,
  providerDrops: DropMethod[],
) {
  if (!service) return providerDrops;
  const want: DropMethod[] = [];
  if (service.delivery.nokta) want.push("nokta");
  if (service.delivery.adres || service.delivery.yakin) want.push("kapi");
  const hit = want.filter((d) => providerDrops.includes(d));
  return hit.length ? hit : want.length ? want : providerDrops;
}

export function sewingDropLabel(d: DropMethod, delivery?: SewingDelivery) {
  if (d === "nokta") return "Belirlenen teslim noktası";
  if (!delivery) return "Kapı";
  if (delivery.adres && delivery.yakin) return "Adresinden / yakın teslimat";
  if (delivery.adres) return "Hizmet verenin adresinden teslim";
  if (delivery.yakin) return "Yakın mesafede teslimat";
  return "Kapı";
}

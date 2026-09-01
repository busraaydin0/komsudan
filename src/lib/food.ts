import type { DropMethod, FoodCategory, FoodDelivery, FoodPriceUnit, ProviderProduct } from "./types";

export const FOOD_CATEGORIES: { id: FoodCategory; label: string }[] = [
  { id: "kisir", label: "Kısır" },
  { id: "pasta", label: "Pasta" },
  { id: "kurabiye", label: "Kurabiye" },
  { id: "borek", label: "Börek" },
  { id: "salata", label: "Salata" },
  { id: "tatli", label: "Tatlı" },
  { id: "diger", label: "Diğer" },
];

export const FOOD_PRICE_UNITS: { id: FoodPriceUnit; label: string; qty: string }[] = [
  { id: "porsiyon", label: "porsiyon", qty: "porsiyon" },
  { id: "kg", label: "kg", qty: "kg" },
  { id: "adet", label: "adet", qty: "adet" },
  { id: "tepsi", label: "tepsi", qty: "tepsi" },
  { id: "kisi", label: "kişi", qty: "kişi" },
];

export const FOOD_DELIVERIES: { id: FoodDelivery; label: string }[] = [
  { id: "kapi", label: "Kapı" },
  { id: "nokta", label: "Gel al noktası" },
  { id: "ikisi", label: "İkisi" },
];

export const FOOD_LEAD_PRESETS = [
  { hours: 2, label: "2 saat" },
  { hours: 4, label: "4 saat" },
  { hours: 12, label: "12 saat" },
  { hours: 24, label: "1 gün" },
  { hours: 48, label: "2 gün" },
];

export function foodCategoryLabel(id?: FoodCategory | null) {
  return FOOD_CATEGORIES.find((c) => c.id === id)?.label ?? "";
}

export function foodUnitMeta(id?: FoodPriceUnit | null) {
  return FOOD_PRICE_UNITS.find((u) => u.id === id) ?? FOOD_PRICE_UNITS.find((u) => u.id === "kisi")!;
}

export function foodQtyBounds(
  p?: Pick<ProviderProduct, "minOrder" | "maxQty"> | null,
  remaining?: number,
) {
  const min = Math.max(1, p?.minOrder ?? 1);
  let max = Math.min(80, p?.maxQty ?? 80);
  if (remaining && remaining > 0) max = Math.min(max, remaining);
  if (max < min) max = min;
  return { min, max };
}

export function foodLeadLabel(hours?: number | null) {
  if (!hours) return "";
  if (hours >= 24 && hours % 24 === 0) {
    const d = hours / 24;
    return d === 1 ? "1 gün önce" : `${d} gün önce`;
  }
  return `${hours} saat önce`;
}

export function dropsForFood(product: Pick<ProviderProduct, "delivery"> | undefined, providerDrops: DropMethod[]) {
  if (!product?.delivery || product.delivery === "ikisi") return providerDrops;
  const want: DropMethod = product.delivery === "nokta" ? "nokta" : "kapi";
  const hit = providerDrops.filter((d) => d === want);
  return hit.length ? hit : providerDrops;
}

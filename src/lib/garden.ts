import type {
  DropMethod,
  GardenArea,
  GardenAvail,
  GardenEquipment,
  GardenJobs,
  GardenPriceType,
  ProviderGarden,
} from "./types";

export const GARDEN_JOBS: { id: keyof GardenJobs; label: string }[] = [
  { id: "cim", label: "Çim biçme" },
  { id: "budama", label: "Budama" },
  { id: "ot", label: "Yabani ot temizleme" },
  { id: "yaprak", label: "Yaprak temizleme" },
  { id: "dikim", label: "Bitki dikimi" },
  { id: "saksi", label: "Saksı düzenleme" },
  { id: "tasima", label: "Bitki taşıma" },
  { id: "sulama", label: "Sulama" },
  { id: "duzen", label: "Bahçe düzenleme" },
  { id: "diger", label: "Diğer" },
];

export const GARDEN_AREAS: { id: keyof GardenArea; label: string }[] = [
  { id: "kucuk", label: "Küçük alan" },
  { id: "orta", label: "Orta alan" },
  { id: "buyuk", label: "Büyük alan" },
];

export const GARDEN_PRICE_TYPES: { id: GardenPriceType; label: string }[] = [
  { id: "sabit", label: "Sabit fiyat" },
  { id: "alan", label: "Alan büyüklüğüne göre" },
  { id: "durum", label: "İşin durumuna göre" },
];

export const GARDEN_EQUIPMENT: { id: GardenEquipment; label: string }[] = [
  { id: "provider", label: "Hizmet veren sağlar" },
  { id: "customer", label: "Müşteri sağlar" },
  { id: "none", label: "Ekipmana gerek yok" },
];

export const GARDEN_AVAILS: { id: GardenAvail; label: string }[] = [
  { id: "hemen", label: "Hemen" },
  { id: "randevu", label: "Randevulu" },
  { id: "gun", label: "Belirli günlerde" },
];

export const GARDEN_UNIT = { id: "is" as const, label: "İş", qty: "iş" };

export function gardenPriceTypeLabel(id?: GardenPriceType | null) {
  return GARDEN_PRICE_TYPES.find((c) => c.id === id)?.label ?? "";
}

export function gardenEquipmentLabel(id?: GardenEquipment | null) {
  return GARDEN_EQUIPMENT.find((c) => c.id === id)?.label ?? "";
}

export function gardenAvailLabel(id?: GardenAvail | null) {
  return GARDEN_AVAILS.find((c) => c.id === id)?.label ?? "";
}

export function gardenJobList(j?: GardenJobs | null) {
  if (!j) return [];
  return GARDEN_JOBS.filter((row) => j[row.id]).map((row) => row.label);
}

export function gardenAreaList(a?: GardenArea | null) {
  if (!a) return [];
  return GARDEN_AREAS.filter((row) => a[row.id]).map((row) => row.label);
}

export function gardenCanOrder(g?: Pick<ProviderGarden, "price"> | null) {
  return Boolean(g && g.price > 0);
}

export function gardenQtyBounds(_g?: unknown, remaining?: number) {
  const min = 1;
  let max = 20;
  if (remaining && remaining > 0) max = Math.min(max, remaining);
  if (max < min) max = min;
  return { min, max };
}

export function gardenDurationLabel(min?: number | null) {
  if (min == null || min < 0) return "";
  if (min === 0) return "hemen";
  if (min < 60) return `${min} dakika`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (m === 0) return h === 1 ? "1 saat" : `${h} saat`;
  return `${h} saat ${m} dk`;
}

export function dropsForGarden(_garden: unknown, providerDrops: DropMethod[]) {
  return providerDrops;
}

export function gardenDropLabel(d: DropMethod) {
  return d === "nokta" ? "Belirlenen nokta" : "Yerinde (bahçe)";
}

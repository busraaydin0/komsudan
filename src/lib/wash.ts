import type {
  DropMethod,
  ProviderWash,
  WashBooking,
  WashIncludes,
  WashJob,
  WashMaterials,
  WashVehicle,
} from "./types";

export const WASH_JOBS: { id: WashJob; label: string }[] = [
  { id: "dis", label: "Dış Yıkama" },
  { id: "ic", label: "İç Temizlik" },
  { id: "icdis", label: "İç-Dış Temizlik" },
];

export const WASH_VEHICLES: { id: WashVehicle; label: string }[] = [
  { id: "otomobil", label: "Otomobil" },
  { id: "suv", label: "SUV" },
  { id: "ticari", label: "Hafif Ticari" },
  { id: "diger", label: "Diğer" },
];

export const WASH_INCLUDES: { id: keyof WashIncludes; label: string }[] = [
  { id: "dis", label: "Dış yıkama" },
  { id: "supurme", label: "İç süpürme" },
  { id: "cam", label: "Cam temizliği" },
  { id: "torpido", label: "Torpido temizliği" },
  { id: "jant", label: "Jant temizliği" },
  { id: "kurulama", label: "Kurulama" },
];

export const WASH_BOOKINGS: { id: WashBooking; label: string }[] = [
  { id: "randevu", label: "Randevulu" },
  { id: "musait", label: "Müsait olduğunda" },
];

export const WASH_MATERIALS: { id: WashMaterials; label: string }[] = [
  { id: "provider", label: "Hizmet veren sağlar" },
  { id: "customer", label: "Müşteri sağlar" },
];

export const WASH_UNIT = { id: "arac" as const, label: "Araç", qty: "araç" };

export function washJobLabel(id?: WashJob | null) {
  return WASH_JOBS.find((c) => c.id === id)?.label ?? "";
}

export function washVehicleLabel(id?: WashVehicle | null) {
  return WASH_VEHICLES.find((c) => c.id === id)?.label ?? "";
}

export function washBookingLabel(id?: WashBooking | null) {
  return WASH_BOOKINGS.find((c) => c.id === id)?.label ?? "";
}

export function washMaterialsLabel(id?: WashMaterials | null) {
  return WASH_MATERIALS.find((p) => p.id === id)?.label ?? "";
}

export function washIncludesList(includes?: WashIncludes | null) {
  if (!includes) return [];
  return WASH_INCLUDES.filter((row) => includes[row.id]).map((row) => row.label);
}

export function washCanOrder(w?: Pick<ProviderWash, "price"> | null) {
  return Boolean(w && w.price > 0);
}

export function washQtyBounds(
  w?: Pick<ProviderWash, "maxPerDay"> | null,
  remaining?: number,
) {
  const min = 1;
  let max = Math.min(80, w?.maxPerDay ?? 80);
  if (remaining && remaining > 0) max = Math.min(max, remaining);
  if (max < min) max = min;
  return { min, max };
}

export function washDurationLabel(min?: number | null) {
  if (min == null || min < 0) return "";
  if (min === 0) return "hemen";
  if (min < 60) return `${min} dakika`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (m === 0) return h === 1 ? "1 saat" : `${h} saat`;
  return `${h} saat ${m} dk`;
}

export function dropsForWash(_wash: unknown, providerDrops: DropMethod[]) {
  return providerDrops;
}

export function washDropLabel(d: DropMethod) {
  return d === "nokta" ? "Belirlenen teslim noktası" : "Yıkama yerinde";
}

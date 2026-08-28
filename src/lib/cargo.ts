import type {
  CargoAvail,
  CargoConfirm,
  CargoDrop,
  CargoJobs,
  CargoPickup,
  CargoPriceType,
  CargoSize,
  DropMethod,
  ProviderCargo,
} from "./types";

export const CARGO_JOBS: { id: keyof CargoJobs; label: string }[] = [
  { id: "subeAl", label: "Kargoyu şubeden teslim alma" },
  { id: "subeBirak", label: "Paketi kargo şubesine bırakma" },
  { id: "noktaNokta", label: "Paketi bir noktadan başka bir noktaya götürme" },
  { id: "alNokta", label: "Kargo teslim alma + belirlenen noktaya getirme" },
  { id: "teslimSube", label: "Kargo teslim etme + şubeye bırakma" },
];

export const CARGO_SIZES: { id: keyof CargoSize; label: string }[] = [
  { id: "kucuk", label: "Küçük" },
  { id: "orta", label: "Orta" },
  { id: "buyuk", label: "Büyük" },
];

export const CARGO_PRICE_TYPES: { id: CargoPriceType; label: string }[] = [
  { id: "sabit", label: "Sabit fiyat" },
  { id: "mesafe", label: "Mesafeye göre" },
];

export const CARGO_AVAILS: { id: CargoAvail; label: string }[] = [
  { id: "hemen", label: "Hemen" },
  { id: "randevu", label: "Randevulu" },
  { id: "saat", label: "Belirli saatlerde" },
];

export const CARGO_PICKUPS: { id: keyof CargoPickup; label: string }[] = [
  { id: "sube", label: "Kargo şubesinden teslim alabilirim" },
  { id: "adres", label: "Belirlenen adresten teslim alabilirim" },
  { id: "nokta", label: "Belirlenen noktadan teslim alabilirim" },
];

export const CARGO_DROPS: { id: keyof CargoDrop; label: string }[] = [
  { id: "sube", label: "Kargo şubesine bırakabilirim" },
  { id: "adres", label: "Belirlenen adrese bırakabilirim" },
  { id: "nokta", label: "Belirlenen noktaya bırakabilirim" },
];

export const CARGO_CONFIRMS: { id: keyof CargoConfirm; label: string }[] = [
  { id: "kod", label: "Teslim kodu" },
  { id: "app", label: "Uygulama üzerinden onay" },
];

export const CARGO_UNIT = { id: "paket" as const, label: "Paket", qty: "paket" };

export function cargoPriceTypeLabel(id?: CargoPriceType | null) {
  return CARGO_PRICE_TYPES.find((c) => c.id === id)?.label ?? "";
}

export function cargoAvailLabel(id?: CargoAvail | null) {
  return CARGO_AVAILS.find((c) => c.id === id)?.label ?? "";
}

export function cargoJobList(j?: CargoJobs | null) {
  if (!j) return [];
  return CARGO_JOBS.filter((row) => j[row.id]).map((row) => row.label);
}

export function cargoSizeList(s?: CargoSize | null) {
  if (!s) return [];
  return CARGO_SIZES.filter((row) => s[row.id]).map((row) => row.label);
}

export function cargoPickupList(p?: CargoPickup | null) {
  if (!p) return [];
  return CARGO_PICKUPS.filter((row) => p[row.id]).map((row) => row.label);
}

export function cargoDropList(d?: CargoDrop | null) {
  if (!d) return [];
  return CARGO_DROPS.filter((row) => d[row.id]).map((row) => row.label);
}

export function cargoConfirmList(c?: CargoConfirm | null) {
  if (!c) return [];
  return CARGO_CONFIRMS.filter((row) => c[row.id]).map((row) => row.label);
}

export function cargoCanOrder(c?: Pick<ProviderCargo, "price"> | null) {
  return Boolean(c && c.price > 0);
}

export function cargoQtyBounds(_c?: unknown, remaining?: number) {
  const min = 1;
  let max = 20;
  if (remaining && remaining > 0) max = Math.min(max, remaining);
  if (max < min) max = min;
  return { min, max };
}

export function cargoDurationLabel(min?: number | null) {
  if (min == null || min < 0) return "";
  if (min === 0) return "hemen";
  if (min < 60) return `${min} dakika`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (m === 0) return h === 1 ? "1 saat" : `${h} saat`;
  return `${h} saat ${m} dk`;
}

export function dropsForCargo(
  card: Pick<ProviderCargo, "pickup" | "dropoff"> | undefined,
  providerDrops: DropMethod[],
) {
  if (!card) return providerDrops;
  const want: DropMethod[] = [];
  if (card.pickup.adres || card.dropoff.adres) want.push("kapi");
  if (card.pickup.nokta || card.dropoff.nokta) want.push("nokta");
  const hit = want.filter((d) => providerDrops.includes(d));
  return hit.length ? hit : want.length ? want : providerDrops;
}

export function cargoDropLabel(d: DropMethod) {
  return d === "nokta" ? "Belirlenen nokta" : "Adrese teslim";
}

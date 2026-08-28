import type {
  CourierAvail,
  CourierCarry,
  CourierConfirm,
  CourierPriceType,
  CourierRoute,
  CourierSize,
  CourierTransport,
  DropMethod,
  ProviderCourier,
} from "./types";

export const COURIER_TRANSPORTS: { id: keyof CourierTransport; label: string }[] = [
  { id: "yaya", label: "Yaya" },
  { id: "bisiklet", label: "Bisiklet" },
  { id: "ebike", label: "Elektrikli Bisiklet" },
  { id: "motor", label: "Motosiklet" },
];

export const COURIER_SIZES: { id: keyof CourierSize; label: string; hint: string }[] = [
  { id: "kucuk", label: "Küçük", hint: "El çantası boyutu" },
  { id: "orta", label: "Orta", hint: "Ayakkabı kutusu boyutu" },
  { id: "buyuk", label: "Büyük", hint: "Küçük koli boyutu" },
];

export const COURIER_PRICE_TYPES: { id: CourierPriceType; label: string }[] = [
  { id: "sabit", label: "Sabit fiyat" },
  { id: "mesafe", label: "Mesafeye göre" },
];

export const COURIER_ROUTES: { id: keyof CourierRoute; label: string }[] = [
  { id: "adresAdres", label: "Adresten al → Adrese teslim" },
  { id: "noktaAdres", label: "Belirlenen noktadan al → Adrese teslim" },
  { id: "noktaNokta", label: "İki belirlenen nokta arasında teslim" },
];

export const COURIER_AVAILS: { id: CourierAvail; label: string }[] = [
  { id: "hemen", label: "Hemen" },
  { id: "randevu", label: "Randevulu" },
  { id: "saat", label: "Belirli saatlerde" },
];

export const COURIER_CARRY: { id: keyof CourierCarry; label: string }[] = [
  { id: "evrak", label: "Evrak / belge" },
  { id: "paket", label: "Küçük paket" },
  { id: "kiyafet", label: "Kıyafet" },
  { id: "anahtar", label: "Anahtar" },
  { id: "hediye", label: "Hediye" },
  { id: "kisisel", label: "Kişisel eşya" },
  { id: "diger", label: "Diğer" },
];

export const COURIER_CONFIRMS: { id: keyof CourierConfirm; label: string }[] = [
  { id: "kod", label: "Teslim kodu" },
  { id: "app", label: "Alıcının uygulama üzerinden onayı" },
];

export const COURIER_UNIT = { id: "gonderi" as const, label: "Gönderi", qty: "gönderi" };

export function courierPriceTypeLabel(id?: CourierPriceType | null) {
  return COURIER_PRICE_TYPES.find((c) => c.id === id)?.label ?? "";
}

export function courierAvailLabel(id?: CourierAvail | null) {
  return COURIER_AVAILS.find((c) => c.id === id)?.label ?? "";
}

export function courierTransportList(t?: CourierTransport | null) {
  if (!t) return [];
  return COURIER_TRANSPORTS.filter((row) => t[row.id]).map((row) => row.label);
}

export function courierSizeList(s?: CourierSize | null) {
  if (!s) return [];
  return COURIER_SIZES.filter((row) => s[row.id]).map((row) => row.label);
}

export function courierRouteList(r?: CourierRoute | null) {
  if (!r) return [];
  return COURIER_ROUTES.filter((row) => r[row.id]).map((row) => row.label);
}

export function courierCarryList(c?: CourierCarry | null, other?: string | null) {
  if (!c) return [];
  const labels = COURIER_CARRY.filter((row) => row.id !== "diger" && c[row.id]).map((row) => row.label);
  if (c.diger) labels.push(other?.trim() ? `Diğer: ${other.trim()}` : "Diğer");
  return labels;
}

export function courierConfirmList(c?: CourierConfirm | null) {
  if (!c) return [];
  return COURIER_CONFIRMS.filter((row) => c[row.id]).map((row) => row.label);
}

export function courierCanOrder(c?: Pick<ProviderCourier, "price"> | null) {
  return Boolean(c && c.price > 0);
}

export function courierQtyBounds(_c?: unknown, remaining?: number) {
  const min = 1;
  let max = 20;
  if (remaining && remaining > 0) max = Math.min(max, remaining);
  if (max < min) max = min;
  return { min, max };
}

export function courierDurationLabel(min?: number | null) {
  if (min == null || min < 0) return "";
  if (min === 0) return "hemen";
  if (min < 60) return `${min} dakika`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (m === 0) return h === 1 ? "1 saat" : `${h} saat`;
  return `${h} saat ${m} dk`;
}

export function dropsForCourier(
  card: Pick<ProviderCourier, "routes"> | undefined,
  providerDrops: DropMethod[],
) {
  if (!card) return providerDrops;
  const want: DropMethod[] = [];
  if (card.routes.adresAdres || card.routes.noktaAdres) want.push("kapi");
  if (card.routes.noktaAdres || card.routes.noktaNokta) want.push("nokta");
  const hit = want.filter((d) => providerDrops.includes(d));
  return hit.length ? hit : want.length ? want : providerDrops;
}

export function courierDropLabel(d: DropMethod) {
  return d === "nokta" ? "Belirlenen nokta" : "Adrese teslim";
}

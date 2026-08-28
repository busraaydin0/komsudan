import type {
  DropMethod,
  PrintAvail,
  PrintColor,
  PrintFile,
  PrintPaper,
  PrintPickup,
  PrintSend,
  PrintSides,
  ProviderPrint,
} from "./types";

export const PRINT_COLORS: { id: keyof PrintColor; label: string }[] = [
  { id: "bw", label: "Siyah & beyaz" },
  { id: "color", label: "Renkli" },
];

export const PRINT_PAPERS: { id: keyof PrintPaper; label: string }[] = [{ id: "a4", label: "A4" }];

export const PRINT_SIDES: { id: keyof PrintSides; label: string }[] = [
  { id: "tek", label: "Tek taraflı" },
  { id: "cift", label: "Çift taraflı" },
];

export const PRINT_FILES: { id: keyof PrintFile; label: string }[] = [
  { id: "pdf", label: "PDF" },
  { id: "word", label: "Word" },
  { id: "image", label: "Görsel" },
  { id: "other", label: "Diğer" },
];

export const PRINT_SENDS: { id: keyof PrintSend; label: string }[] = [
  { id: "app", label: "Uygulama üzerinden" },
  { id: "email", label: "E-posta" },
  { id: "other", label: "Diğer" },
];

export const PRINT_PICKUPS: { id: keyof PrintPickup; label: string }[] = [
  { id: "adres", label: "Hizmet verenin adresinden" },
  { id: "nokta", label: "Yakın noktada buluşma" },
];

export const PRINT_AVAILS: { id: PrintAvail; label: string }[] = [
  { id: "hemen", label: "Hemen" },
  { id: "saat", label: "Belirli saatlerde" },
  { id: "randevu", label: "Randevulu" },
];

export const PRINT_UNIT = { id: "sayfa" as const, label: "Sayfa", qty: "sayfa" };

export function printAvailLabel(id?: PrintAvail | null) {
  return PRINT_AVAILS.find((c) => c.id === id)?.label ?? "";
}

export function printColorList(c?: PrintColor | null) {
  if (!c) return [];
  return PRINT_COLORS.filter((row) => c[row.id]).map((row) => row.label);
}

export function printPaperList(p?: PrintPaper | null) {
  if (!p) return [];
  return PRINT_PAPERS.filter((row) => p[row.id]).map((row) => row.label);
}

export function printSideList(s?: PrintSides | null) {
  if (!s) return [];
  return PRINT_SIDES.filter((row) => s[row.id]).map((row) => row.label);
}

export function printFileList(f?: PrintFile | null) {
  if (!f) return [];
  return PRINT_FILES.filter((row) => f[row.id]).map((row) => row.label);
}

export function printSendList(s?: PrintSend | null) {
  if (!s) return [];
  return PRINT_SENDS.filter((row) => s[row.id]).map((row) => row.label);
}

export function printPickupList(p?: PrintPickup | null) {
  if (!p) return [];
  return PRINT_PICKUPS.filter((row) => p[row.id]).map((row) => row.label);
}

export function printCanOrder(c?: Pick<ProviderPrint, "price"> | null) {
  return Boolean(c && c.price > 0);
}

export function printQtyBounds(c?: Pick<ProviderPrint, "minPages"> | null, remaining?: number) {
  const min = Math.max(1, c?.minPages ?? 1);
  let max = 200;
  if (remaining && remaining > 0) max = Math.min(max, remaining);
  if (max < min) max = min;
  return { min, max };
}

export function printDurationLabel(min?: number | null) {
  if (min == null || min < 0) return "";
  if (min === 0) return "hemen";
  if (min < 60) return `${min} dakika`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (m === 0) return h === 1 ? "1 saat" : `${h} saat`;
  return `${h} saat ${m} dk`;
}

export function dropsForPrint(card: Pick<ProviderPrint, "pickup"> | undefined, providerDrops: DropMethod[]) {
  if (!card) return providerDrops;
  const want: DropMethod[] = [];
  if (card.pickup.adres) want.push("kapi");
  if (card.pickup.nokta) want.push("nokta");
  const hit = want.filter((d) => providerDrops.includes(d));
  return hit.length ? hit : want.length ? want : providerDrops;
}

export function printDropLabel(d: DropMethod) {
  return d === "nokta" ? "Yakın noktada buluşma" : "Verenin adresinden";
}

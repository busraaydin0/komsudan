import type {
  DropMethod,
  ProviderTalk,
  TalkDuration,
  TalkKind,
  TalkLang,
  TalkLevel,
  TalkMaterials,
  TalkPlace,
} from "./types";

export const TALK_LANGS: { id: keyof TalkLang; label: string }[] = [
  { id: "en", label: "İngilizce" },
  { id: "de", label: "Almanca" },
  { id: "es", label: "İspanyolca" },
  { id: "fr", label: "Fransızca" },
  { id: "it", label: "İtalyanca" },
  { id: "ar", label: "Arapça" },
  { id: "other", label: "Diğer" },
];

export const TALK_KINDS: { id: keyof TalkKind; label: string }[] = [
  { id: "speaking", label: "Speaking pratiği" },
  { id: "chat", label: "Günlük sohbet" },
  { id: "beginner", label: "Temel seviye öğretim" },
  { id: "vocab", label: "Kelime pratiği" },
  { id: "pronun", label: "Telaffuz pratiği" },
  { id: "grammar", label: "Dil bilgisi desteği" },
  { id: "exam", label: "Sınava Hazırlık Konuşma" },
];

export const TALK_LEVELS: { id: keyof TalkLevel; label: string }[] = [
  { id: "a1", label: "Başlangıç (A1)" },
  { id: "a2", label: "Temel (A2)" },
  { id: "b", label: "Orta (B1–B2)" },
];

export const TALK_DURATIONS: { id: keyof TalkDuration; label: string }[] = [
  { id: "m30", label: "30 dakika" },
  { id: "m45", label: "45 dakika" },
  { id: "m60", label: "60 dakika" },
];

export const TALK_PLACES: { id: keyof TalkPlace; label: string }[] = [
  { id: "ev", label: "Hizmet verenin evinde" },
  { id: "ortak", label: "Yakın ortak alanda" },
  { id: "online", label: "Online" },
];

export const TALK_MATERIALS: { id: keyof TalkMaterials; label: string }[] = [
  { id: "provider", label: "Hizmet veren sağlar" },
  { id: "student", label: "Öğrenci sağlar" },
  { id: "together", label: "Birlikte belirlenir" },
];

export const TALK_UNIT = { id: "gorusme" as const, label: "Görüşme", qty: "görüşme" };

export function talkLangList(l?: TalkLang | null, otherText?: string | null) {
  if (!l) return [];
  return TALK_LANGS.filter((row) => l[row.id]).map((row) =>
    row.id === "other" && otherText?.trim() ? `Diğer (${otherText.trim()})` : row.label,
  );
}

export function talkKindList(k?: TalkKind | null) {
  if (!k) return [];
  return TALK_KINDS.filter((row) => k[row.id]).map((row) => row.label);
}

export function talkLevelList(l?: TalkLevel | null) {
  if (!l) return [];
  return TALK_LEVELS.filter((row) => l[row.id]).map((row) => row.label);
}

export function talkDurationList(d?: TalkDuration | null) {
  if (!d) return [];
  return TALK_DURATIONS.filter((row) => d[row.id]).map((row) => row.label);
}

export function talkPlaceList(p?: TalkPlace | null) {
  if (!p) return [];
  return TALK_PLACES.filter((row) => p[row.id]).map((row) => row.label);
}

export function talkMaterialList(m?: TalkMaterials | null) {
  if (!m) return [];
  return TALK_MATERIALS.filter((row) => m[row.id]).map((row) => row.label);
}

export function talkCanOrder(c?: Pick<ProviderTalk, "price"> | null) {
  return Boolean(c && c.price > 0);
}

export function talkQtyBounds(_c?: Pick<ProviderTalk, "price"> | null, remaining?: number) {
  const min = 1;
  let max = 20;
  if (remaining && remaining > 0) max = Math.min(max, remaining);
  if (max < min) max = min;
  return { min, max };
}

export function dropsForTalk(card: Pick<ProviderTalk, "place"> | undefined, providerDrops: DropMethod[]) {
  if (!card) return providerDrops;
  const want: DropMethod[] = [];
  if (card.place.ev || card.place.online) want.push("kapi");
  if (card.place.ortak) want.push("nokta");
  const hit = want.filter((d) => providerDrops.includes(d));
  return hit.length ? hit : want.length ? want : providerDrops;
}

export function talkDropLabel(d: DropMethod, place?: TalkPlace | null) {
  if (d === "nokta") return "Yakın ortak alanda";
  const bits: string[] = [];
  if (place?.ev) bits.push("Verenin evinde");
  if (place?.online) bits.push("Online");
  return bits.join(" / ") || "Verenin evinde";
}

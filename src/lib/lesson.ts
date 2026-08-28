import type {
  DropMethod,
  LessonDuration,
  LessonKind,
  LessonLevel,
  LessonMaterials,
  LessonPlace,
  LessonSubject,
  ProviderLesson,
} from "./types";

export const LESSON_KINDS: { id: keyof LessonKind; label: string }[] = [
  { id: "takip", label: "Ödev takibi" },
  { id: "okuma", label: "Okuma pratiği" },
  { id: "eslik", label: "Ders çalışma eşliği" },
  { id: "tekrar", label: "Konu tekrarı" },
  { id: "sinav", label: "Sınava hazırlık" },
  { id: "other", label: "Diğer" },
];

export const LESSON_LEVELS: { id: keyof LessonLevel; label: string }[] = [
  { id: "ilkokul", label: "İlkokul" },
  { id: "ortaokul", label: "Ortaokul" },
  { id: "lise", label: "Lise" },
];

export const LESSON_SUBJECTS: { id: keyof LessonSubject; label: string }[] = [
  { id: "turkce", label: "Türkçe" },
  { id: "matematik", label: "Matematik" },
  { id: "fen", label: "Fen Bilimleri" },
  { id: "sosyal", label: "Sosyal Bilgiler" },
  { id: "ingilizce", label: "İngilizce" },
  { id: "all", label: "Tüm dersler" },
  { id: "other", label: "Diğer" },
];

export const LESSON_DURATIONS: { id: keyof LessonDuration; label: string }[] = [
  { id: "m30", label: "30 dakika" },
  { id: "m45", label: "45 dakika" },
  { id: "m60", label: "60 dakika" },
  { id: "m90", label: "90 dakika" },
];

export const LESSON_PLACES: { id: keyof LessonPlace; label: string }[] = [
  { id: "ev", label: "Hizmet verenin evinde" },
  { id: "ortak", label: "Yakın bir ortak alanda" },
  { id: "online", label: "Online" },
];

export const LESSON_MATERIALS: { id: keyof LessonMaterials; label: string }[] = [
  { id: "student", label: "Öğrenci getirir" },
  { id: "provider", label: "Hizmet veren sağlar" },
  { id: "none", label: "Gerekmiyor" },
];

export const LESSON_UNIT = { id: "ders" as const, label: "Ders", qty: "ders" };

export function lessonKindList(k?: LessonKind | null) {
  if (!k) return [];
  return LESSON_KINDS.filter((row) => k[row.id]).map((row) => row.label);
}

export function lessonLevelList(l?: LessonLevel | null) {
  if (!l) return [];
  return LESSON_LEVELS.filter((row) => l[row.id]).map((row) => row.label);
}

export function lessonSubjectList(s?: LessonSubject | null, otherText?: string | null) {
  if (!s) return [];
  return LESSON_SUBJECTS.filter((row) => s[row.id]).map((row) =>
    row.id === "other" && otherText?.trim() ? `Diğer (${otherText.trim()})` : row.label,
  );
}

export function lessonDurationList(d?: LessonDuration | null) {
  if (!d) return [];
  return LESSON_DURATIONS.filter((row) => d[row.id]).map((row) => row.label);
}

export function lessonPlaceList(p?: LessonPlace | null) {
  if (!p) return [];
  return LESSON_PLACES.filter((row) => p[row.id]).map((row) => row.label);
}

export function lessonMaterialList(m?: LessonMaterials | null) {
  if (!m) return [];
  return LESSON_MATERIALS.filter((row) => m[row.id]).map((row) => row.label);
}

export function lessonCanOrder(c?: Pick<ProviderLesson, "price"> | null) {
  return Boolean(c && c.price > 0);
}

export function lessonQtyBounds(c?: Pick<ProviderLesson, "weekly"> | null, remaining?: number) {
  const min = Math.max(1, c?.weekly ?? 1);
  let max = 20;
  if (remaining && remaining > 0) max = Math.min(max, remaining);
  if (max < min) max = min;
  return { min, max };
}

export function dropsForLesson(card: Pick<ProviderLesson, "place"> | undefined, providerDrops: DropMethod[]) {
  if (!card) return providerDrops;
  const want: DropMethod[] = [];
  if (card.place.ev || card.place.online) want.push("kapi");
  if (card.place.ortak) want.push("nokta");
  const hit = want.filter((d) => providerDrops.includes(d));
  return hit.length ? hit : want.length ? want : providerDrops;
}

export function lessonDropLabel(d: DropMethod, place?: LessonPlace | null) {
  if (d === "nokta") return "Yakın ortak alanda";
  const bits: string[] = [];
  if (place?.ev) bits.push("Verenin evinde");
  if (place?.online) bits.push("Online");
  return bits.join(" / ") || "Verenin evinde";
}

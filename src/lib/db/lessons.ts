import { randomUUID } from "node:crypto";
import { db } from "./client";
import type {
  LessonDuration,
  LessonKind,
  LessonLevel,
  LessonMaterials,
  LessonPlace,
  LessonSubject,
  ProviderLesson,
} from "@/lib/types";

export type LessonRow = {
  id: string;
  provider_id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  kind_takip: number;
  kind_okuma: number;
  kind_eslik: number;
  kind_tekrar: number;
  kind_sinav: number;
  kind_other: number;
  level_ilkokul: number;
  level_ortaokul: number;
  level_lise: number;
  sub_turkce: number;
  sub_matematik: number;
  sub_fen: number;
  sub_sosyal: number;
  sub_ingilizce: number;
  sub_all: number;
  sub_other: number;
  subject_other: string | null;
  dur_30: number;
  dur_45: number;
  dur_60: number;
  dur_90: number;
  price: number;
  place_ev: number;
  place_ortak: number;
  place_online: number;
  weekly: number;
  mat_student: number;
  mat_provider: number;
  mat_none: number;
  notes: string | null;
  is_active: number;
  created_at: string;
};

export type LessonWrite = {
  name: string;
  description?: string | null;
  photoUrl?: string | null;
  kinds?: LessonKind;
  levels?: LessonLevel;
  subjects?: LessonSubject;
  subjectOther?: string | null;
  durations?: LessonDuration;
  price: number;
  place?: LessonPlace;
  weekly?: number;
  materials?: LessonMaterials;
  notes?: string | null;
  isActive?: boolean;
};

function flagRows(input: LessonWrite) {
  const k = input.kinds;
  const l = input.levels;
  const s = input.subjects;
  const d = input.durations;
  const p = input.place;
  const m = input.materials;
  return {
    kind_takip: k?.takip ? 1 : 0,
    kind_okuma: k?.okuma ? 1 : 0,
    kind_eslik: k?.eslik ? 1 : 0,
    kind_tekrar: k?.tekrar ? 1 : 0,
    kind_sinav: k?.sinav ? 1 : 0,
    kind_other: k?.other ? 1 : 0,
    level_ilkokul: l?.ilkokul ? 1 : 0,
    level_ortaokul: l?.ortaokul ? 1 : 0,
    level_lise: l?.lise ? 1 : 0,
    sub_turkce: s?.turkce ? 1 : 0,
    sub_matematik: s?.matematik ? 1 : 0,
    sub_fen: s?.fen ? 1 : 0,
    sub_sosyal: s?.sosyal ? 1 : 0,
    sub_ingilizce: s?.ingilizce ? 1 : 0,
    sub_all: s?.all ? 1 : 0,
    sub_other: s?.other ? 1 : 0,
    dur_30: d?.m30 ? 1 : 0,
    dur_45: d?.m45 ? 1 : 0,
    dur_60: d?.m60 ? 1 : 0,
    dur_90: d?.m90 ? 1 : 0,
    place_ev: p?.ev ? 1 : 0,
    place_ortak: p?.ortak ? 1 : 0,
    place_online: p?.online ? 1 : 0,
    mat_student: m?.student ? 1 : 0,
    mat_provider: m?.provider ? 1 : 0,
    mat_none: m?.none ? 1 : 0,
  };
}

export function toPublicLesson(row: LessonRow): ProviderLesson {
  return {
    id: row.id,
    name: row.name,
    description: row.description || null,
    photoUrl: row.photo_url || null,
    kinds: {
      takip: Boolean(row.kind_takip),
      okuma: Boolean(row.kind_okuma),
      eslik: Boolean(row.kind_eslik),
      tekrar: Boolean(row.kind_tekrar),
      sinav: Boolean(row.kind_sinav),
      other: Boolean(row.kind_other),
    },
    levels: {
      ilkokul: Boolean(row.level_ilkokul),
      ortaokul: Boolean(row.level_ortaokul),
      lise: Boolean(row.level_lise),
    },
    subjects: {
      turkce: Boolean(row.sub_turkce),
      matematik: Boolean(row.sub_matematik),
      fen: Boolean(row.sub_fen),
      sosyal: Boolean(row.sub_sosyal),
      ingilizce: Boolean(row.sub_ingilizce),
      all: Boolean(row.sub_all),
      other: Boolean(row.sub_other),
    },
    subjectOther: row.subject_other || null,
    durations: {
      m30: Boolean(row.dur_30),
      m45: Boolean(row.dur_45),
      m60: Boolean(row.dur_60),
      m90: Boolean(row.dur_90),
    },
    price: row.price,
    place: {
      ev: Boolean(row.place_ev),
      ortak: Boolean(row.place_ortak),
      online: Boolean(row.place_online),
    },
    weekly: row.weekly,
    materials: {
      student: Boolean(row.mat_student),
      provider: Boolean(row.mat_provider),
      none: Boolean(row.mat_none),
    },
    notes: row.notes || null,
    isActive: Boolean(row.is_active),
  };
}

export function listLessons(providerId: string, activeOnly = true): LessonRow[] {
  const sql = activeOnly
    ? `SELECT * FROM provider_lessons WHERE provider_id = ? AND is_active = 1 ORDER BY created_at ASC`
    : `SELECT * FROM provider_lessons WHERE provider_id = ? ORDER BY created_at ASC`;
  return db().prepare(sql).all(providerId) as LessonRow[];
}

export function getLesson(id: string): LessonRow | undefined {
  return db().prepare("SELECT * FROM provider_lessons WHERE id = ?").get(id) as LessonRow | undefined;
}

export function countLessons(providerId: string, activeOnly = true) {
  const sql = activeOnly
    ? `SELECT COUNT(*) AS n FROM provider_lessons WHERE provider_id = ? AND is_active = 1`
    : `SELECT COUNT(*) AS n FROM provider_lessons WHERE provider_id = ?`;
  return (db().prepare(sql).get(providerId) as { n: number }).n;
}

const LESSON_COLUMNS = `id, provider_id, name, description, photo_url,
         kind_takip, kind_okuma, kind_eslik, kind_tekrar, kind_sinav, kind_other,
         level_ilkokul, level_ortaokul, level_lise,
         sub_turkce, sub_matematik, sub_fen, sub_sosyal, sub_ingilizce, sub_all, sub_other, subject_other,
         dur_30, dur_45, dur_60, dur_90, price,
         place_ev, place_ortak, place_online, weekly,
         mat_student, mat_provider, mat_none, notes, is_active, created_at`;

const LESSON_PLACEHOLDERS = `@id, @provider_id, @name, @description, @photo_url,
         @kind_takip, @kind_okuma, @kind_eslik, @kind_tekrar, @kind_sinav, @kind_other,
         @level_ilkokul, @level_ortaokul, @level_lise,
         @sub_turkce, @sub_matematik, @sub_fen, @sub_sosyal, @sub_ingilizce, @sub_all, @sub_other, @subject_other,
         @dur_30, @dur_45, @dur_60, @dur_90, @price,
         @place_ev, @place_ortak, @place_online, @weekly,
         @mat_student, @mat_provider, @mat_none, @notes, @is_active, @created_at`;

export function upsertLesson(row: {
  id: string;
  provider_id: string;
  name: string;
  description?: string | null;
  kinds?: LessonKind;
  levels?: LessonLevel;
  subjects?: LessonSubject;
  subjectOther?: string | null;
  durations?: LessonDuration;
  price: number;
  place?: LessonPlace;
  weekly?: number;
  materials?: LessonMaterials;
  notes?: string | null;
}) {
  const now = new Date().toISOString();
  const flags = flagRows(row);
  db()
    .prepare(
      `INSERT INTO provider_lessons (
         ${LESSON_COLUMNS}
       ) VALUES (
         @id, @provider_id, @name, @description, NULL,
         @kind_takip, @kind_okuma, @kind_eslik, @kind_tekrar, @kind_sinav, @kind_other,
         @level_ilkokul, @level_ortaokul, @level_lise,
         @sub_turkce, @sub_matematik, @sub_fen, @sub_sosyal, @sub_ingilizce, @sub_all, @sub_other, @subject_other,
         @dur_30, @dur_45, @dur_60, @dur_90, @price,
         @place_ev, @place_ortak, @place_online, @weekly,
         @mat_student, @mat_provider, @mat_none, @notes, 1, @now
       )
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         description = excluded.description,
         kind_takip = excluded.kind_takip,
         kind_okuma = excluded.kind_okuma,
         kind_eslik = excluded.kind_eslik,
         kind_tekrar = excluded.kind_tekrar,
         kind_sinav = excluded.kind_sinav,
         kind_other = excluded.kind_other,
         level_ilkokul = excluded.level_ilkokul,
         level_ortaokul = excluded.level_ortaokul,
         level_lise = excluded.level_lise,
         sub_turkce = excluded.sub_turkce,
         sub_matematik = excluded.sub_matematik,
         sub_fen = excluded.sub_fen,
         sub_sosyal = excluded.sub_sosyal,
         sub_ingilizce = excluded.sub_ingilizce,
         sub_all = excluded.sub_all,
         sub_other = excluded.sub_other,
         subject_other = excluded.subject_other,
         dur_30 = excluded.dur_30,
         dur_45 = excluded.dur_45,
         dur_60 = excluded.dur_60,
         dur_90 = excluded.dur_90,
         price = excluded.price,
         place_ev = excluded.place_ev,
         place_ortak = excluded.place_ortak,
         place_online = excluded.place_online,
         weekly = excluded.weekly,
         mat_student = excluded.mat_student,
         mat_provider = excluded.mat_provider,
         mat_none = excluded.mat_none,
         notes = excluded.notes,
         is_active = 1`,
    )
    .run({
      id: row.id,
      provider_id: row.provider_id,
      name: row.name,
      description: row.description ?? null,
      ...flags,
      subject_other: row.subjectOther ?? null,
      price: row.price,
      weekly: row.weekly ?? 1,
      notes: row.notes ?? null,
      now,
    });
}

export function insertLesson(providerId: string, input: LessonWrite): LessonRow {
  const flags = flagRows(input);
  const row = {
    id: randomUUID(),
    provider_id: providerId,
    name: input.name,
    description: input.description ?? null,
    photo_url: input.photoUrl ?? null,
    ...flags,
    subject_other: input.subjectOther ?? null,
    price: input.price,
    weekly: input.weekly ?? 1,
    notes: input.notes ?? null,
    is_active: input.isActive === false ? 0 : 1,
    created_at: new Date().toISOString(),
  };
  db()
    .prepare(
      `INSERT INTO provider_lessons (
         ${LESSON_COLUMNS}
       ) VALUES (
         ${LESSON_PLACEHOLDERS}
       )`,
    )
    .run(row);
  return getLesson(row.id)!;
}

export function updateLesson(id: string, providerId: string, input: LessonWrite): LessonRow | undefined {
  const current = getLesson(id);
  if (!current || current.provider_id !== providerId) return undefined;
  const flags = flagRows(input);
  db()
    .prepare(
      `UPDATE provider_lessons SET
         name = @name,
         description = @description,
         photo_url = @photo_url,
         kind_takip = @kind_takip,
         kind_okuma = @kind_okuma,
         kind_eslik = @kind_eslik,
         kind_tekrar = @kind_tekrar,
         kind_sinav = @kind_sinav,
         kind_other = @kind_other,
         level_ilkokul = @level_ilkokul,
         level_ortaokul = @level_ortaokul,
         level_lise = @level_lise,
         sub_turkce = @sub_turkce,
         sub_matematik = @sub_matematik,
         sub_fen = @sub_fen,
         sub_sosyal = @sub_sosyal,
         sub_ingilizce = @sub_ingilizce,
         sub_all = @sub_all,
         sub_other = @sub_other,
         subject_other = @subject_other,
         dur_30 = @dur_30,
         dur_45 = @dur_45,
         dur_60 = @dur_60,
         dur_90 = @dur_90,
         price = @price,
         place_ev = @place_ev,
         place_ortak = @place_ortak,
         place_online = @place_online,
         weekly = @weekly,
         mat_student = @mat_student,
         mat_provider = @mat_provider,
         mat_none = @mat_none,
         notes = @notes,
         is_active = @is_active
       WHERE id = @id AND provider_id = @providerId`,
    )
    .run({
      id,
      providerId,
      name: input.name,
      description: input.description ?? null,
      photo_url: input.photoUrl === undefined ? current.photo_url : input.photoUrl,
      ...flags,
      subject_other: input.subjectOther ?? null,
      price: input.price,
      weekly: input.weekly ?? 1,
      notes: input.notes ?? null,
      is_active: input.isActive === false ? 0 : 1,
    });
  return getLesson(id);
}

export function setLessonPhotoUrl(id: string, providerId: string, url: string | null) {
  const result = db()
    .prepare("UPDATE provider_lessons SET photo_url = ? WHERE id = ? AND provider_id = ?")
    .run(url, id, providerId);
  return result.changes > 0;
}

export function deactivateLesson(id: string, providerId: string) {
  const result = db()
    .prepare(
      `UPDATE provider_lessons SET is_active = 0
       WHERE id = ? AND provider_id = ? AND is_active = 1`,
    )
    .run(id, providerId);
  return result.changes > 0;
}

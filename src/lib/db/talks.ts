import { randomUUID } from "node:crypto";
import { db } from "./client";
import type {
  ProviderTalk,
  TalkDuration,
  TalkKind,
  TalkLang,
  TalkLevel,
  TalkMaterials,
  TalkPlace,
} from "@/lib/types";

export type TalkRow = {
  id: string;
  provider_id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  lang_en: number;
  lang_de: number;
  lang_es: number;
  lang_fr: number;
  lang_it: number;
  lang_ar: number;
  lang_other: number;
  lang_other_text: string | null;
  kind_speaking: number;
  kind_chat: number;
  kind_beginner: number;
  kind_vocab: number;
  kind_pronun: number;
  kind_grammar: number;
  kind_exam: number;
  level_a1: number;
  level_a2: number;
  level_b: number;
  dur_30: number;
  dur_45: number;
  dur_60: number;
  price: number;
  place_ev: number;
  place_ortak: number;
  place_online: number;
  mat_provider: number;
  mat_student: number;
  mat_together: number;
  notes: string | null;
  is_active: number;
  created_at: string;
};

export type TalkWrite = {
  name: string;
  description?: string | null;
  photoUrl?: string | null;
  langs?: TalkLang;
  langOther?: string | null;
  kinds?: TalkKind;
  levels?: TalkLevel;
  durations?: TalkDuration;
  price: number;
  place?: TalkPlace;
  materials?: TalkMaterials;
  notes?: string | null;
  isActive?: boolean;
};

function flagRows(input: TalkWrite) {
  const l = input.langs;
  const k = input.kinds;
  const lv = input.levels;
  const d = input.durations;
  const p = input.place;
  const m = input.materials;
  return {
    lang_en: l?.en ? 1 : 0,
    lang_de: l?.de ? 1 : 0,
    lang_es: l?.es ? 1 : 0,
    lang_fr: l?.fr ? 1 : 0,
    lang_it: l?.it ? 1 : 0,
    lang_ar: l?.ar ? 1 : 0,
    lang_other: l?.other ? 1 : 0,
    kind_speaking: k?.speaking ? 1 : 0,
    kind_chat: k?.chat ? 1 : 0,
    kind_beginner: k?.beginner ? 1 : 0,
    kind_vocab: k?.vocab ? 1 : 0,
    kind_pronun: k?.pronun ? 1 : 0,
    kind_grammar: k?.grammar ? 1 : 0,
    kind_exam: k?.exam ? 1 : 0,
    level_a1: lv?.a1 ? 1 : 0,
    level_a2: lv?.a2 ? 1 : 0,
    level_b: lv?.b ? 1 : 0,
    dur_30: d?.m30 ? 1 : 0,
    dur_45: d?.m45 ? 1 : 0,
    dur_60: d?.m60 ? 1 : 0,
    place_ev: p?.ev ? 1 : 0,
    place_ortak: p?.ortak ? 1 : 0,
    place_online: p?.online ? 1 : 0,
    mat_provider: m?.provider ? 1 : 0,
    mat_student: m?.student ? 1 : 0,
    mat_together: m?.together ? 1 : 0,
  };
}

export function toPublicTalk(row: TalkRow): ProviderTalk {
  return {
    id: row.id,
    name: row.name,
    description: row.description || null,
    photoUrl: row.photo_url || null,
    langs: {
      en: Boolean(row.lang_en),
      de: Boolean(row.lang_de),
      es: Boolean(row.lang_es),
      fr: Boolean(row.lang_fr),
      it: Boolean(row.lang_it),
      ar: Boolean(row.lang_ar),
      other: Boolean(row.lang_other),
    },
    langOther: row.lang_other_text || null,
    kinds: {
      speaking: Boolean(row.kind_speaking),
      chat: Boolean(row.kind_chat),
      beginner: Boolean(row.kind_beginner),
      vocab: Boolean(row.kind_vocab),
      pronun: Boolean(row.kind_pronun),
      grammar: Boolean(row.kind_grammar),
      exam: Boolean(row.kind_exam),
    },
    levels: {
      a1: Boolean(row.level_a1),
      a2: Boolean(row.level_a2),
      b: Boolean(row.level_b),
    },
    durations: {
      m30: Boolean(row.dur_30),
      m45: Boolean(row.dur_45),
      m60: Boolean(row.dur_60),
    },
    price: row.price,
    place: {
      ev: Boolean(row.place_ev),
      ortak: Boolean(row.place_ortak),
      online: Boolean(row.place_online),
    },
    materials: {
      provider: Boolean(row.mat_provider),
      student: Boolean(row.mat_student),
      together: Boolean(row.mat_together),
    },
    notes: row.notes || null,
    isActive: Boolean(row.is_active),
  };
}

export function listTalks(providerId: string, activeOnly = true): TalkRow[] {
  const sql = activeOnly
    ? `SELECT * FROM provider_talks WHERE provider_id = ? AND is_active = 1 ORDER BY created_at ASC`
    : `SELECT * FROM provider_talks WHERE provider_id = ? ORDER BY created_at ASC`;
  return db().prepare(sql).all(providerId) as TalkRow[];
}

export function getTalk(id: string): TalkRow | undefined {
  return db().prepare("SELECT * FROM provider_talks WHERE id = ?").get(id) as TalkRow | undefined;
}

export function countTalks(providerId: string, activeOnly = true) {
  const sql = activeOnly
    ? `SELECT COUNT(*) AS n FROM provider_talks WHERE provider_id = ? AND is_active = 1`
    : `SELECT COUNT(*) AS n FROM provider_talks WHERE provider_id = ?`;
  return (db().prepare(sql).get(providerId) as { n: number }).n;
}

const TALK_COLUMNS = `id, provider_id, name, description, photo_url,
         lang_en, lang_de, lang_es, lang_fr, lang_it, lang_ar, lang_other, lang_other_text,
         kind_speaking, kind_chat, kind_beginner, kind_vocab, kind_pronun, kind_grammar, kind_exam,
         level_a1, level_a2, level_b,
         dur_30, dur_45, dur_60, price,
         place_ev, place_ortak, place_online,
         mat_provider, mat_student, mat_together, notes, is_active, created_at`;

const TALK_PLACEHOLDERS = `@id, @provider_id, @name, @description, @photo_url,
         @lang_en, @lang_de, @lang_es, @lang_fr, @lang_it, @lang_ar, @lang_other, @lang_other_text,
         @kind_speaking, @kind_chat, @kind_beginner, @kind_vocab, @kind_pronun, @kind_grammar, @kind_exam,
         @level_a1, @level_a2, @level_b,
         @dur_30, @dur_45, @dur_60, @price,
         @place_ev, @place_ortak, @place_online,
         @mat_provider, @mat_student, @mat_together, @notes, @is_active, @created_at`;

export function upsertTalk(row: {
  id: string;
  provider_id: string;
  name: string;
  description?: string | null;
  langs?: TalkLang;
  langOther?: string | null;
  kinds?: TalkKind;
  levels?: TalkLevel;
  durations?: TalkDuration;
  price: number;
  place?: TalkPlace;
  materials?: TalkMaterials;
  notes?: string | null;
}) {
  const now = new Date().toISOString();
  const flags = flagRows(row);
  db()
    .prepare(
      `INSERT INTO provider_talks (
         ${TALK_COLUMNS}
       ) VALUES (
         @id, @provider_id, @name, @description, NULL,
         @lang_en, @lang_de, @lang_es, @lang_fr, @lang_it, @lang_ar, @lang_other, @lang_other_text,
         @kind_speaking, @kind_chat, @kind_beginner, @kind_vocab, @kind_pronun, @kind_grammar, @kind_exam,
         @level_a1, @level_a2, @level_b,
         @dur_30, @dur_45, @dur_60, @price,
         @place_ev, @place_ortak, @place_online,
         @mat_provider, @mat_student, @mat_together, @notes, 1, @now
       )
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         description = excluded.description,
         lang_en = excluded.lang_en,
         lang_de = excluded.lang_de,
         lang_es = excluded.lang_es,
         lang_fr = excluded.lang_fr,
         lang_it = excluded.lang_it,
         lang_ar = excluded.lang_ar,
         lang_other = excluded.lang_other,
         lang_other_text = excluded.lang_other_text,
         kind_speaking = excluded.kind_speaking,
         kind_chat = excluded.kind_chat,
         kind_beginner = excluded.kind_beginner,
         kind_vocab = excluded.kind_vocab,
         kind_pronun = excluded.kind_pronun,
         kind_grammar = excluded.kind_grammar,
         kind_exam = excluded.kind_exam,
         level_a1 = excluded.level_a1,
         level_a2 = excluded.level_a2,
         level_b = excluded.level_b,
         dur_30 = excluded.dur_30,
         dur_45 = excluded.dur_45,
         dur_60 = excluded.dur_60,
         price = excluded.price,
         place_ev = excluded.place_ev,
         place_ortak = excluded.place_ortak,
         place_online = excluded.place_online,
         mat_provider = excluded.mat_provider,
         mat_student = excluded.mat_student,
         mat_together = excluded.mat_together,
         notes = excluded.notes,
         is_active = 1`,
    )
    .run({
      id: row.id,
      provider_id: row.provider_id,
      name: row.name,
      description: row.description ?? null,
      ...flags,
      lang_other_text: row.langOther ?? null,
      price: row.price,
      notes: row.notes ?? null,
      now,
    });
}

export function insertTalk(providerId: string, input: TalkWrite): TalkRow {
  const flags = flagRows(input);
  const row = {
    id: randomUUID(),
    provider_id: providerId,
    name: input.name,
    description: input.description ?? null,
    photo_url: input.photoUrl ?? null,
    ...flags,
    lang_other_text: input.langOther ?? null,
    price: input.price,
    notes: input.notes ?? null,
    is_active: input.isActive === false ? 0 : 1,
    created_at: new Date().toISOString(),
  };
  db()
    .prepare(
      `INSERT INTO provider_talks (
         ${TALK_COLUMNS}
       ) VALUES (
         ${TALK_PLACEHOLDERS}
       )`,
    )
    .run(row);
  return getTalk(row.id)!;
}

export function updateTalk(id: string, providerId: string, input: TalkWrite): TalkRow | undefined {
  const current = getTalk(id);
  if (!current || current.provider_id !== providerId) return undefined;
  const flags = flagRows(input);
  db()
    .prepare(
      `UPDATE provider_talks SET
         name = @name,
         description = @description,
         photo_url = @photo_url,
         lang_en = @lang_en,
         lang_de = @lang_de,
         lang_es = @lang_es,
         lang_fr = @lang_fr,
         lang_it = @lang_it,
         lang_ar = @lang_ar,
         lang_other = @lang_other,
         lang_other_text = @lang_other_text,
         kind_speaking = @kind_speaking,
         kind_chat = @kind_chat,
         kind_beginner = @kind_beginner,
         kind_vocab = @kind_vocab,
         kind_pronun = @kind_pronun,
         kind_grammar = @kind_grammar,
         kind_exam = @kind_exam,
         level_a1 = @level_a1,
         level_a2 = @level_a2,
         level_b = @level_b,
         dur_30 = @dur_30,
         dur_45 = @dur_45,
         dur_60 = @dur_60,
         price = @price,
         place_ev = @place_ev,
         place_ortak = @place_ortak,
         place_online = @place_online,
         mat_provider = @mat_provider,
         mat_student = @mat_student,
         mat_together = @mat_together,
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
      lang_other_text: input.langOther ?? null,
      price: input.price,
      notes: input.notes ?? null,
      is_active: input.isActive === false ? 0 : 1,
    });
  return getTalk(id);
}

export function setTalkPhotoUrl(id: string, providerId: string, url: string | null) {
  const result = db()
    .prepare("UPDATE provider_talks SET photo_url = ? WHERE id = ? AND provider_id = ?")
    .run(url, id, providerId);
  return result.changes > 0;
}

export function deactivateTalk(id: string, providerId: string) {
  const result = db()
    .prepare(
      `UPDATE provider_talks SET is_active = 0
       WHERE id = ? AND provider_id = ? AND is_active = 1`,
    )
    .run(id, providerId);
  return result.changes > 0;
}

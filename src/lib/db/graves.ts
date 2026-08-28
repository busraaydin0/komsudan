import { randomUUID } from "node:crypto";
import { db } from "./client";
import type {
  GraveAvail,
  GraveFee,
  GraveFlower,
  GraveKind,
  GravePhotoSend,
  GravePrice,
  ProviderGrave,
} from "@/lib/types";

export type GraveRow = {
  id: string;
  provider_id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  kind_temizlik: number;
  kind_cicek: number;
  kind_sulama: number;
  kind_ot: number;
  kind_cevre: number;
  kind_ziyaret: number;
  kind_other: number;
  cemetery: string | null;
  radius_km: number;
  price: number;
  price_visit: number;
  price_job: number;
  price_monthly: number;
  price_other: number;
  flower_customer: number;
  flower_provider: number;
  flower_together: number;
  fee_included: number;
  fee_extra: number;
  duration_min: number | null;
  photo_before_after: number;
  photo_after: number;
  photo_none: number;
  avail_once: number;
  avail_weekly: number;
  avail_monthly: number;
  avail_days: number;
  work_hours: string | null;
  notes: string | null;
  is_active: number;
  created_at: string;
};

export type GraveWrite = {
  name: string;
  description?: string | null;
  photoUrl?: string | null;
  kinds?: GraveKind;
  cemetery?: string | null;
  radiusKm?: number;
  price: number;
  pricing?: GravePrice;
  flowers?: GraveFlower;
  fees?: GraveFee;
  durationMin?: number | null;
  photos?: GravePhotoSend;
  avails?: GraveAvail;
  workHours?: string | null;
  notes?: string | null;
  isActive?: boolean;
};

function flagRows(input: GraveWrite) {
  const k = input.kinds;
  const p = input.pricing;
  const f = input.flowers;
  const fee = input.fees;
  const ph = input.photos;
  const a = input.avails;
  return {
    kind_temizlik: k?.temizlik ? 1 : 0,
    kind_cicek: k?.cicek ? 1 : 0,
    kind_sulama: k?.sulama ? 1 : 0,
    kind_ot: k?.ot ? 1 : 0,
    kind_cevre: k?.cevre ? 1 : 0,
    kind_ziyaret: k?.ziyaret ? 1 : 0,
    kind_other: k?.other ? 1 : 0,
    price_visit: p?.visit ? 1 : 0,
    price_job: p?.job ? 1 : 0,
    price_monthly: p?.monthly ? 1 : 0,
    price_other: p?.other ? 1 : 0,
    flower_customer: f?.customer ? 1 : 0,
    flower_provider: f?.provider ? 1 : 0,
    flower_together: f?.together ? 1 : 0,
    fee_included: fee?.included ? 1 : 0,
    fee_extra: fee?.extra ? 1 : 0,
    photo_before_after: ph?.beforeAfter ? 1 : 0,
    photo_after: ph?.after ? 1 : 0,
    photo_none: ph?.none ? 1 : 0,
    avail_once: a?.once ? 1 : 0,
    avail_weekly: a?.weekly ? 1 : 0,
    avail_monthly: a?.monthly ? 1 : 0,
    avail_days: a?.days ? 1 : 0,
  };
}

export function toPublicGrave(row: GraveRow): ProviderGrave {
  return {
    id: row.id,
    name: row.name,
    description: row.description || null,
    photoUrl: row.photo_url || null,
    kinds: {
      temizlik: Boolean(row.kind_temizlik),
      cicek: Boolean(row.kind_cicek),
      sulama: Boolean(row.kind_sulama),
      ot: Boolean(row.kind_ot),
      cevre: Boolean(row.kind_cevre),
      ziyaret: Boolean(row.kind_ziyaret),
      other: Boolean(row.kind_other),
    },
    cemetery: row.cemetery || null,
    radiusKm: row.radius_km,
    price: row.price,
    pricing: {
      visit: Boolean(row.price_visit),
      job: Boolean(row.price_job),
      monthly: Boolean(row.price_monthly),
      other: Boolean(row.price_other),
    },
    flowers: {
      customer: Boolean(row.flower_customer),
      provider: Boolean(row.flower_provider),
      together: Boolean(row.flower_together),
    },
    fees: {
      included: Boolean(row.fee_included),
      extra: Boolean(row.fee_extra),
    },
    durationMin: row.duration_min,
    photos: {
      beforeAfter: Boolean(row.photo_before_after),
      after: Boolean(row.photo_after),
      none: Boolean(row.photo_none),
    },
    avails: {
      once: Boolean(row.avail_once),
      weekly: Boolean(row.avail_weekly),
      monthly: Boolean(row.avail_monthly),
      days: Boolean(row.avail_days),
    },
    workHours: row.work_hours || null,
    notes: row.notes || null,
    isActive: Boolean(row.is_active),
  };
}

export function listGraves(providerId: string, activeOnly = true): GraveRow[] {
  const sql = activeOnly
    ? `SELECT * FROM provider_graves WHERE provider_id = ? AND is_active = 1 ORDER BY created_at ASC`
    : `SELECT * FROM provider_graves WHERE provider_id = ? ORDER BY created_at ASC`;
  return db().prepare(sql).all(providerId) as GraveRow[];
}

export function getGrave(id: string): GraveRow | undefined {
  return db().prepare("SELECT * FROM provider_graves WHERE id = ?").get(id) as GraveRow | undefined;
}

export function countGraves(providerId: string, activeOnly = true) {
  const sql = activeOnly
    ? `SELECT COUNT(*) AS n FROM provider_graves WHERE provider_id = ? AND is_active = 1`
    : `SELECT COUNT(*) AS n FROM provider_graves WHERE provider_id = ?`;
  return (db().prepare(sql).get(providerId) as { n: number }).n;
}

const GRAVE_COLUMNS = `id, provider_id, name, description, photo_url,
         kind_temizlik, kind_cicek, kind_sulama, kind_ot, kind_cevre, kind_ziyaret, kind_other,
         cemetery, radius_km, price,
         price_visit, price_job, price_monthly, price_other,
         flower_customer, flower_provider, flower_together,
         fee_included, fee_extra, duration_min,
         photo_before_after, photo_after, photo_none,
         avail_once, avail_weekly, avail_monthly, avail_days,
         work_hours, notes, is_active, created_at`;

const GRAVE_PLACEHOLDERS = `@id, @provider_id, @name, @description, @photo_url,
         @kind_temizlik, @kind_cicek, @kind_sulama, @kind_ot, @kind_cevre, @kind_ziyaret, @kind_other,
         @cemetery, @radius_km, @price,
         @price_visit, @price_job, @price_monthly, @price_other,
         @flower_customer, @flower_provider, @flower_together,
         @fee_included, @fee_extra, @duration_min,
         @photo_before_after, @photo_after, @photo_none,
         @avail_once, @avail_weekly, @avail_monthly, @avail_days,
         @work_hours, @notes, @is_active, @created_at`;

export function upsertGrave(row: {
  id: string;
  provider_id: string;
  name: string;
  description?: string | null;
  kinds?: GraveKind;
  cemetery?: string | null;
  radiusKm?: number;
  price: number;
  pricing?: GravePrice;
  flowers?: GraveFlower;
  fees?: GraveFee;
  durationMin?: number | null;
  photos?: GravePhotoSend;
  avails?: GraveAvail;
  workHours?: string | null;
  notes?: string | null;
}) {
  const now = new Date().toISOString();
  const flags = flagRows(row);
  db()
    .prepare(
      `INSERT INTO provider_graves (
         ${GRAVE_COLUMNS}
       ) VALUES (
         @id, @provider_id, @name, @description, NULL,
         @kind_temizlik, @kind_cicek, @kind_sulama, @kind_ot, @kind_cevre, @kind_ziyaret, @kind_other,
         @cemetery, @radius_km, @price,
         @price_visit, @price_job, @price_monthly, @price_other,
         @flower_customer, @flower_provider, @flower_together,
         @fee_included, @fee_extra, @duration_min,
         @photo_before_after, @photo_after, @photo_none,
         @avail_once, @avail_weekly, @avail_monthly, @avail_days,
         @work_hours, @notes, 1, @now
       )
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         description = excluded.description,
         kind_temizlik = excluded.kind_temizlik,
         kind_cicek = excluded.kind_cicek,
         kind_sulama = excluded.kind_sulama,
         kind_ot = excluded.kind_ot,
         kind_cevre = excluded.kind_cevre,
         kind_ziyaret = excluded.kind_ziyaret,
         kind_other = excluded.kind_other,
         cemetery = excluded.cemetery,
         radius_km = excluded.radius_km,
         price = excluded.price,
         price_visit = excluded.price_visit,
         price_job = excluded.price_job,
         price_monthly = excluded.price_monthly,
         price_other = excluded.price_other,
         flower_customer = excluded.flower_customer,
         flower_provider = excluded.flower_provider,
         flower_together = excluded.flower_together,
         fee_included = excluded.fee_included,
         fee_extra = excluded.fee_extra,
         duration_min = excluded.duration_min,
         photo_before_after = excluded.photo_before_after,
         photo_after = excluded.photo_after,
         photo_none = excluded.photo_none,
         avail_once = excluded.avail_once,
         avail_weekly = excluded.avail_weekly,
         avail_monthly = excluded.avail_monthly,
         avail_days = excluded.avail_days,
         work_hours = excluded.work_hours,
         notes = excluded.notes,
         is_active = 1`,
    )
    .run({
      id: row.id,
      provider_id: row.provider_id,
      name: row.name,
      description: row.description ?? null,
      ...flags,
      cemetery: row.cemetery ?? null,
      radius_km: row.radiusKm ?? 10,
      price: row.price,
      duration_min: row.durationMin ?? null,
      work_hours: row.workHours ?? null,
      notes: row.notes ?? null,
      now,
    });
}

export function insertGrave(providerId: string, input: GraveWrite): GraveRow {
  const flags = flagRows(input);
  const row = {
    id: randomUUID(),
    provider_id: providerId,
    name: input.name,
    description: input.description ?? null,
    photo_url: input.photoUrl ?? null,
    ...flags,
    cemetery: input.cemetery ?? null,
    radius_km: input.radiusKm ?? 10,
    price: input.price,
    duration_min: input.durationMin ?? null,
    work_hours: input.workHours ?? null,
    notes: input.notes ?? null,
    is_active: input.isActive === false ? 0 : 1,
    created_at: new Date().toISOString(),
  };
  db()
    .prepare(
      `INSERT INTO provider_graves (
         ${GRAVE_COLUMNS}
       ) VALUES (
         ${GRAVE_PLACEHOLDERS}
       )`,
    )
    .run(row);
  return getGrave(row.id)!;
}

export function updateGrave(id: string, providerId: string, input: GraveWrite): GraveRow | undefined {
  const current = getGrave(id);
  if (!current || current.provider_id !== providerId) return undefined;
  const flags = flagRows(input);
  db()
    .prepare(
      `UPDATE provider_graves SET
         name = @name,
         description = @description,
         photo_url = @photo_url,
         kind_temizlik = @kind_temizlik,
         kind_cicek = @kind_cicek,
         kind_sulama = @kind_sulama,
         kind_ot = @kind_ot,
         kind_cevre = @kind_cevre,
         kind_ziyaret = @kind_ziyaret,
         kind_other = @kind_other,
         cemetery = @cemetery,
         radius_km = @radius_km,
         price = @price,
         price_visit = @price_visit,
         price_job = @price_job,
         price_monthly = @price_monthly,
         price_other = @price_other,
         flower_customer = @flower_customer,
         flower_provider = @flower_provider,
         flower_together = @flower_together,
         fee_included = @fee_included,
         fee_extra = @fee_extra,
         duration_min = @duration_min,
         photo_before_after = @photo_before_after,
         photo_after = @photo_after,
         photo_none = @photo_none,
         avail_once = @avail_once,
         avail_weekly = @avail_weekly,
         avail_monthly = @avail_monthly,
         avail_days = @avail_days,
         work_hours = @work_hours,
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
      cemetery: input.cemetery ?? null,
      radius_km: input.radiusKm ?? 10,
      price: input.price,
      duration_min: input.durationMin ?? null,
      work_hours: input.workHours ?? null,
      notes: input.notes ?? null,
      is_active: input.isActive === false ? 0 : 1,
    });
  return getGrave(id);
}

export function setGravePhotoUrl(id: string, providerId: string, url: string | null) {
  const result = db()
    .prepare("UPDATE provider_graves SET photo_url = ? WHERE id = ? AND provider_id = ?")
    .run(url, id, providerId);
  return result.changes > 0;
}

export function deactivateGrave(id: string, providerId: string) {
  const result = db()
    .prepare(
      `UPDATE provider_graves SET is_active = 0
       WHERE id = ? AND provider_id = ? AND is_active = 1`,
    )
    .run(id, providerId);
  return result.changes > 0;
}

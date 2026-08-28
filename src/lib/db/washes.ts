import { randomUUID } from "node:crypto";
import { db } from "./client";
import type {
  ProviderWash,
  WashBooking,
  WashIncludes,
  WashJob,
  WashMaterials,
  WashVehicle,
} from "@/lib/types";

export type WashRow = {
  id: string;
  provider_id: string;
  name: string;
  description: string | null;
  job: string;
  vehicle: string;
  photo_url: string | null;
  price: number;
  include_dis: number;
  include_supurme: number;
  include_cam: number;
  include_torpido: number;
  include_jant: number;
  include_kurulama: number;
  duration_min: number | null;
  max_per_day: number | null;
  booking: string;
  location: string | null;
  work_hours: string | null;
  materials: string;
  notes: string | null;
  is_active: number;
  created_at: string;
};

export type WashWrite = {
  name: string;
  description?: string | null;
  job?: WashJob;
  vehicle?: WashVehicle;
  photoUrl?: string | null;
  price: number;
  includes?: WashIncludes;
  durationMin?: number | null;
  maxPerDay?: number | null;
  booking?: WashBooking;
  location?: string | null;
  workHours?: string | null;
  materials?: WashMaterials;
  notes?: string | null;
  isActive?: boolean;
};

function asJob(raw: string | null | undefined): WashJob {
  if (raw === "dis" || raw === "ic" || raw === "icdis") return raw;
  return "dis";
}

function asVehicle(raw: string | null | undefined): WashVehicle {
  if (raw === "otomobil" || raw === "suv" || raw === "ticari" || raw === "diger") return raw;
  return "otomobil";
}

function asBooking(raw: string | null | undefined): WashBooking {
  if (raw === "randevu" || raw === "musait") return raw;
  return "musait";
}

function asMaterials(raw: string | null | undefined): WashMaterials {
  if (raw === "provider" || raw === "customer") return raw;
  return "provider";
}

function includeFlags(input?: WashIncludes) {
  return {
    include_dis: input?.dis ? 1 : 0,
    include_supurme: input?.supurme ? 1 : 0,
    include_cam: input?.cam ? 1 : 0,
    include_torpido: input?.torpido ? 1 : 0,
    include_jant: input?.jant ? 1 : 0,
    include_kurulama: input?.kurulama ? 1 : 0,
  };
}

export function toPublicWash(row: WashRow): ProviderWash {
  return {
    id: row.id,
    name: row.name,
    description: row.description || null,
    job: asJob(row.job),
    vehicle: asVehicle(row.vehicle),
    photoUrl: row.photo_url || null,
    price: row.price,
    includes: {
      dis: Boolean(row.include_dis),
      supurme: Boolean(row.include_supurme),
      cam: Boolean(row.include_cam),
      torpido: Boolean(row.include_torpido),
      jant: Boolean(row.include_jant),
      kurulama: Boolean(row.include_kurulama),
    },
    durationMin: row.duration_min,
    maxPerDay: row.max_per_day,
    booking: asBooking(row.booking),
    location: row.location || null,
    workHours: row.work_hours || null,
    materials: asMaterials(row.materials),
    notes: row.notes || null,
    isActive: Boolean(row.is_active),
  };
}

export function listWashes(providerId: string, activeOnly = true): WashRow[] {
  const sql = activeOnly
    ? `SELECT * FROM provider_washes WHERE provider_id = ? AND is_active = 1 ORDER BY created_at ASC`
    : `SELECT * FROM provider_washes WHERE provider_id = ? ORDER BY created_at ASC`;
  return db().prepare(sql).all(providerId) as WashRow[];
}

export function getWash(id: string): WashRow | undefined {
  return db().prepare("SELECT * FROM provider_washes WHERE id = ?").get(id) as WashRow | undefined;
}

export function countWashes(providerId: string, activeOnly = true) {
  const sql = activeOnly
    ? `SELECT COUNT(*) AS n FROM provider_washes WHERE provider_id = ? AND is_active = 1`
    : `SELECT COUNT(*) AS n FROM provider_washes WHERE provider_id = ?`;
  return (db().prepare(sql).get(providerId) as { n: number }).n;
}

const WASH_COLUMNS = `id, provider_id, name, description, job, vehicle, photo_url, price,
         include_dis, include_supurme, include_cam, include_torpido, include_jant, include_kurulama,
         duration_min, max_per_day, booking, location, work_hours, materials, notes, is_active, created_at`;

export function upsertWash(row: {
  id: string;
  provider_id: string;
  name: string;
  description?: string | null;
  job?: WashJob;
  vehicle?: WashVehicle;
  price: number;
  includes?: WashIncludes;
  durationMin?: number | null;
  maxPerDay?: number | null;
  booking?: WashBooking;
  location?: string | null;
  workHours?: string | null;
  materials?: WashMaterials;
  notes?: string | null;
}) {
  const now = new Date().toISOString();
  const flags = includeFlags(row.includes);
  db()
    .prepare(
      `INSERT INTO provider_washes (
         ${WASH_COLUMNS}
       ) VALUES (
         @id, @provider_id, @name, @description, @job, @vehicle, NULL, @price,
         @include_dis, @include_supurme, @include_cam, @include_torpido, @include_jant, @include_kurulama,
         @duration_min, @max_per_day, @booking, @location, @work_hours, @materials, @notes, 1, @now
       )
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         description = excluded.description,
         job = excluded.job,
         vehicle = excluded.vehicle,
         price = excluded.price,
         include_dis = excluded.include_dis,
         include_supurme = excluded.include_supurme,
         include_cam = excluded.include_cam,
         include_torpido = excluded.include_torpido,
         include_jant = excluded.include_jant,
         include_kurulama = excluded.include_kurulama,
         duration_min = excluded.duration_min,
         max_per_day = excluded.max_per_day,
         booking = excluded.booking,
         location = excluded.location,
         work_hours = excluded.work_hours,
         materials = excluded.materials,
         notes = excluded.notes,
         is_active = 1`,
    )
    .run({
      id: row.id,
      provider_id: row.provider_id,
      name: row.name,
      description: row.description ?? null,
      job: row.job ?? "dis",
      vehicle: row.vehicle ?? "otomobil",
      price: row.price,
      ...flags,
      duration_min: row.durationMin ?? null,
      max_per_day: row.maxPerDay ?? null,
      booking: row.booking ?? "musait",
      location: row.location ?? null,
      work_hours: row.workHours ?? null,
      materials: row.materials ?? "provider",
      notes: row.notes ?? null,
      now,
    });
}

export function insertWash(providerId: string, input: WashWrite): WashRow {
  const flags = includeFlags(input.includes);
  const row = {
    id: randomUUID(),
    provider_id: providerId,
    name: input.name,
    description: input.description ?? null,
    job: input.job ?? "dis",
    vehicle: input.vehicle ?? "otomobil",
    photo_url: input.photoUrl ?? null,
    price: input.price,
    ...flags,
    duration_min: input.durationMin ?? null,
    max_per_day: input.maxPerDay ?? null,
    booking: input.booking ?? "musait",
    location: input.location ?? null,
    work_hours: input.workHours ?? null,
    materials: input.materials ?? "provider",
    notes: input.notes ?? null,
    is_active: input.isActive === false ? 0 : 1,
    created_at: new Date().toISOString(),
  };
  db()
    .prepare(
      `INSERT INTO provider_washes (
         ${WASH_COLUMNS}
       ) VALUES (
         @id, @provider_id, @name, @description, @job, @vehicle, @photo_url, @price,
         @include_dis, @include_supurme, @include_cam, @include_torpido, @include_jant, @include_kurulama,
         @duration_min, @max_per_day, @booking, @location, @work_hours, @materials, @notes, @is_active, @created_at
       )`,
    )
    .run(row);
  return getWash(row.id)!;
}

export function updateWash(id: string, providerId: string, input: WashWrite): WashRow | undefined {
  const current = getWash(id);
  if (!current || current.provider_id !== providerId) return undefined;
  const flags = includeFlags(input.includes);
  db()
    .prepare(
      `UPDATE provider_washes SET
         name = @name,
         description = @description,
         job = @job,
         vehicle = @vehicle,
         photo_url = @photo_url,
         price = @price,
         include_dis = @include_dis,
         include_supurme = @include_supurme,
         include_cam = @include_cam,
         include_torpido = @include_torpido,
         include_jant = @include_jant,
         include_kurulama = @include_kurulama,
         duration_min = @duration_min,
         max_per_day = @max_per_day,
         booking = @booking,
         location = @location,
         work_hours = @work_hours,
         materials = @materials,
         notes = @notes,
         is_active = @is_active
       WHERE id = @id AND provider_id = @providerId`,
    )
    .run({
      id,
      providerId,
      name: input.name,
      description: input.description ?? null,
      job: input.job ?? "dis",
      vehicle: input.vehicle ?? "otomobil",
      photo_url: input.photoUrl === undefined ? current.photo_url : input.photoUrl,
      price: input.price,
      ...flags,
      duration_min: input.durationMin ?? null,
      max_per_day: input.maxPerDay ?? null,
      booking: input.booking ?? "musait",
      location: input.location ?? null,
      work_hours: input.workHours ?? null,
      materials: input.materials ?? "provider",
      notes: input.notes ?? null,
      is_active: input.isActive === false ? 0 : 1,
    });
  return getWash(id);
}

export function setWashPhotoUrl(id: string, providerId: string, url: string | null) {
  const result = db()
    .prepare("UPDATE provider_washes SET photo_url = ? WHERE id = ? AND provider_id = ?")
    .run(url, id, providerId);
  return result.changes > 0;
}

export function deactivateWash(id: string, providerId: string) {
  const result = db()
    .prepare(
      `UPDATE provider_washes SET is_active = 0
       WHERE id = ? AND provider_id = ? AND is_active = 1`,
    )
    .run(id, providerId);
  return result.changes > 0;
}

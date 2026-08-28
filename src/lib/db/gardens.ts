import { randomUUID } from "node:crypto";
import { db } from "./client";
import type {
  GardenArea,
  GardenAvail,
  GardenEquipment,
  GardenJobs,
  GardenPriceType,
  ProviderGarden,
} from "@/lib/types";

export type GardenRow = {
  id: string;
  provider_id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  job_cim: number;
  job_budama: number;
  job_ot: number;
  job_yaprak: number;
  job_dikim: number;
  job_saksi: number;
  job_tasima: number;
  job_sulama: number;
  job_duzen: number;
  job_diger: number;
  area_kucuk: number;
  area_orta: number;
  area_buyuk: number;
  price: number;
  price_type: string;
  duration_min: number | null;
  equipment: string;
  location: string | null;
  max_km: number;
  avail: string;
  work_hours: string | null;
  can_do: string | null;
  cannot_do: string | null;
  notes: string | null;
  is_active: number;
  created_at: string;
};

export type GardenWrite = {
  name: string;
  description?: string | null;
  photoUrl?: string | null;
  jobs?: GardenJobs;
  areas?: GardenArea;
  price: number;
  priceType?: GardenPriceType;
  durationMin?: number | null;
  equipment?: GardenEquipment;
  location?: string | null;
  maxKm?: number;
  avail?: GardenAvail;
  workHours?: string | null;
  canDo?: string | null;
  cannotDo?: string | null;
  notes?: string | null;
  isActive?: boolean;
};

function asPriceType(raw: string | null | undefined): GardenPriceType {
  if (raw === "sabit" || raw === "alan" || raw === "durum") return raw;
  return "sabit";
}

function asEquipment(raw: string | null | undefined): GardenEquipment {
  if (raw === "provider" || raw === "customer" || raw === "none") return raw;
  return "provider";
}

function asAvail(raw: string | null | undefined): GardenAvail {
  if (raw === "hemen" || raw === "randevu" || raw === "gun") return raw;
  return "randevu";
}

function flagRows(input: GardenWrite) {
  const j = input.jobs;
  const a = input.areas;
  return {
    job_cim: j?.cim ? 1 : 0,
    job_budama: j?.budama ? 1 : 0,
    job_ot: j?.ot ? 1 : 0,
    job_yaprak: j?.yaprak ? 1 : 0,
    job_dikim: j?.dikim ? 1 : 0,
    job_saksi: j?.saksi ? 1 : 0,
    job_tasima: j?.tasima ? 1 : 0,
    job_sulama: j?.sulama ? 1 : 0,
    job_duzen: j?.duzen ? 1 : 0,
    job_diger: j?.diger ? 1 : 0,
    area_kucuk: a?.kucuk ? 1 : 0,
    area_orta: a?.orta ? 1 : 0,
    area_buyuk: a?.buyuk ? 1 : 0,
  };
}

export function toPublicGarden(row: GardenRow): ProviderGarden {
  return {
    id: row.id,
    name: row.name,
    description: row.description || null,
    photoUrl: row.photo_url || null,
    jobs: {
      cim: Boolean(row.job_cim),
      budama: Boolean(row.job_budama),
      ot: Boolean(row.job_ot),
      yaprak: Boolean(row.job_yaprak),
      dikim: Boolean(row.job_dikim),
      saksi: Boolean(row.job_saksi),
      tasima: Boolean(row.job_tasima),
      sulama: Boolean(row.job_sulama),
      duzen: Boolean(row.job_duzen),
      diger: Boolean(row.job_diger),
    },
    areas: {
      kucuk: Boolean(row.area_kucuk),
      orta: Boolean(row.area_orta),
      buyuk: Boolean(row.area_buyuk),
    },
    price: row.price,
    priceType: asPriceType(row.price_type),
    durationMin: row.duration_min,
    equipment: asEquipment(row.equipment),
    location: row.location || null,
    maxKm: row.max_km,
    avail: asAvail(row.avail),
    workHours: row.work_hours || null,
    canDo: row.can_do || null,
    cannotDo: row.cannot_do || null,
    notes: row.notes || null,
    isActive: Boolean(row.is_active),
  };
}

export function listGardens(providerId: string, activeOnly = true): GardenRow[] {
  const sql = activeOnly
    ? `SELECT * FROM provider_gardens WHERE provider_id = ? AND is_active = 1 ORDER BY created_at ASC`
    : `SELECT * FROM provider_gardens WHERE provider_id = ? ORDER BY created_at ASC`;
  return db().prepare(sql).all(providerId) as GardenRow[];
}

export function getGarden(id: string): GardenRow | undefined {
  return db().prepare("SELECT * FROM provider_gardens WHERE id = ?").get(id) as GardenRow | undefined;
}

export function countGardens(providerId: string, activeOnly = true) {
  const sql = activeOnly
    ? `SELECT COUNT(*) AS n FROM provider_gardens WHERE provider_id = ? AND is_active = 1`
    : `SELECT COUNT(*) AS n FROM provider_gardens WHERE provider_id = ?`;
  return (db().prepare(sql).get(providerId) as { n: number }).n;
}

const GARDEN_COLUMNS = `id, provider_id, name, description, photo_url,
         job_cim, job_budama, job_ot, job_yaprak, job_dikim, job_saksi, job_tasima, job_sulama, job_duzen, job_diger,
         area_kucuk, area_orta, area_buyuk, price, price_type, duration_min, equipment, location, max_km,
         avail, work_hours, can_do, cannot_do, notes, is_active, created_at`;

const GARDEN_PLACEHOLDERS = `@id, @provider_id, @name, @description, @photo_url,
         @job_cim, @job_budama, @job_ot, @job_yaprak, @job_dikim, @job_saksi, @job_tasima, @job_sulama, @job_duzen, @job_diger,
         @area_kucuk, @area_orta, @area_buyuk, @price, @price_type, @duration_min, @equipment, @location, @max_km,
         @avail, @work_hours, @can_do, @cannot_do, @notes, @is_active, @created_at`;

export function upsertGarden(row: {
  id: string;
  provider_id: string;
  name: string;
  description?: string | null;
  jobs?: GardenJobs;
  areas?: GardenArea;
  price: number;
  priceType?: GardenPriceType;
  durationMin?: number | null;
  equipment?: GardenEquipment;
  location?: string | null;
  maxKm?: number;
  avail?: GardenAvail;
  workHours?: string | null;
  canDo?: string | null;
  cannotDo?: string | null;
  notes?: string | null;
}) {
  const now = new Date().toISOString();
  const flags = flagRows(row);
  db()
    .prepare(
      `INSERT INTO provider_gardens (
         ${GARDEN_COLUMNS}
       ) VALUES (
         @id, @provider_id, @name, @description, NULL,
         @job_cim, @job_budama, @job_ot, @job_yaprak, @job_dikim, @job_saksi, @job_tasima, @job_sulama, @job_duzen, @job_diger,
         @area_kucuk, @area_orta, @area_buyuk, @price, @price_type, @duration_min, @equipment, @location, @max_km,
         @avail, @work_hours, @can_do, @cannot_do, @notes, 1, @now
       )
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         description = excluded.description,
         job_cim = excluded.job_cim,
         job_budama = excluded.job_budama,
         job_ot = excluded.job_ot,
         job_yaprak = excluded.job_yaprak,
         job_dikim = excluded.job_dikim,
         job_saksi = excluded.job_saksi,
         job_tasima = excluded.job_tasima,
         job_sulama = excluded.job_sulama,
         job_duzen = excluded.job_duzen,
         job_diger = excluded.job_diger,
         area_kucuk = excluded.area_kucuk,
         area_orta = excluded.area_orta,
         area_buyuk = excluded.area_buyuk,
         price = excluded.price,
         price_type = excluded.price_type,
         duration_min = excluded.duration_min,
         equipment = excluded.equipment,
         location = excluded.location,
         max_km = excluded.max_km,
         avail = excluded.avail,
         work_hours = excluded.work_hours,
         can_do = excluded.can_do,
         cannot_do = excluded.cannot_do,
         notes = excluded.notes,
         is_active = 1`,
    )
    .run({
      id: row.id,
      provider_id: row.provider_id,
      name: row.name,
      description: row.description ?? null,
      ...flags,
      price: row.price,
      price_type: row.priceType ?? "sabit",
      duration_min: row.durationMin ?? null,
      equipment: row.equipment ?? "provider",
      location: row.location ?? null,
      max_km: row.maxKm ?? 5,
      avail: row.avail ?? "randevu",
      work_hours: row.workHours ?? null,
      can_do: row.canDo ?? null,
      cannot_do: row.cannotDo ?? null,
      notes: row.notes ?? null,
      now,
    });
}

export function insertGarden(providerId: string, input: GardenWrite): GardenRow {
  const flags = flagRows(input);
  const row = {
    id: randomUUID(),
    provider_id: providerId,
    name: input.name,
    description: input.description ?? null,
    photo_url: input.photoUrl ?? null,
    ...flags,
    price: input.price,
    price_type: input.priceType ?? "sabit",
    duration_min: input.durationMin ?? null,
    equipment: input.equipment ?? "provider",
    location: input.location ?? null,
    max_km: input.maxKm ?? 5,
    avail: input.avail ?? "randevu",
    work_hours: input.workHours ?? null,
    can_do: input.canDo ?? null,
    cannot_do: input.cannotDo ?? null,
    notes: input.notes ?? null,
    is_active: input.isActive === false ? 0 : 1,
    created_at: new Date().toISOString(),
  };
  db()
    .prepare(
      `INSERT INTO provider_gardens (
         ${GARDEN_COLUMNS}
       ) VALUES (
         ${GARDEN_PLACEHOLDERS}
       )`,
    )
    .run(row);
  return getGarden(row.id)!;
}

export function updateGarden(id: string, providerId: string, input: GardenWrite): GardenRow | undefined {
  const current = getGarden(id);
  if (!current || current.provider_id !== providerId) return undefined;
  const flags = flagRows(input);
  db()
    .prepare(
      `UPDATE provider_gardens SET
         name = @name,
         description = @description,
         photo_url = @photo_url,
         job_cim = @job_cim,
         job_budama = @job_budama,
         job_ot = @job_ot,
         job_yaprak = @job_yaprak,
         job_dikim = @job_dikim,
         job_saksi = @job_saksi,
         job_tasima = @job_tasima,
         job_sulama = @job_sulama,
         job_duzen = @job_duzen,
         job_diger = @job_diger,
         area_kucuk = @area_kucuk,
         area_orta = @area_orta,
         area_buyuk = @area_buyuk,
         price = @price,
         price_type = @price_type,
         duration_min = @duration_min,
         equipment = @equipment,
         location = @location,
         max_km = @max_km,
         avail = @avail,
         work_hours = @work_hours,
         can_do = @can_do,
         cannot_do = @cannot_do,
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
      price: input.price,
      price_type: input.priceType ?? "sabit",
      duration_min: input.durationMin ?? null,
      equipment: input.equipment ?? "provider",
      location: input.location ?? null,
      max_km: input.maxKm ?? 5,
      avail: input.avail ?? "randevu",
      work_hours: input.workHours ?? null,
      can_do: input.canDo ?? null,
      cannot_do: input.cannotDo ?? null,
      notes: input.notes ?? null,
      is_active: input.isActive === false ? 0 : 1,
    });
  return getGarden(id);
}

export function setGardenPhotoUrl(id: string, providerId: string, url: string | null) {
  const result = db()
    .prepare("UPDATE provider_gardens SET photo_url = ? WHERE id = ? AND provider_id = ?")
    .run(url, id, providerId);
  return result.changes > 0;
}

export function deactivateGarden(id: string, providerId: string) {
  const result = db()
    .prepare(
      `UPDATE provider_gardens SET is_active = 0
       WHERE id = ? AND provider_id = ? AND is_active = 1`,
    )
    .run(id, providerId);
  return result.changes > 0;
}

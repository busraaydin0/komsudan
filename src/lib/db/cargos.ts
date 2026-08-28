import { randomUUID } from "node:crypto";
import { db } from "./client";
import type {
  CargoAvail,
  CargoConfirm,
  CargoDrop,
  CargoJobs,
  CargoPickup,
  CargoPriceType,
  CargoSize,
  ProviderCargo,
} from "@/lib/types";

export type CargoRow = {
  id: string;
  provider_id: string;
  name: string;
  photo_url: string | null;
  job_sube_al: number;
  job_sube_birak: number;
  job_nokta_nokta: number;
  job_al_nokta: number;
  job_teslim_sube: number;
  size_kucuk: number;
  size_orta: number;
  size_buyuk: number;
  max_km: number;
  branches: string | null;
  points: string | null;
  price: number;
  price_type: string;
  duration_min: number | null;
  avail: string;
  work_hours: string | null;
  pick_sube: number;
  pick_adres: number;
  pick_nokta: number;
  drop_sube: number;
  drop_adres: number;
  drop_nokta: number;
  confirm_kod: number;
  confirm_app: number;
  refuse: string | null;
  notes: string | null;
  is_active: number;
  created_at: string;
};

export type CargoWrite = {
  name: string;
  photoUrl?: string | null;
  jobs?: CargoJobs;
  sizes?: CargoSize;
  maxKm?: number;
  branches?: string | null;
  points?: string | null;
  price: number;
  priceType?: CargoPriceType;
  durationMin?: number | null;
  avail?: CargoAvail;
  workHours?: string | null;
  pickup?: CargoPickup;
  dropoff?: CargoDrop;
  confirm?: CargoConfirm;
  refuse?: string | null;
  notes?: string | null;
  isActive?: boolean;
};

function asPriceType(raw: string | null | undefined): CargoPriceType {
  if (raw === "sabit" || raw === "mesafe") return raw;
  return "sabit";
}

function asAvail(raw: string | null | undefined): CargoAvail {
  if (raw === "hemen" || raw === "randevu" || raw === "saat") return raw;
  return "hemen";
}

function flagRows(input: CargoWrite) {
  const j = input.jobs;
  const s = input.sizes;
  const p = input.pickup;
  const d = input.dropoff;
  const k = input.confirm;
  return {
    job_sube_al: j?.subeAl ? 1 : 0,
    job_sube_birak: j?.subeBirak ? 1 : 0,
    job_nokta_nokta: j?.noktaNokta ? 1 : 0,
    job_al_nokta: j?.alNokta ? 1 : 0,
    job_teslim_sube: j?.teslimSube ? 1 : 0,
    size_kucuk: s?.kucuk ? 1 : 0,
    size_orta: s?.orta ? 1 : 0,
    size_buyuk: s?.buyuk ? 1 : 0,
    pick_sube: p?.sube ? 1 : 0,
    pick_adres: p?.adres ? 1 : 0,
    pick_nokta: p?.nokta ? 1 : 0,
    drop_sube: d?.sube ? 1 : 0,
    drop_adres: d?.adres ? 1 : 0,
    drop_nokta: d?.nokta ? 1 : 0,
    confirm_kod: k?.kod ? 1 : 0,
    confirm_app: k?.app ? 1 : 0,
  };
}

export function toPublicCargo(row: CargoRow): ProviderCargo {
  return {
    id: row.id,
    name: row.name,
    photoUrl: row.photo_url || null,
    jobs: {
      subeAl: Boolean(row.job_sube_al),
      subeBirak: Boolean(row.job_sube_birak),
      noktaNokta: Boolean(row.job_nokta_nokta),
      alNokta: Boolean(row.job_al_nokta),
      teslimSube: Boolean(row.job_teslim_sube),
    },
    sizes: {
      kucuk: Boolean(row.size_kucuk),
      orta: Boolean(row.size_orta),
      buyuk: Boolean(row.size_buyuk),
    },
    maxKm: row.max_km,
    branches: row.branches || null,
    points: row.points || null,
    price: row.price,
    priceType: asPriceType(row.price_type),
    durationMin: row.duration_min,
    avail: asAvail(row.avail),
    workHours: row.work_hours || null,
    pickup: {
      sube: Boolean(row.pick_sube),
      adres: Boolean(row.pick_adres),
      nokta: Boolean(row.pick_nokta),
    },
    dropoff: {
      sube: Boolean(row.drop_sube),
      adres: Boolean(row.drop_adres),
      nokta: Boolean(row.drop_nokta),
    },
    confirm: {
      kod: Boolean(row.confirm_kod),
      app: Boolean(row.confirm_app),
    },
    refuse: row.refuse || null,
    notes: row.notes || null,
    isActive: Boolean(row.is_active),
  };
}

export function listCargos(providerId: string, activeOnly = true): CargoRow[] {
  const sql = activeOnly
    ? `SELECT * FROM provider_cargos WHERE provider_id = ? AND is_active = 1 ORDER BY created_at ASC`
    : `SELECT * FROM provider_cargos WHERE provider_id = ? ORDER BY created_at ASC`;
  return db().prepare(sql).all(providerId) as CargoRow[];
}

export function getCargo(id: string): CargoRow | undefined {
  return db().prepare("SELECT * FROM provider_cargos WHERE id = ?").get(id) as CargoRow | undefined;
}

export function countCargos(providerId: string, activeOnly = true) {
  const sql = activeOnly
    ? `SELECT COUNT(*) AS n FROM provider_cargos WHERE provider_id = ? AND is_active = 1`
    : `SELECT COUNT(*) AS n FROM provider_cargos WHERE provider_id = ?`;
  return (db().prepare(sql).get(providerId) as { n: number }).n;
}

const CARGO_COLUMNS = `id, provider_id, name, photo_url,
         job_sube_al, job_sube_birak, job_nokta_nokta, job_al_nokta, job_teslim_sube,
         size_kucuk, size_orta, size_buyuk, max_km, branches, points, price, price_type, duration_min,
         avail, work_hours, pick_sube, pick_adres, pick_nokta, drop_sube, drop_adres, drop_nokta,
         confirm_kod, confirm_app, refuse, notes, is_active, created_at`;

const CARGO_PLACEHOLDERS = `@id, @provider_id, @name, @photo_url,
         @job_sube_al, @job_sube_birak, @job_nokta_nokta, @job_al_nokta, @job_teslim_sube,
         @size_kucuk, @size_orta, @size_buyuk, @max_km, @branches, @points, @price, @price_type, @duration_min,
         @avail, @work_hours, @pick_sube, @pick_adres, @pick_nokta, @drop_sube, @drop_adres, @drop_nokta,
         @confirm_kod, @confirm_app, @refuse, @notes, @is_active, @created_at`;

export function upsertCargo(row: {
  id: string;
  provider_id: string;
  name: string;
  jobs?: CargoJobs;
  sizes?: CargoSize;
  maxKm?: number;
  branches?: string | null;
  points?: string | null;
  price: number;
  priceType?: CargoPriceType;
  durationMin?: number | null;
  avail?: CargoAvail;
  workHours?: string | null;
  pickup?: CargoPickup;
  dropoff?: CargoDrop;
  confirm?: CargoConfirm;
  refuse?: string | null;
  notes?: string | null;
}) {
  const now = new Date().toISOString();
  const flags = flagRows(row);
  db()
    .prepare(
      `INSERT INTO provider_cargos (
         ${CARGO_COLUMNS}
       ) VALUES (
         @id, @provider_id, @name, NULL,
         @job_sube_al, @job_sube_birak, @job_nokta_nokta, @job_al_nokta, @job_teslim_sube,
         @size_kucuk, @size_orta, @size_buyuk, @max_km, @branches, @points, @price, @price_type, @duration_min,
         @avail, @work_hours, @pick_sube, @pick_adres, @pick_nokta, @drop_sube, @drop_adres, @drop_nokta,
         @confirm_kod, @confirm_app, @refuse, @notes, 1, @now
       )
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         job_sube_al = excluded.job_sube_al,
         job_sube_birak = excluded.job_sube_birak,
         job_nokta_nokta = excluded.job_nokta_nokta,
         job_al_nokta = excluded.job_al_nokta,
         job_teslim_sube = excluded.job_teslim_sube,
         size_kucuk = excluded.size_kucuk,
         size_orta = excluded.size_orta,
         size_buyuk = excluded.size_buyuk,
         max_km = excluded.max_km,
         branches = excluded.branches,
         points = excluded.points,
         price = excluded.price,
         price_type = excluded.price_type,
         duration_min = excluded.duration_min,
         avail = excluded.avail,
         work_hours = excluded.work_hours,
         pick_sube = excluded.pick_sube,
         pick_adres = excluded.pick_adres,
         pick_nokta = excluded.pick_nokta,
         drop_sube = excluded.drop_sube,
         drop_adres = excluded.drop_adres,
         drop_nokta = excluded.drop_nokta,
         confirm_kod = excluded.confirm_kod,
         confirm_app = excluded.confirm_app,
         refuse = excluded.refuse,
         notes = excluded.notes,
         is_active = 1`,
    )
    .run({
      id: row.id,
      provider_id: row.provider_id,
      name: row.name,
      ...flags,
      max_km: row.maxKm ?? 5,
      branches: row.branches ?? null,
      points: row.points ?? null,
      price: row.price,
      price_type: row.priceType ?? "sabit",
      duration_min: row.durationMin ?? null,
      avail: row.avail ?? "hemen",
      work_hours: row.workHours ?? null,
      refuse: row.refuse ?? null,
      notes: row.notes ?? null,
      now,
    });
}

export function insertCargo(providerId: string, input: CargoWrite): CargoRow {
  const flags = flagRows(input);
  const row = {
    id: randomUUID(),
    provider_id: providerId,
    name: input.name,
    photo_url: input.photoUrl ?? null,
    ...flags,
    max_km: input.maxKm ?? 5,
    branches: input.branches ?? null,
    points: input.points ?? null,
    price: input.price,
    price_type: input.priceType ?? "sabit",
    duration_min: input.durationMin ?? null,
    avail: input.avail ?? "hemen",
    work_hours: input.workHours ?? null,
    refuse: input.refuse ?? null,
    notes: input.notes ?? null,
    is_active: input.isActive === false ? 0 : 1,
    created_at: new Date().toISOString(),
  };
  db()
    .prepare(
      `INSERT INTO provider_cargos (
         ${CARGO_COLUMNS}
       ) VALUES (
         ${CARGO_PLACEHOLDERS}
       )`,
    )
    .run(row);
  return getCargo(row.id)!;
}

export function updateCargo(id: string, providerId: string, input: CargoWrite): CargoRow | undefined {
  const current = getCargo(id);
  if (!current || current.provider_id !== providerId) return undefined;
  const flags = flagRows(input);
  db()
    .prepare(
      `UPDATE provider_cargos SET
         name = @name,
         photo_url = @photo_url,
         job_sube_al = @job_sube_al,
         job_sube_birak = @job_sube_birak,
         job_nokta_nokta = @job_nokta_nokta,
         job_al_nokta = @job_al_nokta,
         job_teslim_sube = @job_teslim_sube,
         size_kucuk = @size_kucuk,
         size_orta = @size_orta,
         size_buyuk = @size_buyuk,
         max_km = @max_km,
         branches = @branches,
         points = @points,
         price = @price,
         price_type = @price_type,
         duration_min = @duration_min,
         avail = @avail,
         work_hours = @work_hours,
         pick_sube = @pick_sube,
         pick_adres = @pick_adres,
         pick_nokta = @pick_nokta,
         drop_sube = @drop_sube,
         drop_adres = @drop_adres,
         drop_nokta = @drop_nokta,
         confirm_kod = @confirm_kod,
         confirm_app = @confirm_app,
         refuse = @refuse,
         notes = @notes,
         is_active = @is_active
       WHERE id = @id AND provider_id = @providerId`,
    )
    .run({
      id,
      providerId,
      name: input.name,
      photo_url: input.photoUrl === undefined ? current.photo_url : input.photoUrl,
      ...flags,
      max_km: input.maxKm ?? 5,
      branches: input.branches ?? null,
      points: input.points ?? null,
      price: input.price,
      price_type: input.priceType ?? "sabit",
      duration_min: input.durationMin ?? null,
      avail: input.avail ?? "hemen",
      work_hours: input.workHours ?? null,
      refuse: input.refuse ?? null,
      notes: input.notes ?? null,
      is_active: input.isActive === false ? 0 : 1,
    });
  return getCargo(id);
}

export function setCargoPhotoUrl(id: string, providerId: string, url: string | null) {
  const result = db()
    .prepare("UPDATE provider_cargos SET photo_url = ? WHERE id = ? AND provider_id = ?")
    .run(url, id, providerId);
  return result.changes > 0;
}

export function deactivateCargo(id: string, providerId: string) {
  const result = db()
    .prepare(
      `UPDATE provider_cargos SET is_active = 0
       WHERE id = ? AND provider_id = ? AND is_active = 1`,
    )
    .run(id, providerId);
  return result.changes > 0;
}

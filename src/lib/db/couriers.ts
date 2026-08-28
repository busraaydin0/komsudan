import { randomUUID } from "node:crypto";
import { db } from "./client";
import type {
  CourierAvail,
  CourierCarry,
  CourierConfirm,
  CourierPriceType,
  CourierRoute,
  CourierSize,
  CourierTransport,
  ProviderCourier,
} from "@/lib/types";

export type CourierRow = {
  id: string;
  provider_id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  transport_yaya: number;
  transport_bisiklet: number;
  transport_ebike: number;
  transport_motor: number;
  size_kucuk: number;
  size_orta: number;
  size_buyuk: number;
  max_km: number;
  price: number;
  price_type: string;
  duration_min: number | null;
  route_adres_adres: number;
  route_nokta_adres: number;
  route_nokta_nokta: number;
  avail: string;
  work_hours: string | null;
  region: string | null;
  carry_evrak: number;
  carry_paket: number;
  carry_kiyafet: number;
  carry_anahtar: number;
  carry_hediye: number;
  carry_kisisel: number;
  carry_diger: number;
  carry_other: string | null;
  refuse: string | null;
  confirm_kod: number;
  confirm_app: number;
  notes: string | null;
  is_active: number;
  created_at: string;
};

export type CourierWrite = {
  name: string;
  description?: string | null;
  photoUrl?: string | null;
  transport?: CourierTransport;
  sizes?: CourierSize;
  maxKm?: number;
  price: number;
  priceType?: CourierPriceType;
  durationMin?: number | null;
  routes?: CourierRoute;
  avail?: CourierAvail;
  workHours?: string | null;
  region?: string | null;
  carry?: CourierCarry;
  carryOther?: string | null;
  refuse?: string | null;
  confirm?: CourierConfirm;
  notes?: string | null;
  isActive?: boolean;
};

function asPriceType(raw: string | null | undefined): CourierPriceType {
  if (raw === "sabit" || raw === "mesafe") return raw;
  return "sabit";
}

function asAvail(raw: string | null | undefined): CourierAvail {
  if (raw === "hemen" || raw === "randevu" || raw === "saat") return raw;
  return "hemen";
}

function flagRows(input: CourierWrite) {
  const t = input.transport;
  const s = input.sizes;
  const r = input.routes;
  const c = input.carry;
  const k = input.confirm;
  return {
    transport_yaya: t?.yaya ? 1 : 0,
    transport_bisiklet: t?.bisiklet ? 1 : 0,
    transport_ebike: t?.ebike ? 1 : 0,
    transport_motor: t?.motor ? 1 : 0,
    size_kucuk: s?.kucuk ? 1 : 0,
    size_orta: s?.orta ? 1 : 0,
    size_buyuk: s?.buyuk ? 1 : 0,
    route_adres_adres: r?.adresAdres ? 1 : 0,
    route_nokta_adres: r?.noktaAdres ? 1 : 0,
    route_nokta_nokta: r?.noktaNokta ? 1 : 0,
    carry_evrak: c?.evrak ? 1 : 0,
    carry_paket: c?.paket ? 1 : 0,
    carry_kiyafet: c?.kiyafet ? 1 : 0,
    carry_anahtar: c?.anahtar ? 1 : 0,
    carry_hediye: c?.hediye ? 1 : 0,
    carry_kisisel: c?.kisisel ? 1 : 0,
    carry_diger: c?.diger ? 1 : 0,
    confirm_kod: k?.kod ? 1 : 0,
    confirm_app: k?.app ? 1 : 0,
  };
}

export function toPublicCourier(row: CourierRow): ProviderCourier {
  return {
    id: row.id,
    name: row.name,
    description: row.description || null,
    photoUrl: row.photo_url || null,
    transport: {
      yaya: Boolean(row.transport_yaya),
      bisiklet: Boolean(row.transport_bisiklet),
      ebike: Boolean(row.transport_ebike),
      motor: Boolean(row.transport_motor),
    },
    sizes: {
      kucuk: Boolean(row.size_kucuk),
      orta: Boolean(row.size_orta),
      buyuk: Boolean(row.size_buyuk),
    },
    maxKm: row.max_km,
    price: row.price,
    priceType: asPriceType(row.price_type),
    durationMin: row.duration_min,
    routes: {
      adresAdres: Boolean(row.route_adres_adres),
      noktaAdres: Boolean(row.route_nokta_adres),
      noktaNokta: Boolean(row.route_nokta_nokta),
    },
    avail: asAvail(row.avail),
    workHours: row.work_hours || null,
    region: row.region || null,
    carry: {
      evrak: Boolean(row.carry_evrak),
      paket: Boolean(row.carry_paket),
      kiyafet: Boolean(row.carry_kiyafet),
      anahtar: Boolean(row.carry_anahtar),
      hediye: Boolean(row.carry_hediye),
      kisisel: Boolean(row.carry_kisisel),
      diger: Boolean(row.carry_diger),
    },
    carryOther: row.carry_other || null,
    refuse: row.refuse || null,
    confirm: {
      kod: Boolean(row.confirm_kod),
      app: Boolean(row.confirm_app),
    },
    notes: row.notes || null,
    isActive: Boolean(row.is_active),
  };
}

export function listCouriers(providerId: string, activeOnly = true): CourierRow[] {
  const sql = activeOnly
    ? `SELECT * FROM provider_couriers WHERE provider_id = ? AND is_active = 1 ORDER BY created_at ASC`
    : `SELECT * FROM provider_couriers WHERE provider_id = ? ORDER BY created_at ASC`;
  return db().prepare(sql).all(providerId) as CourierRow[];
}

export function getCourier(id: string): CourierRow | undefined {
  return db().prepare("SELECT * FROM provider_couriers WHERE id = ?").get(id) as CourierRow | undefined;
}

export function countCouriers(providerId: string, activeOnly = true) {
  const sql = activeOnly
    ? `SELECT COUNT(*) AS n FROM provider_couriers WHERE provider_id = ? AND is_active = 1`
    : `SELECT COUNT(*) AS n FROM provider_couriers WHERE provider_id = ?`;
  return (db().prepare(sql).get(providerId) as { n: number }).n;
}

const COURIER_COLUMNS = `id, provider_id, name, description, photo_url,
         transport_yaya, transport_bisiklet, transport_ebike, transport_motor,
         size_kucuk, size_orta, size_buyuk, max_km, price, price_type, duration_min,
         route_adres_adres, route_nokta_adres, route_nokta_nokta, avail, work_hours, region,
         carry_evrak, carry_paket, carry_kiyafet, carry_anahtar, carry_hediye, carry_kisisel, carry_diger, carry_other,
         refuse, confirm_kod, confirm_app, notes, is_active, created_at`;

const COURIER_PLACEHOLDERS = `@id, @provider_id, @name, @description, @photo_url,
         @transport_yaya, @transport_bisiklet, @transport_ebike, @transport_motor,
         @size_kucuk, @size_orta, @size_buyuk, @max_km, @price, @price_type, @duration_min,
         @route_adres_adres, @route_nokta_adres, @route_nokta_nokta, @avail, @work_hours, @region,
         @carry_evrak, @carry_paket, @carry_kiyafet, @carry_anahtar, @carry_hediye, @carry_kisisel, @carry_diger, @carry_other,
         @refuse, @confirm_kod, @confirm_app, @notes, @is_active, @created_at`;

export function upsertCourier(row: {
  id: string;
  provider_id: string;
  name: string;
  description?: string | null;
  transport?: CourierTransport;
  sizes?: CourierSize;
  maxKm?: number;
  price: number;
  priceType?: CourierPriceType;
  durationMin?: number | null;
  routes?: CourierRoute;
  avail?: CourierAvail;
  workHours?: string | null;
  region?: string | null;
  carry?: CourierCarry;
  carryOther?: string | null;
  refuse?: string | null;
  confirm?: CourierConfirm;
  notes?: string | null;
}) {
  const now = new Date().toISOString();
  const flags = flagRows(row);
  db()
    .prepare(
      `INSERT INTO provider_couriers (
         ${COURIER_COLUMNS}
       ) VALUES (
         @id, @provider_id, @name, @description, NULL,
         @transport_yaya, @transport_bisiklet, @transport_ebike, @transport_motor,
         @size_kucuk, @size_orta, @size_buyuk, @max_km, @price, @price_type, @duration_min,
         @route_adres_adres, @route_nokta_adres, @route_nokta_nokta, @avail, @work_hours, @region,
         @carry_evrak, @carry_paket, @carry_kiyafet, @carry_anahtar, @carry_hediye, @carry_kisisel, @carry_diger, @carry_other,
         @refuse, @confirm_kod, @confirm_app, @notes, 1, @now
       )
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         description = excluded.description,
         transport_yaya = excluded.transport_yaya,
         transport_bisiklet = excluded.transport_bisiklet,
         transport_ebike = excluded.transport_ebike,
         transport_motor = excluded.transport_motor,
         size_kucuk = excluded.size_kucuk,
         size_orta = excluded.size_orta,
         size_buyuk = excluded.size_buyuk,
         max_km = excluded.max_km,
         price = excluded.price,
         price_type = excluded.price_type,
         duration_min = excluded.duration_min,
         route_adres_adres = excluded.route_adres_adres,
         route_nokta_adres = excluded.route_nokta_adres,
         route_nokta_nokta = excluded.route_nokta_nokta,
         avail = excluded.avail,
         work_hours = excluded.work_hours,
         region = excluded.region,
         carry_evrak = excluded.carry_evrak,
         carry_paket = excluded.carry_paket,
         carry_kiyafet = excluded.carry_kiyafet,
         carry_anahtar = excluded.carry_anahtar,
         carry_hediye = excluded.carry_hediye,
         carry_kisisel = excluded.carry_kisisel,
         carry_diger = excluded.carry_diger,
         carry_other = excluded.carry_other,
         refuse = excluded.refuse,
         confirm_kod = excluded.confirm_kod,
         confirm_app = excluded.confirm_app,
         notes = excluded.notes,
         is_active = 1`,
    )
    .run({
      id: row.id,
      provider_id: row.provider_id,
      name: row.name,
      description: row.description ?? null,
      ...flags,
      max_km: row.maxKm ?? 5,
      price: row.price,
      price_type: row.priceType ?? "sabit",
      duration_min: row.durationMin ?? null,
      avail: row.avail ?? "hemen",
      work_hours: row.workHours ?? null,
      region: row.region ?? null,
      carry_other: row.carryOther ?? null,
      refuse: row.refuse ?? null,
      notes: row.notes ?? null,
      now,
    });
}

export function insertCourier(providerId: string, input: CourierWrite): CourierRow {
  const flags = flagRows(input);
  const row = {
    id: randomUUID(),
    provider_id: providerId,
    name: input.name,
    description: input.description ?? null,
    photo_url: input.photoUrl ?? null,
    ...flags,
    max_km: input.maxKm ?? 5,
    price: input.price,
    price_type: input.priceType ?? "sabit",
    duration_min: input.durationMin ?? null,
    avail: input.avail ?? "hemen",
    work_hours: input.workHours ?? null,
    region: input.region ?? null,
    carry_other: input.carryOther ?? null,
    refuse: input.refuse ?? null,
    notes: input.notes ?? null,
    is_active: input.isActive === false ? 0 : 1,
    created_at: new Date().toISOString(),
  };
  db()
    .prepare(
      `INSERT INTO provider_couriers (
         ${COURIER_COLUMNS}
       ) VALUES (
         ${COURIER_PLACEHOLDERS}
       )`,
    )
    .run(row);
  return getCourier(row.id)!;
}

export function updateCourier(id: string, providerId: string, input: CourierWrite): CourierRow | undefined {
  const current = getCourier(id);
  if (!current || current.provider_id !== providerId) return undefined;
  const flags = flagRows(input);
  db()
    .prepare(
      `UPDATE provider_couriers SET
         name = @name,
         description = @description,
         photo_url = @photo_url,
         transport_yaya = @transport_yaya,
         transport_bisiklet = @transport_bisiklet,
         transport_ebike = @transport_ebike,
         transport_motor = @transport_motor,
         size_kucuk = @size_kucuk,
         size_orta = @size_orta,
         size_buyuk = @size_buyuk,
         max_km = @max_km,
         price = @price,
         price_type = @price_type,
         duration_min = @duration_min,
         route_adres_adres = @route_adres_adres,
         route_nokta_adres = @route_nokta_adres,
         route_nokta_nokta = @route_nokta_nokta,
         avail = @avail,
         work_hours = @work_hours,
         region = @region,
         carry_evrak = @carry_evrak,
         carry_paket = @carry_paket,
         carry_kiyafet = @carry_kiyafet,
         carry_anahtar = @carry_anahtar,
         carry_hediye = @carry_hediye,
         carry_kisisel = @carry_kisisel,
         carry_diger = @carry_diger,
         carry_other = @carry_other,
         refuse = @refuse,
         confirm_kod = @confirm_kod,
         confirm_app = @confirm_app,
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
      max_km: input.maxKm ?? 5,
      price: input.price,
      price_type: input.priceType ?? "sabit",
      duration_min: input.durationMin ?? null,
      avail: input.avail ?? "hemen",
      work_hours: input.workHours ?? null,
      region: input.region ?? null,
      carry_other: input.carryOther ?? null,
      refuse: input.refuse ?? null,
      notes: input.notes ?? null,
      is_active: input.isActive === false ? 0 : 1,
    });
  return getCourier(id);
}

export function setCourierPhotoUrl(id: string, providerId: string, url: string | null) {
  const result = db()
    .prepare("UPDATE provider_couriers SET photo_url = ? WHERE id = ? AND provider_id = ?")
    .run(url, id, providerId);
  return result.changes > 0;
}

export function deactivateCourier(id: string, providerId: string) {
  const result = db()
    .prepare(
      `UPDATE provider_couriers SET is_active = 0
       WHERE id = ? AND provider_id = ? AND is_active = 1`,
    )
    .run(id, providerId);
  return result.changes > 0;
}

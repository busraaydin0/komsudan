import { randomUUID } from "node:crypto";
import { db } from "./client";
import type {
  ProviderRepair,
  RepairDelivery,
  RepairJob,
  RepairKind,
  RepairParts,
  RepairPriceType,
  RepairPriceUnit,
  RepairQuoteFrom,
} from "@/lib/types";

export type RepairRow = {
  id: string;
  provider_id: string;
  name: string;
  description: string | null;
  kind: string;
  item: string | null;
  job: string;
  photo_url: string | null;
  price: number;
  price_type: string;
  price_unit: string;
  parts: string;
  lead_days: number | null;
  max_per_week: number | null;
  delivery_adres: number;
  delivery_nokta: number;
  delivery_yakin: number;
  work_radius_km: number | null;
  inspect_required: number;
  quote_from: string;
  warranty_days: number | null;
  notes: string | null;
  work_hours: string | null;
  is_active: number;
  created_at: string;
};

export type RepairWrite = {
  name: string;
  description?: string | null;
  kind?: RepairKind;
  item?: string | null;
  job?: RepairJob;
  photoUrl?: string | null;
  price: number;
  priceType?: RepairPriceType;
  priceUnit?: RepairPriceUnit;
  parts?: RepairParts;
  leadDays?: number | null;
  maxPerWeek?: number | null;
  delivery?: RepairDelivery;
  workRadiusKm?: number | null;
  inspectRequired?: boolean;
  quoteFrom?: RepairQuoteFrom;
  warrantyDays?: number | null;
  notes?: string | null;
  workHours?: string | null;
  isActive?: boolean;
};

function asKind(raw: string | null | undefined): RepairKind {
  if (
    raw === "elektronik" ||
    raw === "ev" ||
    raw === "mobilya" ||
    raw === "bisiklet" ||
    raw === "oyuncak" ||
    raw === "aksesuar" ||
    raw === "diger"
  ) {
    return raw;
  }
  return "diger";
}

function asJob(raw: string | null | undefined): RepairJob {
  if (
    raw === "onarim" ||
    raw === "parca" ||
    raw === "montaj" ||
    raw === "bakim" ||
    raw === "temizlik" ||
    raw === "diger"
  ) {
    return raw;
  }
  return "onarim";
}

function asPriceType(raw: string | null | undefined): RepairPriceType {
  if (raw === "sabit" || raw === "baslangic" || raw === "inceleme") return raw;
  return "sabit";
}

function asUnit(raw: string | null | undefined): RepairPriceUnit {
  if (raw === "adet" || raw === "parca" || raw === "urun" || raw === "saat" || raw === "is") return raw;
  return "adet";
}

function asParts(raw: string | null | undefined): RepairParts {
  if (raw === "included" || raw === "extra" || raw === "customer" || raw === "either") return raw;
  return "either";
}

function asQuote(raw: string | null | undefined): RepairQuoteFrom {
  if (raw === "photo" || raw === "seen") return raw;
  return "seen";
}

export function toPublicRepair(row: RepairRow): ProviderRepair {
  return {
    id: row.id,
    name: row.name,
    description: row.description || null,
    kind: asKind(row.kind),
    item: row.item || null,
    job: asJob(row.job),
    photoUrl: row.photo_url || null,
    price: row.price,
    priceType: asPriceType(row.price_type),
    priceUnit: asUnit(row.price_unit),
    parts: asParts(row.parts),
    leadDays: row.lead_days,
    maxPerWeek: row.max_per_week,
    delivery: {
      adres: Boolean(row.delivery_adres),
      nokta: Boolean(row.delivery_nokta),
      yakin: Boolean(row.delivery_yakin),
    },
    workRadiusKm: row.work_radius_km,
    inspectRequired: Boolean(row.inspect_required),
    quoteFrom: asQuote(row.quote_from),
    warrantyDays: row.warranty_days,
    notes: row.notes || null,
    workHours: row.work_hours || null,
    isActive: Boolean(row.is_active),
  };
}

export function listRepairs(providerId: string, activeOnly = true): RepairRow[] {
  const sql = activeOnly
    ? `SELECT * FROM provider_repairs WHERE provider_id = ? AND is_active = 1 ORDER BY created_at ASC`
    : `SELECT * FROM provider_repairs WHERE provider_id = ? ORDER BY created_at ASC`;
  return db().prepare(sql).all(providerId) as RepairRow[];
}

export function getRepair(id: string): RepairRow | undefined {
  return db().prepare("SELECT * FROM provider_repairs WHERE id = ?").get(id) as RepairRow | undefined;
}

export function countRepairs(providerId: string, activeOnly = true) {
  const sql = activeOnly
    ? `SELECT COUNT(*) AS n FROM provider_repairs WHERE provider_id = ? AND is_active = 1`
    : `SELECT COUNT(*) AS n FROM provider_repairs WHERE provider_id = ?`;
  return (db().prepare(sql).get(providerId) as { n: number }).n;
}

export function upsertRepair(row: {
  id: string;
  provider_id: string;
  name: string;
  description?: string | null;
  kind?: RepairKind;
  item?: string | null;
  job?: RepairJob;
  price: number;
  priceType?: RepairPriceType;
  priceUnit?: RepairPriceUnit;
  parts?: RepairParts;
  leadDays?: number | null;
  maxPerWeek?: number | null;
  delivery?: RepairDelivery;
  workRadiusKm?: number | null;
  inspectRequired?: boolean;
  quoteFrom?: RepairQuoteFrom;
  warrantyDays?: number | null;
  notes?: string | null;
  workHours?: string | null;
}) {
  const now = new Date().toISOString();
  const flags = deliveryFlags(row.delivery);
  db()
    .prepare(
      `INSERT INTO provider_repairs (
         id, provider_id, name, description, kind, item, job, photo_url, price, price_type,
         price_unit, parts, lead_days, max_per_week, delivery_adres, delivery_nokta, delivery_yakin,
         work_radius_km, inspect_required, quote_from, warranty_days, notes, work_hours, is_active, created_at
       ) VALUES (
         @id, @provider_id, @name, @description, @kind, @item, @job, NULL, @price, @price_type,
         @price_unit, @parts, @lead_days, @max_per_week, @delivery_adres, @delivery_nokta, @delivery_yakin,
         @work_radius_km, @inspect_required, @quote_from, @warranty_days, @notes, @work_hours, 1, @now
       )
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         description = excluded.description,
         kind = excluded.kind,
         item = excluded.item,
         job = excluded.job,
         price = excluded.price,
         price_type = excluded.price_type,
         price_unit = excluded.price_unit,
         parts = excluded.parts,
         lead_days = excluded.lead_days,
         max_per_week = excluded.max_per_week,
         delivery_adres = excluded.delivery_adres,
         delivery_nokta = excluded.delivery_nokta,
         delivery_yakin = excluded.delivery_yakin,
         work_radius_km = excluded.work_radius_km,
         inspect_required = excluded.inspect_required,
         quote_from = excluded.quote_from,
         warranty_days = excluded.warranty_days,
         notes = excluded.notes,
         work_hours = excluded.work_hours,
         is_active = 1`,
    )
    .run({
      id: row.id,
      provider_id: row.provider_id,
      name: row.name,
      description: row.description ?? null,
      kind: row.kind ?? "diger",
      item: row.item ?? null,
      job: row.job ?? "onarim",
      price: row.price,
      price_type: row.priceType ?? "sabit",
      price_unit: row.priceUnit ?? "adet",
      parts: row.parts ?? "either",
      lead_days: row.leadDays ?? null,
      max_per_week: row.maxPerWeek ?? null,
      ...flags,
      work_radius_km: row.workRadiusKm ?? null,
      inspect_required: row.inspectRequired ? 1 : 0,
      quote_from: row.quoteFrom ?? "seen",
      warranty_days: row.warrantyDays ?? null,
      notes: row.notes ?? null,
      work_hours: row.workHours ?? null,
      now,
    });
}

function deliveryFlags(input?: RepairDelivery) {
  return {
    delivery_adres: input?.adres === false ? 0 : 1,
    delivery_nokta: input?.nokta === false ? 0 : 1,
    delivery_yakin: input?.yakin ? 1 : 0,
  };
}

export function insertRepair(providerId: string, input: RepairWrite): RepairRow {
  const flags = deliveryFlags(input.delivery);
  const row = {
    id: randomUUID(),
    provider_id: providerId,
    name: input.name,
    description: input.description ?? null,
    kind: input.kind ?? "diger",
    item: input.item ?? null,
    job: input.job ?? "onarim",
    photo_url: input.photoUrl ?? null,
    price: input.price,
    price_type: input.priceType ?? "sabit",
    price_unit: input.priceUnit ?? "adet",
    parts: input.parts ?? "either",
    lead_days: input.leadDays ?? null,
    max_per_week: input.maxPerWeek ?? null,
    ...flags,
    work_radius_km: input.workRadiusKm ?? null,
    inspect_required: input.inspectRequired ? 1 : 0,
    quote_from: input.quoteFrom ?? "seen",
    warranty_days: input.warrantyDays ?? null,
    notes: input.notes ?? null,
    work_hours: input.workHours ?? null,
    is_active: input.isActive === false ? 0 : 1,
    created_at: new Date().toISOString(),
  };
  db()
    .prepare(
      `INSERT INTO provider_repairs (
         id, provider_id, name, description, kind, item, job, photo_url, price, price_type,
         price_unit, parts, lead_days, max_per_week, delivery_adres, delivery_nokta, delivery_yakin,
         work_radius_km, inspect_required, quote_from, warranty_days, notes, work_hours, is_active, created_at
       ) VALUES (
         @id, @provider_id, @name, @description, @kind, @item, @job, @photo_url, @price, @price_type,
         @price_unit, @parts, @lead_days, @max_per_week, @delivery_adres, @delivery_nokta, @delivery_yakin,
         @work_radius_km, @inspect_required, @quote_from, @warranty_days, @notes, @work_hours, @is_active, @created_at
       )`,
    )
    .run(row);
  return getRepair(row.id)!;
}

export function updateRepair(id: string, providerId: string, input: RepairWrite): RepairRow | undefined {
  const current = getRepair(id);
  if (!current || current.provider_id !== providerId) return undefined;
  const flags = deliveryFlags(input.delivery);
  db()
    .prepare(
      `UPDATE provider_repairs SET
         name = @name,
         description = @description,
         kind = @kind,
         item = @item,
         job = @job,
         photo_url = @photo_url,
         price = @price,
         price_type = @price_type,
         price_unit = @price_unit,
         parts = @parts,
         lead_days = @lead_days,
         max_per_week = @max_per_week,
         delivery_adres = @delivery_adres,
         delivery_nokta = @delivery_nokta,
         delivery_yakin = @delivery_yakin,
         work_radius_km = @work_radius_km,
         inspect_required = @inspect_required,
         quote_from = @quote_from,
         warranty_days = @warranty_days,
         notes = @notes,
         work_hours = @work_hours,
         is_active = @is_active
       WHERE id = @id AND provider_id = @providerId`,
    )
    .run({
      id,
      providerId,
      name: input.name,
      description: input.description ?? null,
      kind: input.kind ?? "diger",
      item: input.item ?? null,
      job: input.job ?? "onarim",
      photo_url: input.photoUrl === undefined ? current.photo_url : input.photoUrl,
      price: input.price,
      price_type: input.priceType ?? "sabit",
      price_unit: input.priceUnit ?? "adet",
      parts: input.parts ?? "either",
      lead_days: input.leadDays ?? null,
      max_per_week: input.maxPerWeek ?? null,
      ...flags,
      work_radius_km: input.workRadiusKm ?? null,
      inspect_required: input.inspectRequired ? 1 : 0,
      quote_from: input.quoteFrom ?? "seen",
      warranty_days: input.warrantyDays ?? null,
      notes: input.notes ?? null,
      work_hours: input.workHours ?? null,
      is_active: input.isActive === false ? 0 : 1,
    });
  return getRepair(id);
}

export function setRepairPhotoUrl(id: string, providerId: string, url: string | null) {
  const result = db()
    .prepare("UPDATE provider_repairs SET photo_url = ? WHERE id = ? AND provider_id = ?")
    .run(url, id, providerId);
  return result.changes > 0;
}

export function deactivateRepair(id: string, providerId: string) {
  const result = db()
    .prepare(
      `UPDATE provider_repairs SET is_active = 0
       WHERE id = ? AND provider_id = ? AND is_active = 1`,
    )
    .run(id, providerId);
  return result.changes > 0;
}

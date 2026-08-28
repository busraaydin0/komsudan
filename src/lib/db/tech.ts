import { randomUUID } from "node:crypto";
import { db } from "./client";
import type {
  ProviderTech,
  TechDelivery,
  TechJob,
  TechKind,
  TechMaterials,
  TechPriceType,
  TechPriceUnit,
} from "@/lib/types";

export type TechRow = {
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
  materials: string;
  lead_hours: number | null;
  lead_days: number | null;
  max_per_week: number | null;
  delivery_adres: number;
  delivery_nokta: number;
  delivery_yakin: number;
  delivery_yerinde: number;
  inspect_required: number;
  quote_from_photo: number;
  platform: string | null;
  warranty_days: number | null;
  notes: string | null;
  work_hours: string | null;
  is_active: number;
  created_at: string;
};

export type TechWrite = {
  name: string;
  description?: string | null;
  kind?: TechKind;
  item?: string | null;
  job?: TechJob;
  photoUrl?: string | null;
  price: number;
  priceType?: TechPriceType;
  priceUnit?: TechPriceUnit;
  materials?: TechMaterials;
  leadHours?: number | null;
  leadDays?: number | null;
  maxPerWeek?: number | null;
  delivery?: TechDelivery;
  inspectRequired?: boolean;
  quoteFromPhoto?: boolean;
  platform?: string | null;
  warrantyDays?: number | null;
  notes?: string | null;
  workHours?: string | null;
  isActive?: boolean;
};

function asKind(raw: string | null | undefined): TechKind {
  if (
    raw === "bilgisayar" ||
    raw === "telefon" ||
    raw === "yazici" ||
    raw === "konsol" ||
    raw === "tv" ||
    raw === "ag" ||
    raw === "diger"
  ) {
    return raw;
  }
  return "diger";
}

function asJob(raw: string | null | undefined): TechJob {
  if (
    raw === "kurulum" ||
    raw === "format" ||
    raw === "yazilim" ||
    raw === "veri" ||
    raw === "bakim" ||
    raw === "parca" ||
    raw === "sorun" ||
    raw === "diger"
  ) {
    return raw;
  }
  return "kurulum";
}

function asPriceType(raw: string | null | undefined): TechPriceType {
  if (raw === "sabit" || raw === "baslangic" || raw === "inceleme") return raw;
  return "sabit";
}

function asUnit(raw: string | null | undefined): TechPriceUnit {
  if (raw === "cihaz" || raw === "islem" || raw === "saat" || raw === "paket") return raw;
  return "cihaz";
}

function asMaterials(raw: string | null | undefined): TechMaterials {
  if (raw === "provider" || raw === "customer" || raw === "included" || raw === "extra" || raw === "none") {
    return raw;
  }
  return "none";
}

export function toPublicTech(row: TechRow): ProviderTech {
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
    materials: asMaterials(row.materials),
    leadHours: row.lead_hours,
    leadDays: row.lead_days,
    maxPerWeek: row.max_per_week,
    delivery: {
      adres: Boolean(row.delivery_adres),
      nokta: Boolean(row.delivery_nokta),
      yakin: Boolean(row.delivery_yakin),
      yerinde: Boolean(row.delivery_yerinde),
    },
    inspectRequired: Boolean(row.inspect_required),
    quoteFromPhoto: Boolean(row.quote_from_photo),
    platform: row.platform || null,
    warrantyDays: row.warranty_days,
    notes: row.notes || null,
    workHours: row.work_hours || null,
    isActive: Boolean(row.is_active),
  };
}

export function listTechs(providerId: string, activeOnly = true): TechRow[] {
  const sql = activeOnly
    ? `SELECT * FROM provider_tech WHERE provider_id = ? AND is_active = 1 ORDER BY created_at ASC`
    : `SELECT * FROM provider_tech WHERE provider_id = ? ORDER BY created_at ASC`;
  return db().prepare(sql).all(providerId) as TechRow[];
}

export function getTech(id: string): TechRow | undefined {
  return db().prepare("SELECT * FROM provider_tech WHERE id = ?").get(id) as TechRow | undefined;
}

export function countTechs(providerId: string, activeOnly = true) {
  const sql = activeOnly
    ? `SELECT COUNT(*) AS n FROM provider_tech WHERE provider_id = ? AND is_active = 1`
    : `SELECT COUNT(*) AS n FROM provider_tech WHERE provider_id = ?`;
  return (db().prepare(sql).get(providerId) as { n: number }).n;
}

function deliveryFlags(input?: TechDelivery) {
  if (!input) {
    return {
      delivery_adres: 1,
      delivery_nokta: 1,
      delivery_yakin: 0,
      delivery_yerinde: 0,
    };
  }
  return {
    delivery_adres: input.adres ? 1 : 0,
    delivery_nokta: input.nokta ? 1 : 0,
    delivery_yakin: input.yakin ? 1 : 0,
    delivery_yerinde: input.yerinde ? 1 : 0,
  };
}

const TECH_COLUMNS = `id, provider_id, name, description, kind, item, job, photo_url, price, price_type,
         price_unit, materials, lead_hours, lead_days, max_per_week, delivery_adres, delivery_nokta,
         delivery_yakin, delivery_yerinde, inspect_required, quote_from_photo, platform, warranty_days,
         notes, work_hours, is_active, created_at`;

export function upsertTech(row: {
  id: string;
  provider_id: string;
  name: string;
  description?: string | null;
  kind?: TechKind;
  item?: string | null;
  job?: TechJob;
  price: number;
  priceType?: TechPriceType;
  priceUnit?: TechPriceUnit;
  materials?: TechMaterials;
  leadHours?: number | null;
  leadDays?: number | null;
  maxPerWeek?: number | null;
  delivery?: TechDelivery;
  inspectRequired?: boolean;
  quoteFromPhoto?: boolean;
  platform?: string | null;
  warrantyDays?: number | null;
  notes?: string | null;
  workHours?: string | null;
}) {
  const now = new Date().toISOString();
  const flags = deliveryFlags(row.delivery);
  db()
    .prepare(
      `INSERT INTO provider_tech (
         ${TECH_COLUMNS}
       ) VALUES (
         @id, @provider_id, @name, @description, @kind, @item, @job, NULL, @price, @price_type,
         @price_unit, @materials, @lead_hours, @lead_days, @max_per_week, @delivery_adres, @delivery_nokta,
         @delivery_yakin, @delivery_yerinde, @inspect_required, @quote_from_photo, @platform, @warranty_days,
         @notes, @work_hours, 1, @now
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
         materials = excluded.materials,
         lead_hours = excluded.lead_hours,
         lead_days = excluded.lead_days,
         max_per_week = excluded.max_per_week,
         delivery_adres = excluded.delivery_adres,
         delivery_nokta = excluded.delivery_nokta,
         delivery_yakin = excluded.delivery_yakin,
         delivery_yerinde = excluded.delivery_yerinde,
         inspect_required = excluded.inspect_required,
         quote_from_photo = excluded.quote_from_photo,
         platform = excluded.platform,
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
      job: row.job ?? "kurulum",
      price: row.price,
      price_type: row.priceType ?? "sabit",
      price_unit: row.priceUnit ?? "cihaz",
      materials: row.materials ?? "none",
      lead_hours: row.leadHours ?? null,
      lead_days: row.leadDays ?? null,
      max_per_week: row.maxPerWeek ?? null,
      ...flags,
      inspect_required: row.inspectRequired ? 1 : 0,
      quote_from_photo: row.quoteFromPhoto ? 1 : 0,
      platform: row.platform ?? null,
      warranty_days: row.warrantyDays ?? null,
      notes: row.notes ?? null,
      work_hours: row.workHours ?? null,
      now,
    });
}

export function insertTech(providerId: string, input: TechWrite): TechRow {
  const flags = deliveryFlags(input.delivery);
  const row = {
    id: randomUUID(),
    provider_id: providerId,
    name: input.name,
    description: input.description ?? null,
    kind: input.kind ?? "diger",
    item: input.item ?? null,
    job: input.job ?? "kurulum",
    photo_url: input.photoUrl ?? null,
    price: input.price,
    price_type: input.priceType ?? "sabit",
    price_unit: input.priceUnit ?? "cihaz",
    materials: input.materials ?? "none",
    lead_hours: input.leadHours ?? null,
    lead_days: input.leadDays ?? null,
    max_per_week: input.maxPerWeek ?? null,
    ...flags,
    inspect_required: input.inspectRequired ? 1 : 0,
    quote_from_photo: input.quoteFromPhoto ? 1 : 0,
    platform: input.platform ?? null,
    warranty_days: input.warrantyDays ?? null,
    notes: input.notes ?? null,
    work_hours: input.workHours ?? null,
    is_active: input.isActive === false ? 0 : 1,
    created_at: new Date().toISOString(),
  };
  db()
    .prepare(
      `INSERT INTO provider_tech (
         ${TECH_COLUMNS}
       ) VALUES (
         @id, @provider_id, @name, @description, @kind, @item, @job, @photo_url, @price, @price_type,
         @price_unit, @materials, @lead_hours, @lead_days, @max_per_week, @delivery_adres, @delivery_nokta,
         @delivery_yakin, @delivery_yerinde, @inspect_required, @quote_from_photo, @platform, @warranty_days,
         @notes, @work_hours, @is_active, @created_at
       )`,
    )
    .run(row);
  return getTech(row.id)!;
}

export function updateTech(id: string, providerId: string, input: TechWrite): TechRow | undefined {
  const current = getTech(id);
  if (!current || current.provider_id !== providerId) return undefined;
  const flags = deliveryFlags(input.delivery);
  db()
    .prepare(
      `UPDATE provider_tech SET
         name = @name,
         description = @description,
         kind = @kind,
         item = @item,
         job = @job,
         photo_url = @photo_url,
         price = @price,
         price_type = @price_type,
         price_unit = @price_unit,
         materials = @materials,
         lead_hours = @lead_hours,
         lead_days = @lead_days,
         max_per_week = @max_per_week,
         delivery_adres = @delivery_adres,
         delivery_nokta = @delivery_nokta,
         delivery_yakin = @delivery_yakin,
         delivery_yerinde = @delivery_yerinde,
         inspect_required = @inspect_required,
         quote_from_photo = @quote_from_photo,
         platform = @platform,
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
      job: input.job ?? "kurulum",
      photo_url: input.photoUrl === undefined ? current.photo_url : input.photoUrl,
      price: input.price,
      price_type: input.priceType ?? "sabit",
      price_unit: input.priceUnit ?? "cihaz",
      materials: input.materials ?? "none",
      lead_hours: input.leadHours ?? null,
      lead_days: input.leadDays ?? null,
      max_per_week: input.maxPerWeek ?? null,
      ...flags,
      inspect_required: input.inspectRequired ? 1 : 0,
      quote_from_photo: input.quoteFromPhoto ? 1 : 0,
      platform: input.platform ?? null,
      warranty_days: input.warrantyDays ?? null,
      notes: input.notes ?? null,
      work_hours: input.workHours ?? null,
      is_active: input.isActive === false ? 0 : 1,
    });
  return getTech(id);
}

export function setTechPhotoUrl(id: string, providerId: string, url: string | null) {
  const result = db()
    .prepare("UPDATE provider_tech SET photo_url = ? WHERE id = ? AND provider_id = ?")
    .run(url, id, providerId);
  return result.changes > 0;
}

export function deactivateTech(id: string, providerId: string) {
  const result = db()
    .prepare(
      `UPDATE provider_tech SET is_active = 0
       WHERE id = ? AND provider_id = ? AND is_active = 1`,
    )
    .run(id, providerId);
  return result.changes > 0;
}

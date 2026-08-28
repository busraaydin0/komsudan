import { randomUUID } from "node:crypto";
import { db } from "./client";
import type {
  ProviderService,
  SewingDelivery,
  SewingMaterial,
  SewingPriceUnit,
  SewingSubcategory,
} from "@/lib/types";

export type ServiceRow = {
  id: string;
  provider_id: string;
  name: string;
  description: string | null;
  subcategory: string;
  photo_url: string | null;
  price: number;
  price_unit: string;
  min_order: number;
  lead_days: number | null;
  max_per_week: number | null;
  delivery_adres: number;
  delivery_nokta: number;
  delivery_yakin: number;
  work_radius_km: number | null;
  notes: string | null;
  material: string;
  is_active: number;
  created_at: string;
};

export type ServiceWrite = {
  name: string;
  description?: string | null;
  subcategory?: SewingSubcategory;
  photoUrl?: string | null;
  price: number;
  priceUnit?: SewingPriceUnit;
  minOrder?: number;
  leadDays?: number | null;
  maxPerWeek?: number | null;
  delivery?: SewingDelivery;
  workRadiusKm?: number | null;
  notes?: string | null;
  material?: SewingMaterial;
  isActive?: boolean;
};

function asSubcategory(raw: string | null | undefined): SewingSubcategory {
  if (raw === "kiyafet" || raw === "tamir" || raw === "ozel" || raw === "tekstil" || raw === "diger") {
    return raw;
  }
  return "diger";
}

function asUnit(raw: string | null | undefined): SewingPriceUnit {
  if (
    raw === "adet" ||
    raw === "cift" ||
    raw === "metre" ||
    raw === "kg" ||
    raw === "parca" ||
    raw === "saat" ||
    raw === "proje"
  ) {
    return raw;
  }
  return "adet";
}

function asMaterial(raw: string | null | undefined): SewingMaterial {
  if (raw === "customer" || raw === "provider" || raw === "either") return raw;
  return "customer";
}

export function toPublicService(row: ServiceRow): ProviderService {
  return {
    id: row.id,
    name: row.name,
    description: row.description || null,
    subcategory: asSubcategory(row.subcategory),
    photoUrl: row.photo_url || null,
    price: row.price,
    priceUnit: asUnit(row.price_unit),
    minOrder: row.min_order ?? 1,
    leadDays: row.lead_days,
    maxPerWeek: row.max_per_week,
    delivery: {
      adres: Boolean(row.delivery_adres),
      nokta: Boolean(row.delivery_nokta),
      yakin: Boolean(row.delivery_yakin),
    },
    workRadiusKm: row.work_radius_km,
    notes: row.notes || null,
    material: asMaterial(row.material),
    isActive: Boolean(row.is_active),
  };
}

export function listServices(providerId: string, activeOnly = true): ServiceRow[] {
  const sql = activeOnly
    ? `SELECT * FROM provider_services WHERE provider_id = ? AND is_active = 1 ORDER BY created_at ASC`
    : `SELECT * FROM provider_services WHERE provider_id = ? ORDER BY created_at ASC`;
  return db().prepare(sql).all(providerId) as ServiceRow[];
}

export function getService(id: string): ServiceRow | undefined {
  return db().prepare("SELECT * FROM provider_services WHERE id = ?").get(id) as ServiceRow | undefined;
}

export function countServices(providerId: string, activeOnly = true) {
  const sql = activeOnly
    ? `SELECT COUNT(*) AS n FROM provider_services WHERE provider_id = ? AND is_active = 1`
    : `SELECT COUNT(*) AS n FROM provider_services WHERE provider_id = ?`;
  return (db().prepare(sql).get(providerId) as { n: number }).n;
}

function deliveryFlags(input?: SewingDelivery) {
  return {
    delivery_adres: input?.adres === false ? 0 : 1,
    delivery_nokta: input?.nokta === false ? 0 : 1,
    delivery_yakin: input?.yakin ? 1 : 0,
  };
}

export function insertService(providerId: string, input: ServiceWrite): ServiceRow {
  const flags = deliveryFlags(input.delivery);
  const row = {
    id: randomUUID(),
    provider_id: providerId,
    name: input.name,
    description: input.description ?? null,
    subcategory: input.subcategory ?? "diger",
    photo_url: input.photoUrl ?? null,
    price: input.price,
    price_unit: input.priceUnit ?? "adet",
    min_order: input.minOrder ?? 1,
    lead_days: input.leadDays ?? null,
    max_per_week: input.maxPerWeek ?? null,
    ...flags,
    work_radius_km: input.workRadiusKm ?? null,
    notes: input.notes ?? null,
    material: input.material ?? "customer",
    is_active: input.isActive === false ? 0 : 1,
    created_at: new Date().toISOString(),
  };
  db()
    .prepare(
      `INSERT INTO provider_services (
         id, provider_id, name, description, subcategory, photo_url, price, price_unit,
         min_order, lead_days, max_per_week, delivery_adres, delivery_nokta, delivery_yakin,
         work_radius_km, notes, material, is_active, created_at
       ) VALUES (
         @id, @provider_id, @name, @description, @subcategory, @photo_url, @price, @price_unit,
         @min_order, @lead_days, @max_per_week, @delivery_adres, @delivery_nokta, @delivery_yakin,
         @work_radius_km, @notes, @material, @is_active, @created_at
       )`,
    )
    .run(row);
  return getService(row.id)!;
}

export function updateService(id: string, providerId: string, input: ServiceWrite): ServiceRow | undefined {
  const current = getService(id);
  if (!current || current.provider_id !== providerId) return undefined;
  const flags = deliveryFlags(input.delivery);
  db()
    .prepare(
      `UPDATE provider_services SET
         name = @name,
         description = @description,
         subcategory = @subcategory,
         photo_url = @photo_url,
         price = @price,
         price_unit = @price_unit,
         min_order = @min_order,
         lead_days = @lead_days,
         max_per_week = @max_per_week,
         delivery_adres = @delivery_adres,
         delivery_nokta = @delivery_nokta,
         delivery_yakin = @delivery_yakin,
         work_radius_km = @work_radius_km,
         notes = @notes,
         material = @material,
         is_active = @is_active
       WHERE id = @id AND provider_id = @providerId`,
    )
    .run({
      id,
      providerId,
      name: input.name,
      description: input.description ?? null,
      subcategory: input.subcategory ?? "diger",
      photo_url: input.photoUrl === undefined ? current.photo_url : input.photoUrl,
      price: input.price,
      price_unit: input.priceUnit ?? "adet",
      min_order: input.minOrder ?? 1,
      lead_days: input.leadDays ?? null,
      max_per_week: input.maxPerWeek ?? null,
      ...flags,
      work_radius_km: input.workRadiusKm ?? null,
      notes: input.notes ?? null,
      material: input.material ?? "customer",
      is_active: input.isActive === false ? 0 : 1,
    });
  return getService(id);
}

export function setServicePhotoUrl(id: string, providerId: string, url: string | null) {
  const result = db()
    .prepare("UPDATE provider_services SET photo_url = ? WHERE id = ? AND provider_id = ?")
    .run(url, id, providerId);
  return result.changes > 0;
}

export function deactivateService(id: string, providerId: string) {
  const result = db()
    .prepare(
      `UPDATE provider_services SET is_active = 0
       WHERE id = ? AND provider_id = ? AND is_active = 1`,
    )
    .run(id, providerId);
  return result.changes > 0;
}

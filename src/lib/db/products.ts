import { randomUUID } from "node:crypto";
import { db } from "./client";
import type { FoodCategory, FoodDelivery, FoodPriceUnit, ProviderProduct } from "@/lib/types";

export type ProductRow = {
  id: string;
  provider_id: string;
  name: string;
  price_per_person: number;
  is_active: number;
  created_at: string;
  photo_url: string | null;
  description: string | null;
  category: string | null;
  price_unit: string | null;
  min_order: number | null;
  max_qty: number | null;
  lead_hours: number | null;
  delivery: string | null;
  allergens: string | null;
};

export type ProductWrite = {
  name: string;
  pricePerPerson: number;
  photoUrl?: string | null;
  description?: string | null;
  foodCategory?: FoodCategory | null;
  priceUnit?: FoodPriceUnit;
  minOrder?: number;
  maxQty?: number | null;
  leadHours?: number | null;
  delivery?: FoodDelivery;
  allergens?: string | null;
  isActive?: boolean;
};

function asUnit(raw: string | null | undefined): FoodPriceUnit {
  if (raw === "porsiyon" || raw === "kg" || raw === "adet" || raw === "tepsi" || raw === "kisi") return raw;
  return "kisi";
}

function asDelivery(raw: string | null | undefined): FoodDelivery {
  if (raw === "kapi" || raw === "nokta" || raw === "ikisi") return raw;
  return "ikisi";
}

function asCategory(raw: string | null | undefined): FoodCategory | null {
  if (
    raw === "kisir" ||
    raw === "pasta" ||
    raw === "kurabiye" ||
    raw === "borek" ||
    raw === "salata" ||
    raw === "tatli" ||
    raw === "diger"
  ) {
    return raw;
  }
  return null;
}

export function toPublicProduct(row: ProductRow): ProviderProduct {
  return {
    id: row.id,
    name: row.name,
    pricePerPerson: row.price_per_person,
    photoUrl: row.photo_url || null,
    description: row.description || null,
    foodCategory: asCategory(row.category),
    priceUnit: asUnit(row.price_unit),
    minOrder: row.min_order ?? 1,
    maxQty: row.max_qty,
    leadHours: row.lead_hours,
    delivery: asDelivery(row.delivery),
    allergens: row.allergens || null,
    isActive: Boolean(row.is_active),
  };
}

export function listProducts(providerId: string, activeOnly = true): ProductRow[] {
  const sql = activeOnly
    ? `SELECT * FROM provider_products WHERE provider_id = ? AND is_active = 1 ORDER BY created_at ASC`
    : `SELECT * FROM provider_products WHERE provider_id = ? ORDER BY created_at ASC`;
  return db().prepare(sql).all(providerId) as ProductRow[];
}

export function getProduct(id: string): ProductRow | undefined {
  return db().prepare("SELECT * FROM provider_products WHERE id = ?").get(id) as ProductRow | undefined;
}

export function countProducts(providerId: string, activeOnly = true) {
  const sql = activeOnly
    ? `SELECT COUNT(*) AS n FROM provider_products WHERE provider_id = ? AND is_active = 1`
    : `SELECT COUNT(*) AS n FROM provider_products WHERE provider_id = ?`;
  return (db().prepare(sql).get(providerId) as { n: number }).n;
}

export function upsertProduct(row: {
  id: string;
  provider_id: string;
  name: string;
  price_per_person: number;
  is_active?: number;
}) {
  const now = new Date().toISOString();
  db()
    .prepare(
      `INSERT INTO provider_products (id, provider_id, name, price_per_person, is_active, created_at)
       VALUES (@id, @provider_id, @name, @price_per_person, @is_active, @now)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         price_per_person = excluded.price_per_person,
         is_active = excluded.is_active`,
    )
    .run({ ...row, is_active: row.is_active ?? 1, now });
}

export function insertProduct(providerId: string, input: ProductWrite): ProductRow {
  const row = {
    id: randomUUID(),
    provider_id: providerId,
    name: input.name,
    price_per_person: input.pricePerPerson,
    is_active: input.isActive === false ? 0 : 1,
    created_at: new Date().toISOString(),
    photo_url: input.photoUrl ?? null,
    description: input.description ?? null,
    category: input.foodCategory ?? null,
    price_unit: input.priceUnit ?? "kisi",
    min_order: input.minOrder ?? 1,
    max_qty: input.maxQty ?? null,
    lead_hours: input.leadHours ?? null,
    delivery: input.delivery ?? "ikisi",
    allergens: input.allergens ?? null,
  };
  db()
    .prepare(
      `INSERT INTO provider_products (
         id, provider_id, name, price_per_person, is_active, created_at,
         photo_url, description, category, price_unit, min_order, max_qty,
         lead_hours, delivery, allergens
       ) VALUES (
         @id, @provider_id, @name, @price_per_person, @is_active, @created_at,
         @photo_url, @description, @category, @price_unit, @min_order, @max_qty,
         @lead_hours, @delivery, @allergens
       )`,
    )
    .run(row);
  return getProduct(row.id)!;
}

export function updateProduct(id: string, providerId: string, input: ProductWrite): ProductRow | undefined {
  const current = getProduct(id);
  if (!current || current.provider_id !== providerId) return undefined;
  db()
    .prepare(
      `UPDATE provider_products SET
         name = @name,
         price_per_person = @price_per_person,
         is_active = @is_active,
         photo_url = @photo_url,
         description = @description,
         category = @category,
         price_unit = @price_unit,
         min_order = @min_order,
         max_qty = @max_qty,
         lead_hours = @lead_hours,
         delivery = @delivery,
         allergens = @allergens
       WHERE id = @id AND provider_id = @providerId`,
    )
    .run({
      id,
      providerId,
      name: input.name,
      price_per_person: input.pricePerPerson,
      is_active: input.isActive === false ? 0 : 1,
      photo_url: input.photoUrl === undefined ? current.photo_url : input.photoUrl,
      description: input.description ?? null,
      category: input.foodCategory ?? null,
      price_unit: input.priceUnit ?? "kisi",
      min_order: input.minOrder ?? 1,
      max_qty: input.maxQty ?? null,
      lead_hours: input.leadHours ?? null,
      delivery: input.delivery ?? "ikisi",
      allergens: input.allergens ?? null,
    });
  return getProduct(id);
}

export function setProductPhotoUrl(id: string, providerId: string, url: string | null) {
  const result = db()
    .prepare("UPDATE provider_products SET photo_url = ? WHERE id = ? AND provider_id = ?")
    .run(url, id, providerId);
  return result.changes > 0;
}

export function deactivateProduct(id: string, providerId: string) {
  const result = db()
    .prepare(
      `UPDATE provider_products SET is_active = 0
       WHERE id = ? AND provider_id = ? AND is_active = 1`,
    )
    .run(id, providerId);
  return result.changes > 0;
}

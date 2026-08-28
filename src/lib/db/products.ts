import { randomUUID } from "node:crypto";
import { db } from "./client";

export type ProductRow = {
  id: string;
  provider_id: string;
  name: string;
  price_per_person: number;
  is_active: number;
  created_at: string;
};

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

export function insertProduct(input: {
  providerId: string;
  name: string;
  pricePerPerson: number;
}): ProductRow {
  const row: ProductRow = {
    id: randomUUID(),
    provider_id: input.providerId,
    name: input.name,
    price_per_person: input.pricePerPerson,
    is_active: 1,
    created_at: new Date().toISOString(),
  };
  db()
    .prepare(
      `INSERT INTO provider_products (id, provider_id, name, price_per_person, is_active, created_at)
       VALUES (@id, @provider_id, @name, @price_per_person, @is_active, @created_at)`,
    )
    .run(row);
  return row;
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

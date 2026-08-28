import { db } from "./client";

export type FulfillmentMode = "delivery" | "home_visit";
export type PricingModel = "per_piece" | "per_kg" | "fixed" | "hourly";

export type CategoryRow = {
  id: string;
  name: string;
  icon: string | null;
  fulfillment_mode: FulfillmentMode;
  pricing_model: PricingModel;
  is_active: number;
  blurb: string | null;
  sort_order: number;
};

export const DEFAULT_CATEGORY_ID = "camasir";

export function listActiveCategories(): CategoryRow[] {
  return db()
    .prepare(
      `SELECT id, name, icon, fulfillment_mode, pricing_model, COALESCE(is_active, 1) AS is_active,
              blurb, COALESCE(sort_order, 0) AS sort_order
       FROM service_categories
       WHERE COALESCE(is_active, 1) = 1
       ORDER BY COALESCE(sort_order, 0), name COLLATE NOCASE`,
    )
    .all() as CategoryRow[];
}

export function getCategory(id: string): CategoryRow | undefined {
  return db()
    .prepare("SELECT * FROM service_categories WHERE id = ?")
    .get(id) as CategoryRow | undefined;
}

export function getCategoryForProvider(providerId: string): CategoryRow {
  const row = db()
    .prepare(
      `SELECT c.id, c.name, c.icon, c.fulfillment_mode, c.pricing_model, COALESCE(c.is_active, 1) AS is_active,
              c.blurb, COALESCE(c.sort_order, 0) AS sort_order
       FROM provider_profiles p
       JOIN service_categories c ON c.id = COALESCE(p.category_id, ?)
       WHERE p.user_id = ?`,
    )
    .get(DEFAULT_CATEGORY_ID, providerId) as CategoryRow | undefined;
  return (
    row ??
    getCategory(DEFAULT_CATEGORY_ID) ?? {
      id: DEFAULT_CATEGORY_ID,
      name: "Çamaşır Yıkama",
      icon: "laundry",
      fulfillment_mode: "delivery",
      pricing_model: "per_piece",
      is_active: 1,
      blurb: "Yıka, katla, kapıda veya noktada bırak",
      sort_order: 1,
    }
  );
}

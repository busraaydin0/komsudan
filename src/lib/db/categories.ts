import { db } from "./client";

export type FulfillmentMode = "delivery" | "home_visit";
export type PricingModel = "per_piece" | "per_kg" | "fixed" | "hourly";

export type CategoryRow = {
  id: string;
  name: string;
  fulfillment_mode: FulfillmentMode;
  pricing_model: PricingModel;
};

export const DEFAULT_CATEGORY_ID = "camasir";

export function getCategory(id: string): CategoryRow | undefined {
  return db()
    .prepare("SELECT * FROM service_categories WHERE id = ?")
    .get(id) as CategoryRow | undefined;
}

export function getCategoryForProvider(providerId: string): CategoryRow {
  const row = db()
    .prepare(
      `SELECT c.id, c.name, c.fulfillment_mode, c.pricing_model
       FROM provider_profiles p
       JOIN service_categories c ON c.id = COALESCE(p.category_id, ?)
       WHERE p.user_id = ?`,
    )
    .get(DEFAULT_CATEGORY_ID, providerId) as CategoryRow | undefined;
  return (
    row ??
    getCategory(DEFAULT_CATEGORY_ID) ?? {
      id: DEFAULT_CATEGORY_ID,
      name: "Çamaşır",
      fulfillment_mode: "delivery",
      pricing_model: "per_piece",
    }
  );
}

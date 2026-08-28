import { ApiError } from "@/server/rules";
import { getCategory, listActiveCategories } from "@/lib/db/categories";
import { updateUserPreferences } from "@/lib/db/auth";
import { toAuthUser, type AuthUser } from "@/lib/auth/types";

export function listCategoriesPublic() {
  return listActiveCategories().map((row) => ({
    id: row.id,
    name: row.name,
    icon: row.icon || row.id,
    blurb: row.blurb || "",
    fulfillmentMode: row.fulfillment_mode,
    pricingModel: row.pricing_model,
  }));
}

export function savePreferences(
  user: AuthUser,
  input: {
    intent?: "seek" | "offer" | "both" | null;
    categoryIds?: string[];
    homeLat?: number | null;
    homeLng?: number | null;
    homeNeighborhood?: string | null;
    completed?: boolean;
    skipped?: boolean;
  },
): AuthUser {
  const ids = input.categoryIds ?? user.preferredCategoryIds;
  for (const id of ids) {
    if (!getCategory(id)) {
      throw new ApiError(400, "Kategori bulunamadı.", "VALIDATION_ERROR");
    }
  }
  const intent = input.intent === undefined ? user.preferredIntent : input.intent;
  const finish = Boolean(input.completed || input.skipped);
  const row = updateUserPreferences(user.id, {
    preferredCategoryIds: ids.length ? ids : null,
    preferredIntent: intent,
    onboardingCompletedAt: finish
      ? (user.onboardingCompletedAt ?? new Date().toISOString())
      : user.onboardingCompletedAt,
    homeLat: input.homeLat === undefined ? user.homeLat : input.homeLat,
    homeLng: input.homeLng === undefined ? user.homeLng : input.homeLng,
    homeNeighborhood:
      input.homeNeighborhood === undefined ? user.homeNeighborhood : input.homeNeighborhood,
  });
  return toAuthUser(row);
}

import { updateUserPreferences } from "@/lib/db/auth";
import { toAuthUser, type AuthUser } from "@/lib/auth/types";

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
  if (input.categoryIds?.length) {
    void input.categoryIds;
  }
  const intent = input.intent === undefined ? user.preferredIntent : input.intent;
  const finish = Boolean(input.completed || input.skipped);
  const row = updateUserPreferences(user.id, {
    preferredCategoryIds: ["camasir"],
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

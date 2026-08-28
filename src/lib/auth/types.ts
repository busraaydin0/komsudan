import type { Account, PreferredIntent } from "@/lib/types";
import type { UserRole, UserRow } from "@/lib/db/auth";

export type AuthUser = {
  id: string;
  phone: string;
  name: string;
  fullName: string;
  role: UserRole;
  identityVerified: boolean;
  passkeyEnabled: boolean;
  avatarUrl: string | null;
  preferredCategoryIds: string[];
  preferredIntent: PreferredIntent | null;
  onboardingCompletedAt: string | null;
  homeLat: number | null;
  homeLng: number | null;
  homeNeighborhood: string | null;
};

function parseCategoryIds(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return [];
    return value.filter((id): id is string => typeof id === "string" && id.length > 0);
  } catch {
    return [];
  }
}

function parseIntent(raw: string | null | undefined): PreferredIntent | null {
  if (raw === "seek" || raw === "offer" || raw === "both") return raw;
  return null;
}

export function toAuthUser(row: UserRow): AuthUser {
  const name = row.full_name || row.name;
  return {
    id: row.id,
    phone: row.phone,
    name,
    fullName: name,
    role: row.role === "provider" || row.role === "admin" ? row.role : "customer",
    identityVerified: Boolean(row.identity_verified),
    passkeyEnabled: Boolean(row.passkey_id),
    avatarUrl: row.avatar_url || null,
    preferredCategoryIds: parseCategoryIds(row.preferred_category_ids),
    preferredIntent: parseIntent(row.preferred_intent),
    onboardingCompletedAt: row.onboarding_completed_at ?? null,
    homeLat: row.home_lat ?? null,
    homeLng: row.home_lng ?? null,
    homeNeighborhood: row.home_neighborhood ?? null,
  };
}

function prefs(user: AuthUser) {
  return {
    preferredCategoryIds: user.preferredCategoryIds ?? [],
    preferredIntent: user.preferredIntent,
    onboardingCompletedAt: user.onboardingCompletedAt,
    homeLat: user.homeLat,
    homeLng: user.homeLng,
    homeNeighborhood: user.homeNeighborhood,
  };
}

export function toAccount(user: AuthUser): Account {
  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    identityVerified: user.identityVerified,
    passkeyEnabled: user.passkeyEnabled,
    role: user.role,
    avatarUrl: user.avatarUrl,
    ...prefs(user),
  };
}

export function publicUser(user: AuthUser) {
  return {
    id: user.id,
    phone: user.phone,
    fullName: user.fullName,
    role: user.role,
    identityVerified: user.identityVerified,
    passkeyEnabled: user.passkeyEnabled,
    avatarUrl: user.avatarUrl,
    ...prefs(user),
  };
}

import { getUserById } from "@/lib/db/auth";
import { ApiError } from "@/lib/errors";
import { requireAuth } from "./middleware";
import type { AuthUser } from "./types";

export function isStaffRole(role: string | null | undefined): boolean {
  return role === "service_admin" || role === "admin";
}

export function isStaffAdmin(user: AuthUser): boolean {
  if (isStaffRole(user.role)) return true;
  return Boolean(getUserById(user.id)?.super_admin);
}

export function isSuperAdminUser(user: AuthUser): boolean {
  return Boolean(getUserById(user.id)?.super_admin);
}

export function assertStaffAdmin(user: AuthUser) {
  if (!isStaffAdmin(user)) {
    throw new ApiError(403, "Yönetim yetkisi gerekir.", "FORBIDDEN");
  }
}

export async function requireStaffAdmin(req?: Request): Promise<AuthUser> {
  const user = await requireAuth(req);
  assertStaffAdmin(user);
  return user;
}

/** Cüzdan yükleme/çekim: yalnız müşteri/veren veya super_admin. */
export function assertWalletWriteAllowed(userId: string) {
  const row = getUserById(userId);
  if (row && isStaffRole(row.role) && !row.super_admin) {
    throw new ApiError(403, "Ödeme ve çekim yalnız süper admin.", "FORBIDDEN");
  }
}

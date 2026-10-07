import { getUserById } from "@/lib/db/auth";
import type { AuthUser } from "@/lib/auth/types";
import { ApiError } from "@/server/rules";

export function assertSuperAdmin(user: AuthUser) {
  if (user.role !== "admin") {
    throw new ApiError(403, "Süper admin yetkisi gerekir.", "FORBIDDEN");
  }
  const row = getUserById(user.id);
  if (!row?.super_admin) {
    throw new ApiError(403, "Kodsuz teslim onayı süper admin gerektirir.", "FORBIDDEN");
  }
}

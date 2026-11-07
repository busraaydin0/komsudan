import type { AuthUser } from "@/lib/auth/types";
import { ApiError } from "@/lib/errors";
import { isSuperAdminUser } from "./staff";

export function assertSuperAdmin(user: AuthUser) {
  if (!isSuperAdminUser(user)) {
    throw new ApiError(403, "Kodsuz teslim onayı süper admin gerektirir.", "FORBIDDEN");
  }
}

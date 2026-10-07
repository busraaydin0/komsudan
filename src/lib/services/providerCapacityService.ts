import {
  getCapacitySettings,
  parseWorkingDays,
  upsertCapacitySettings,
} from "@/lib/db/providerCapacity";
import type { AuthUser } from "@/lib/auth/types";
import { ApiError } from "@/lib/errors";

export function getMyCapacitySettings(user: AuthUser) {
  const row = getCapacitySettings(user.id);
  if (!row) {
    return {
      configured: false as const,
      halfUnitsPerDay: 6,
      workingDays: [1, 2, 3, 4, 5, 6],
      maxUnitsPerOrder: 4,
    };
  }
  return {
    configured: true as const,
    halfUnitsPerDay: row.half_units_per_day,
    workingDays: parseWorkingDays(row.working_days),
    maxUnitsPerOrder: row.max_units_per_order,
  };
}

export function saveMyCapacitySettings(
  user: AuthUser,
  input: { halfUnitsPerDay: number; workingDays: number[]; maxUnitsPerOrder: number },
) {
  if (user.role !== "provider" && user.role !== "admin") {
    throw new ApiError(403, "Kapasite ayarı hizmet verene ait.", "FORBIDDEN");
  }
  if (input.halfUnitsPerDay < 2 || input.halfUnitsPerDay > 24) {
    throw new ApiError(400, "Günlük makine kapasitesi 1–12 makine aralığında.", "VALIDATION_ERROR");
  }
  if (input.maxUnitsPerOrder < 1 || input.maxUnitsPerOrder > 4) {
    throw new ApiError(400, "Tek sipariş üst sınırı en fazla Büyük (4 birim).", "VALIDATION_ERROR");
  }
  upsertCapacitySettings({
    providerId: user.id,
    halfUnitsPerDay: input.halfUnitsPerDay,
    workingDays: input.workingDays,
    maxUnitsPerOrder: input.maxUnitsPerOrder,
  });
  return getMyCapacitySettings(user);
}

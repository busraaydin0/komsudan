import {
  getCapacitySettings,
  parseWorkingDays,
  upsertCapacitySettings,
} from "@/lib/db/providerCapacity";
import type { AuthUser } from "@/lib/auth/types";
import { ApiError } from "@/lib/errors";
import { MAX_UNITS_PER_ORDER } from "@/lib/laundryModel";

export function getMyCapacitySettings(user: AuthUser) {
  const row = getCapacitySettings(user.id);
  if (!row) {
    return {
      configured: false as const,
      halfUnitsPerDay: 6,
      workingDays: [1, 2, 3, 4, 5, 6],
      maxUnitsPerOrder: MAX_UNITS_PER_ORDER,
      expressQuota: 0,
    };
  }
  return {
    configured: true as const,
    halfUnitsPerDay: row.half_units_per_day,
    workingDays: parseWorkingDays(row.working_days),
    maxUnitsPerOrder: row.max_units_per_order,
    expressQuota: row.express_quota ?? 0,
  };
}

function assertExpressQuota(expressQuota: number, halfUnitsPerDay: number) {
  if (expressQuota < 0) {
    throw new ApiError(400, "Acil kontenjan negatif olamaz.", "VALIDATION_ERROR");
  }
  if (expressQuota > halfUnitsPerDay) {
    throw new ApiError(400, "Acil kontenjan günlük makine kapasitesini aşamaz.", "VALIDATION_ERROR");
  }
}

export function saveMyCapacitySettings(
  user: AuthUser,
  input: {
    halfUnitsPerDay: number;
    workingDays: number[];
    maxUnitsPerOrder: number;
    expressQuota?: number;
  },
) {
  if (user.role !== "provider" && user.role !== "admin") {
    throw new ApiError(403, "Kapasite ayarı hizmet verene ait.", "FORBIDDEN");
  }
  if (input.halfUnitsPerDay < 2 || input.halfUnitsPerDay > 24) {
    throw new ApiError(400, "Günlük makine kapasitesi 1–12 makine aralığında.", "VALIDATION_ERROR");
  }
  if (input.maxUnitsPerOrder < 1 || input.maxUnitsPerOrder > MAX_UNITS_PER_ORDER) {
    throw new ApiError(400, "Tek sipariş üst sınırı en fazla 5 makine (10 birim).", "VALIDATION_ERROR");
  }
  if (input.expressQuota != null) {
    assertExpressQuota(input.expressQuota, input.halfUnitsPerDay);
  }
  upsertCapacitySettings({
    providerId: user.id,
    halfUnitsPerDay: input.halfUnitsPerDay,
    workingDays: input.workingDays,
    maxUnitsPerOrder: input.maxUnitsPerOrder,
    expressQuota: input.expressQuota,
  });
  return getMyCapacitySettings(user);
}

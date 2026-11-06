import { ApiError } from "@/lib/errors";

/** ALLOW_SELF_ORDER yalnız yerel/test. Production’da bayrak okunmaz. */
export function selfOrderAllowed() {
  if (process.env.NODE_ENV === "production") return false;
  const v = process.env.ALLOW_SELF_ORDER?.trim().toLowerCase();
  return v === "1" || v === "true";
}

export function isSelfOrder(userId: string | null | undefined, providerId: string) {
  return Boolean(userId) && userId === providerId;
}

export function assertNotSelfOrder(userId: string, providerId: string) {
  if (!isSelfOrder(userId, providerId) || selfOrderAllowed()) return;
  throw new ApiError(403, "Kendi hizmetinizden sipariş veremezsiniz.", "SELF_ORDER");
}

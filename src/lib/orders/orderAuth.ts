import type { AuthUser } from "@/lib/auth/types";
import { ApiError } from "@/lib/errors";

/** K-012: işlem bazlı yetki. Kimlik (`user.id`) esas; rol yalnızca admin bypass. */
export const ORDER_FORBIDDEN_MESSAGE = "Bu işlemi yapma yetkiniz yok.";

export type OrderPartyRow = {
  user_id: string | null;
  provider_id: string;
};

export function isAdminActor(user: AuthUser) {
  return user.role === "admin";
}

export function isOrderCustomer(user: AuthUser, row: OrderPartyRow) {
  return Boolean(row.user_id) && row.user_id === user.id;
}

export function isOrderProvider(user: AuthUser, row: OrderPartyRow) {
  return row.provider_id === user.id;
}

export function isOrderParty(user: AuthUser, row: OrderPartyRow) {
  if (isAdminActor(user)) return true;
  return isOrderCustomer(user, row) || isOrderProvider(user, row);
}

export function canSeeOrder(user: AuthUser, row: OrderPartyRow) {
  return isOrderParty(user, row);
}

export function forbidOrderAction(): never {
  throw new ApiError(403, ORDER_FORBIDDEN_MESSAGE, "FORBIDDEN");
}

export function assertOrderVisible(user: AuthUser, row: OrderPartyRow | null | undefined) {
  if (!row || !canSeeOrder(user, row)) {
    throw new ApiError(404, "Sipariş yok.", "NOT_FOUND");
  }
}

/** Kabul, red, alım/teslim kodu, yıkama/ütü/hazır, erteleme, iş fotoğrafı. */
export function assertProviderAction(user: AuthUser, row: OrderPartyRow) {
  if (isAdminActor(user) || isOrderProvider(user, row)) return;
  forbidOrderAction();
}

/** Alım özeti, boy artışı, müşteri iptali, yorum, uyuşmazlık açma. */
export function assertCustomerAction(user: AuthUser, row: OrderPartyRow) {
  if (isAdminActor(user) || isOrderCustomer(user, row)) return;
  forbidOrderAction();
}


import { generateHandoffPin } from "@/lib/handoff/codegen";
import {
  bumpHandoffAttempt,
  getHandoffCode,
  markHandoffUsed,
  rotateHandoffCode,
  upsertHandoffCode,
  type HandoffKind,
} from "@/lib/db/handoffCodes";
import { getOrderRow, updateOrderPickupSummaryApproved } from "@/lib/db/orders";
import type { AuthUser } from "@/lib/auth/types";
import { ApiError } from "@/server/rules";
import { lifecycleOf } from "@/lib/status";
import type { OrderStatus } from "@/lib/types";
import { notifyHandoffCodeRotated } from "@/lib/services/notificationService";

export const HANDOFF_PIN_LEN = 4;
export const HANDOFF_MAX_ATTEMPTS = 5;

function digits(raw: string) {
  return raw.replace(/\D/g, "");
}

export function issueReturnHandoffCode(orderId: string) {
  upsertHandoffCode({ orderId, kind: "return", code: generateHandoffPin() });
}

export function activatePickupHandoffCode(orderId: string) {
  upsertHandoffCode({ orderId, kind: "pickup", code: generateHandoffPin() });
}

export function pickupHandoffActive(row: NonNullable<ReturnType<typeof getOrderRow>>) {
  if (!row.pickup_summary_approved_at || !row.pickup_confirmed_at) return false;
  if (row.price_change === "pending" || row.price_change === "rejected") return false;
  const hc = getHandoffCode(row.id, "pickup");
  if (!hc || hc.locked || hc.used_at) return false;
  return true;
}

export function returnHandoffActive(row: NonNullable<ReturnType<typeof getOrderRow>>) {
  const lc = lifecycleOf(row.status as OrderStatus, row.lifecycle);
  if (lc !== "ready") return false;
  if (row.admin_hold) return false;
  const hc = getHandoffCode(row.id, "return");
  if (!hc || hc.locked || hc.used_at) return false;
  return true;
}

export function customerHandoffSecrets(row: NonNullable<ReturnType<typeof getOrderRow>>) {
  const pickup = pickupHandoffActive(row) ? getHandoffCode(row.id, "pickup")?.code ?? null : null;
  const ret = returnHandoffActive(row) ? getHandoffCode(row.id, "return")?.code ?? null : null;
  return { pickupHandoffCode: pickup, returnHandoffCode: ret };
}

export function approvePickupSummary(user: AuthUser, orderId: string) {
  const row = getOrderRow(orderId);
  if (!row) throw new ApiError(404, "Sipariş yok.", "NOT_FOUND");
  if (row.user_id !== user.id && user.role !== "admin") {
    throw new ApiError(403, "Özet onayını müşteri verir.", "FORBIDDEN");
  }
  if (!row.pickup_confirmed_at) {
    throw new ApiError(409, "Kapı özeti henüz yok.", "INVALID_TRANSITION");
  }
  if (row.price_change === "pending") {
    throw new ApiError(409, "Önce fiyat değişikliğini onayla.", "INVALID_TRANSITION");
  }
  const now = new Date().toISOString();
  updateOrderPickupSummaryApproved(orderId, now);
  activatePickupHandoffCode(orderId);
  return orderId;
}

export function verifyHandoffPin(
  row: NonNullable<ReturnType<typeof getOrderRow>>,
  kind: HandoffKind,
  rawCode: string | undefined,
  enteredBy: string,
  now: string,
) {
  const hc = getHandoffCode(row.id, kind);
  if (!hc) throw new ApiError(409, "Kod henüz aktif değil.", "INVALID_TRANSITION");
  if (hc.locked) throw new ApiError(409, "Kod kilitlendi. Müşteri yeni kod almalı.", "INVALID_CODE");
  if (hc.used_at) throw new ApiError(409, "Kod zaten kullanıldı.", "INVALID_TRANSITION");

  const entered = digits(rawCode ?? "");
  if (entered.length !== HANDOFF_PIN_LEN || entered !== hc.code) {
    const attempts = hc.attempts + 1;
    if (attempts >= HANDOFF_MAX_ATTEMPTS) {
      const fresh = generateHandoffPin();
      rotateHandoffCode(row.id, kind, fresh);
      notifyHandoffCodeRotated(row, kind, fresh);
      throw new ApiError(409, "Beş hatalı deneme. Yeni kod müşteriye iletildi.", "INVALID_CODE");
    }
    bumpHandoffAttempt(row.id, kind, attempts, false);
    throw new ApiError(409, `Kod uyuşmadı. Kalan: ${HANDOFF_MAX_ATTEMPTS - attempts}.`, "INVALID_CODE");
  }
  markHandoffUsed(row.id, kind, enteredBy, now);
}

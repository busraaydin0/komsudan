import { randomUUID } from "node:crypto";
import { ApiError } from "@/lib/errors";
import type { AppPayment, PaymentStatus } from "@/lib/types";
import {
  getPaymentByOrderId,
  getPaymentByReference,
  insertPayment,
  listPaymentsByOrderIds,
  updatePaymentAmounts,
  updatePaymentStatus,
  type PaymentRow,
} from "@/lib/db/payments";
import { db } from "@/lib/db/client";
import { getAppointment } from "@/lib/db/appointments";
import { getOrderRow, markExpressRefund, markOrderCompletedAt } from "@/lib/db/orders";
import { hasHoldForOrder } from "@/lib/db/wallets";
import { COMMISSION, expressBumpPortion } from "@/lib/pricing";
import { pickupInstantIso } from "@/lib/scheduling/windows";
import {
  adjustHoldForOrder,
  captureHold,
  creditOnCapture,
  refundExpressBump,
  releaseHold,
} from "@/lib/services/walletService";

export type { AppPayment };

function toPublic(row: PaymentRow): AppPayment {
  return {
    id: row.id,
    orderId: row.order_id,
    amount: row.amount,
    commission: row.commission,
    status: row.status as PaymentStatus,
    providerReference: row.provider_reference,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** iyzico yokken simüle referans. Gerçek id webhook/capture'te yazılacak. */
function simReference() {
  return `sim-${randomUUID().slice(0, 12)}`;
}

export function paymentForOrder(orderId: string): AppPayment | undefined {
  const row = getPaymentByOrderId(orderId);
  return row ? toPublic(row) : undefined;
}

export function paymentsForOrders(orderIds: string[]): Map<string, AppPayment> {
  const rows = listPaymentsByOrderIds(orderIds);
  const map = new Map<string, AppPayment>();
  for (const row of rows) {
    map.set(row.order_id, toPublic(row));
  }
  return map;
}

export function authorizePayment(input: {
  orderId: string;
  amount: number;
  commission: number;
  at: string;
}) {
  const existing = getPaymentByOrderId(input.orderId);
  if (existing) {
    if (existing.status !== "authorized") {
      throw new ApiError(409, "Bu siparişte ödeme zaten var.", "PAYMENT_EXISTS");
    }
    updatePaymentAmounts(input.orderId, input.amount, input.commission, input.at);
    return paymentForOrder(input.orderId)!;
  }
  return toPublic(
    insertPayment({
      orderId: input.orderId,
      amount: input.amount,
      commission: input.commission,
      status: "authorized",
      providerReference: simReference(),
      at: input.at,
    }),
  );
}

/** Ödeme tutarı ve cüzdan rezervi aynı transaction'da; INSUFFICIENT_BALANCE ödeme tutarını geri alır. */
export function authorizePaymentAndHold(input: {
  orderId: string;
  amount: number;
  commission: number;
  at: string;
  userId?: string | null;
}) {
  return db().transaction(() => {
    const payment = authorizePayment(input);
    if (input.userId) adjustHoldForOrder(input.userId, input.orderId, input.amount, input.at);
    return payment;
  })();
}

export function capturePayment(orderId: string, at: string) {
  const row = getPaymentByOrderId(orderId);
  if (!row) throw new ApiError(409, "Ödeme kaydı yok.", "PAYMENT_MISSING");
  if (row.status === "captured") return toPublic(row);
  if (row.status !== "authorized") {
    throw new ApiError(409, "Bu ödeme tahsil edilemez.", "PAYMENT_STATE");
  }
  return db().transaction(() => {
    const order = getOrderRow(orderId);
    let captureAmount = row.amount;
    let commission = row.commission;

    if (order?.express && (order.express_refund ?? 0) === 0) {
      const pickup = getAppointment(orderId, "pickup");
      if (pickup) {
        const start = pickupInstantIso(pickup.date, pickup.window_start);
        const completedMs = Date.parse(at);
        if (Number.isFinite(completedMs) && completedMs > start.getTime() + 24 * 3_600_000) {
          const bump = expressBumpPortion(row.amount);
          if (bump > 0) {
            const netPay = Math.max(0, row.amount - bump);
            commission = Math.round(netPay * COMMISSION);
            captureAmount = netPay;
            if (order.user_id && hasHoldForOrder(orderId)) {
              refundExpressBump(order.user_id, orderId, bump, at);
            }
            updatePaymentAmounts(orderId, captureAmount, commission, at);
            markExpressRefund(orderId, bump, at);
          }
        }
      }
    }

    markOrderCompletedAt(orderId, at);

    let collected = captureAmount;
    const live = getOrderRow(orderId);
    if (live?.user_id) {
      const taken = captureHold(live.user_id, orderId, captureAmount, at);
      // Hold varken taken === amount (aksi halde captureHold atar). Hold yoksa kart/simüle: cüzdan düşmez.
      if (hasHoldForOrder(orderId) && taken > 0) collected = taken;
    }
    // Gerekçe: kısmi tahsilde payment.amount ve komisyon yalan söylemesin diye
    // hold varken remaining !== amount hata. Hold yoksa kazanç payment.amount - commission.
    const net = Math.max(0, collected - commission);
    updatePaymentStatus(orderId, "captured", at);
    if (live) creditOnCapture(live.provider_id, orderId, net, at);
    return paymentForOrder(orderId)!;
  })();
}

export function voidPayment(orderId: string, at: string) {
  const row = getPaymentByOrderId(orderId);
  if (!row) throw new ApiError(409, "Ödeme kaydı yok.", "PAYMENT_MISSING");
  if (row.status === "voided") return toPublic(row);
  if (row.status !== "authorized") {
    throw new ApiError(409, "Bu ödeme çözülemez.", "PAYMENT_STATE");
  }
  updatePaymentStatus(orderId, "voided", at);
  const order = getOrderRow(orderId);
  if (order?.user_id) releaseHold(order.user_id, orderId, row.amount, at);
  return paymentForOrder(orderId)!;
}

export function receiveWebhook(input: { event: string; providerReference?: string }) {
  if (!input.providerReference) {
    return { received: true, payment: null as AppPayment | null };
  }
  const row = getPaymentByReference(input.providerReference);
  return { received: true, payment: row ? toPublic(row) : null };
}

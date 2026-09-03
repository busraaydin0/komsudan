import { randomUUID } from "node:crypto";
import { ApiError } from "@/server/rules";
import type { AppPayment, PaymentStatus } from "@/lib/types";
import {
  getPaymentByOrderId,
  getPaymentByReference,
  insertPayment,
  updatePaymentStatus,
  type PaymentRow,
} from "@/lib/db/payments";
import { getOrderRow } from "@/lib/db/orders";
import { creditOnCapture, releaseHold } from "@/lib/services/walletService";

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

export function authorizePayment(input: {
  orderId: string;
  amount: number;
  commission: number;
  at: string;
}) {
  if (getPaymentByOrderId(input.orderId)) {
    throw new ApiError(409, "Bu siparişte ödeme zaten var.", "PAYMENT_EXISTS");
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

export function capturePayment(orderId: string, at: string) {
  const row = getPaymentByOrderId(orderId);
  if (!row) throw new ApiError(409, "Ödeme kaydı yok.", "PAYMENT_MISSING");
  if (row.status === "captured") return toPublic(row);
  if (row.status !== "authorized") {
    throw new ApiError(409, "Bu ödeme tahsil edilemez.", "PAYMENT_STATE");
  }
  updatePaymentStatus(orderId, "captured", at);
  const order = getOrderRow(orderId);
  if (order) {
    const net = Math.max(0, row.amount - row.commission);
    creditOnCapture(order.provider_id, orderId, net);
  }
  return paymentForOrder(orderId)!;
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
  if (order?.user_id) releaseHold(order.user_id, orderId, row.amount);
  return paymentForOrder(orderId)!;
}

export function receiveWebhook(input: { event: string; providerReference?: string }) {
  if (!input.providerReference) {
    return { received: true, payment: null as AppPayment | null };
  }
  const row = getPaymentByReference(input.providerReference);
  return { received: true, payment: row ? toPublic(row) : null };
}

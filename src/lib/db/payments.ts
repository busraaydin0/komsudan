import { randomUUID } from "node:crypto";
import { db } from "./client";

export type PaymentRow = {
  id: string;
  order_id: string;
  amount: number;
  commission: number;
  status: string;
  provider_reference: string | null;
  created_at: string;
  updated_at: string;
};

export function insertPayment(input: {
  orderId: string;
  amount: number;
  commission: number;
  status: string;
  providerReference: string;
  at: string;
}) {
  const row: PaymentRow = {
    id: `pay-${randomUUID().slice(0, 10)}`,
    order_id: input.orderId,
    amount: input.amount,
    commission: input.commission,
    status: input.status,
    provider_reference: input.providerReference,
    created_at: input.at,
    updated_at: input.at,
  };
  db()
    .prepare(
      `INSERT INTO payments (
        id, order_id, amount, commission, status, provider_reference, created_at, updated_at
      ) VALUES (
        @id, @order_id, @amount, @commission, @status, @provider_reference, @created_at, @updated_at
      )`,
    )
    .run(row);
  return row;
}

export function getPaymentByOrderId(orderId: string): PaymentRow | undefined {
  return db().prepare("SELECT * FROM payments WHERE order_id = ?").get(orderId) as PaymentRow | undefined;
}

export function getPaymentById(id: string): PaymentRow | undefined {
  return db().prepare("SELECT * FROM payments WHERE id = ?").get(id) as PaymentRow | undefined;
}

export function getPaymentByReference(ref: string): PaymentRow | undefined {
  return db()
    .prepare("SELECT * FROM payments WHERE provider_reference = ?")
    .get(ref) as PaymentRow | undefined;
}

export function updatePaymentStatus(orderId: string, status: string, at: string) {
  const result = db()
    .prepare("UPDATE payments SET status = ?, updated_at = ? WHERE order_id = ?")
    .run(status, at, orderId);
  return result.changes;
}

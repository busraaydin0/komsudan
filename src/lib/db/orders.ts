import { randomUUID } from "node:crypto";
import { db } from "./client";

export type OrderRow = {
  id: string;
  provider_id: string;
  package_id: string;
  pieces: number;
  express: number;
  drop_method: string;
  drop_point_id: string | null;
  slot: string;
  note: string;
  total: number;
  commission: number;
  status: string;
  created_at: string;
  updated_at: string;
  pickup_code: string | null;
  code_attempts: number;
  paid_at: string | null;
  payment_status: string;
  user_id: string | null;
  price_per_kg_snapshot: number | null;
  estimated_weight: number | null;
  actual_weight: number | null;
  estimated_price: number | null;
  final_price: number | null;
  delivery_mode: string | null;
  scheduled_window_start: string | null;
  scheduled_window_end: string | null;
  lifecycle: string | null;
};

export type InsertOrderInput = {
  id: string;
  provider_id: string;
  package_id: string;
  pieces: number;
  express: number;
  drop_method: string;
  drop_point_id: string | null;
  slot: string;
  note: string;
  total: number;
  commission: number;
  status: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  price_per_kg_snapshot: number;
  estimated_weight: number;
  estimated_price: number;
  delivery_mode: string;
  scheduled_window_start: string;
  lifecycle: string;
};

export function getRemaining(providerId: string) {
  const row = db()
    .prepare("SELECT remaining FROM providers WHERE id = ?")
    .get(providerId) as { remaining: number } | undefined;
  return row?.remaining;
}

export function addRemaining(providerId: string, delta: number) {
  db().prepare("UPDATE providers SET remaining = remaining + ? WHERE id = ?").run(delta, providerId);
}

export function dropPointExists(id: string) {
  const row = db().prepare("SELECT id FROM drop_points WHERE id = ?").get(id) as { id: string } | undefined;
  return Boolean(row);
}

export function getOrderRow(id: string): OrderRow | undefined {
  return db().prepare("SELECT * FROM orders WHERE id = ?").get(id) as OrderRow | undefined;
}

export function listOrderRowsAll(): OrderRow[] {
  return db().prepare("SELECT * FROM orders ORDER BY created_at DESC").all() as OrderRow[];
}

export function listOrderRowsForCustomer(userId: string): OrderRow[] {
  return db()
    .prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC")
    .all(userId) as OrderRow[];
}

export function customerHasOpenOrder(userId: string) {
  const row = db()
    .prepare(
      `SELECT 1 AS n FROM orders
       WHERE user_id = ? AND status NOT IN ('teslim_edildi', 'iptal')
       LIMIT 1`,
    )
    .get(userId) as { n: number } | undefined;
  return Boolean(row);
}

export function listOrderRowsForProvider(userId: string): OrderRow[] {
  return db()
    .prepare(
      `SELECT * FROM orders
       WHERE user_id = ? OR provider_id = ?
       ORDER BY created_at DESC`,
    )
    .all(userId, userId) as OrderRow[];
}

export function insertOrderRow(input: InsertOrderInput) {
  db()
    .prepare(
      `INSERT INTO orders (
        id, provider_id, package_id, pieces, express, drop_method, drop_point_id,
        slot, note, total, commission, status, created_at, updated_at,
        pickup_code, code_attempts, paid_at, payment_status, user_id,
        price_per_kg_snapshot, estimated_weight, actual_weight, estimated_price, final_price,
        delivery_mode, scheduled_window_start, scheduled_window_end, lifecycle
      ) VALUES (
        @id, @provider_id, @package_id, @pieces, @express, @drop_method, @drop_point_id,
        @slot, @note, @total, @commission, @status, @created_at, @updated_at,
        NULL, 0, NULL, 'authorized', @user_id,
        @price_per_kg_snapshot, @estimated_weight, NULL, @estimated_price, NULL,
        @delivery_mode, @scheduled_window_start, NULL, @lifecycle
      )`,
    )
    .run(input);
}

export type HistoryRow = {
  id: string;
  order_id: string;
  from_status: string | null;
  to_status: string;
  from_lifecycle: string | null;
  to_lifecycle: string;
  actor_id: string | null;
  actor_role: string | null;
  note: string | null;
  created_at: string;
};

export function recordTransition(input: {
  orderId: string;
  fromStatus: string | null;
  toStatus: string;
  fromLifecycle: string | null;
  toLifecycle: string;
  actorId: string | null;
  actorRole: string | null;
  note?: string | null;
  at: string;
}) {
  db()
    .prepare(
      `INSERT INTO order_status_history (
        id, order_id, from_status, to_status, from_lifecycle, to_lifecycle,
        actor_id, actor_role, note, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      `h-${randomUUID()}`,
      input.orderId,
      input.fromStatus,
      input.toStatus,
      input.fromLifecycle,
      input.toLifecycle,
      input.actorId,
      input.actorRole,
      input.note ?? null,
      input.at,
    );
}

export function listHistoryRows(orderId: string): HistoryRow[] {
  return db()
    .prepare("SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC, id ASC")
    .all(orderId) as HistoryRow[];
}

export function setPickupCode(id: string, code: string) {
  db().prepare("UPDATE orders SET pickup_code = ? WHERE id = ?").run(code, id);
}

export function bumpCodeAttempts(id: string, attempts: number, updatedAt: string) {
  db().prepare("UPDATE orders SET code_attempts = ?, updated_at = ? WHERE id = ?").run(attempts, updatedAt, id);
}

export function rotatePickupCode(id: string, code: string, updatedAt: string) {
  db()
    .prepare("UPDATE orders SET pickup_code = ?, code_attempts = 0, updated_at = ? WHERE id = ?")
    .run(code, updatedAt, id);
}

export function updateOrderStatus(input: {
  id: string;
  status: string;
  lifecycle: string;
  updatedAt: string;
  pickupCode?: string | null;
  resetAttempts?: boolean;
  paymentStatus?: string;
  paidAt?: string | null;
  finalPrice?: number | null;
}) {
  if (input.pickupCode !== undefined && input.resetAttempts && input.paymentStatus === "captured") {
    db()
      .prepare(
        `UPDATE orders SET status = ?, lifecycle = ?, payment_status = 'captured', paid_at = ?, pickup_code = NULL,
         code_attempts = 0, final_price = ?, updated_at = ? WHERE id = ?`,
      )
      .run(input.status, input.lifecycle, input.paidAt, input.finalPrice ?? null, input.updatedAt, input.id);
    return;
  }
  if (input.paymentStatus === "voided") {
    db()
      .prepare(
        `UPDATE orders SET status = ?, lifecycle = ?, payment_status = 'voided', pickup_code = NULL, updated_at = ? WHERE id = ?`,
      )
      .run(input.status, input.lifecycle, input.updatedAt, input.id);
    return;
  }
  if (input.pickupCode) {
    db()
      .prepare(
        "UPDATE orders SET status = ?, lifecycle = ?, pickup_code = ?, code_attempts = 0, updated_at = ? WHERE id = ?",
      )
      .run(input.status, input.lifecycle, input.pickupCode, input.updatedAt, input.id);
    return;
  }
  db()
    .prepare("UPDATE orders SET status = ?, lifecycle = ?, updated_at = ? WHERE id = ?")
    .run(input.status, input.lifecycle, input.updatedAt, input.id);
}

export function runOrderTx<T>(fn: () => T): T {
  return db().transaction(fn)();
}

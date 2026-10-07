import { randomUUID } from "node:crypto";
import type { LaundrySize, PriceChangeStatus } from "@/lib/laundryModel";
import type { OrderStatusId } from "@/lib/status";
import { db } from "./client";

export type OrderRow = {
  id: string;
  provider_id: string;
  package_id: string;
  express: number;
  drop_method: string;
  slot: string;
  note: string;
  total: number;
  commission: number;
  status: string;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
  payment_status: string;
  user_id: string | null;
  delivery_mode: string | null;
  scheduled_window_start: string | null;
  size: LaundrySize | null;
  confirmed_size: LaundrySize | null;
  machine_units: number;
  pickup_confirmed_at: string | null;
  color_groups: number | null;
  price_change: PriceChangeStatus;
  cancel_reason: string | null;
  estimated_delivery_date: string | null;
  promised_delivery_date: string | null;
  capacity_allocations: string | null;
  delay_count: number;
  cancel_free_hours: number | null;
  respond_by: string | null;
  respond_reminder_sent: number;
  public_code: string | null;
  pickup_summary_approved_at: string | null;
  admin_hold: number;
  dispute_window_end: string | null;
};

export type InsertOrderInput = {
  id: string;
  provider_id: string;
  package_id: string;
  express: number;
  drop_method: string;
  slot: string;
  note: string;
  total: number;
  commission: number;
  status: OrderStatusId;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  delivery_mode: string;
  scheduled_window_start: string;
  size: LaundrySize;
  machine_units: number;
  estimated_delivery_date?: string | null;
  respond_by?: string | null;
  public_code?: string | null;
};

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
       WHERE user_id = ? AND status NOT IN ('completed', 'cancelled', 'rejected', 'disputed')
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
        id, provider_id, package_id, express, drop_method, slot, note, total, commission,
        status, created_at, updated_at, payment_status, user_id, delivery_mode,
        scheduled_window_start, size, machine_units, price_change,
        estimated_delivery_date, respond_by, public_code
      ) VALUES (
        @id, @provider_id, @package_id, @express, @drop_method, @slot, @note, @total, @commission,
        @status, @created_at, @updated_at, 'authorized', @user_id, @delivery_mode,
        @scheduled_window_start, @size, @machine_units, 'none',
        @estimated_delivery_date, @respond_by, @public_code
      )`,
    )
    .run({
      estimated_delivery_date: input.estimated_delivery_date ?? null,
      respond_by: input.respond_by ?? null,
      public_code: input.public_code ?? null,
      ...input,
    });
}

export function updateOrderPickupSummaryApproved(id: string, at: string) {
  db().prepare(`UPDATE orders SET pickup_summary_approved_at = ?, updated_at = ? WHERE id = ?`).run(at, at, id);
}

export function setOrderAdminHold(id: string, hold: boolean, disputeWindowEnd: string | null, updatedAt: string) {
  db()
    .prepare(
      `UPDATE orders SET admin_hold = ?, dispute_window_end = ?, status = ?, updated_at = ? WHERE id = ?`,
    )
    .run(hold ? 1 : 0, disputeWindowEnd, hold ? "admin_pending" : "ready", updatedAt, id);
}

export type HistoryRow = {
  id: string;
  order_id: string;
  from_status: string | null;
  to_status: string;
  actor_id: string | null;
  actor_role: string | null;
  note: string | null;
  created_at: string;
};

export function recordTransition(input: {
  orderId: string;
  fromStatus: string | null;
  toStatus: string;
  actorId: string | null;
  actorRole: string | null;
  note: string | null;
  at: string;
}) {
  db()
    .prepare(
      `INSERT INTO order_status_history (
        id, order_id, from_status, to_status, actor_id, actor_role, note, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      `h-${randomUUID().slice(0, 12)}`,
      input.orderId,
      input.fromStatus,
      input.toStatus,
      input.actorId,
      input.actorRole,
      input.note,
      input.at,
    );
}

export function listHistoryRows(orderId: string): HistoryRow[] {
  return db()
    .prepare("SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC, id ASC")
    .all(orderId) as HistoryRow[];
}

export function updateOrderStatus(input: {
  id: string;
  status: OrderStatusId;
  updatedAt: string;
  resetAttempts?: boolean;
  paymentStatus?: string;
  paidAt?: string | null;
}) {
  if (input.resetAttempts && input.paymentStatus === "captured") {
    db()
      .prepare(
        `UPDATE orders SET status = ?, payment_status = 'captured', paid_at = ?, updated_at = ? WHERE id = ?`,
      )
      .run(input.status, input.paidAt, input.updatedAt, input.id);
    return;
  }
  if (input.paymentStatus === "voided") {
    db()
      .prepare(`UPDATE orders SET status = ?, payment_status = 'voided', updated_at = ? WHERE id = ?`)
      .run(input.status, input.updatedAt, input.id);
    return;
  }
  db()
    .prepare("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?")
    .run(input.status, input.updatedAt, input.id);
}

export function updateOrderPickupConfirm(input: {
  id: string;
  confirmedSize: LaundrySize;
  colorGroups: number;
  machineUnits: number;
  total: number;
  commission: number;
  priceChange: PriceChangeStatus;
  at: string;
}) {
  db()
    .prepare(
      `UPDATE orders SET confirmed_size = ?, color_groups = ?, machine_units = ?, total = ?, commission = ?,
        price_change = ?, pickup_confirmed_at = ?, updated_at = ? WHERE id = ?`,
    )
    .run(
      input.confirmedSize,
      input.colorGroups,
      input.machineUnits,
      input.total,
      input.commission,
      input.priceChange,
      input.at,
      input.at,
      input.id,
    );
}

export function updateOrderPriceChange(id: string, priceChange: PriceChangeStatus, at: string) {
  db().prepare(`UPDATE orders SET price_change = ?, updated_at = ? WHERE id = ?`).run(priceChange, at, id);
}

export function updateOrderCancelReason(id: string, reason: string, at: string) {
  db().prepare(`UPDATE orders SET cancel_reason = ?, updated_at = ? WHERE id = ?`).run(reason, at, id);
}

export function updateOrderCapacityCommit(input: {
  id: string;
  promisedDeliveryDate: string;
  allocationsJson: string;
  updatedAt: string;
}) {
  db()
    .prepare(
      `UPDATE orders SET promised_delivery_date = ?, capacity_allocations = ?, updated_at = ? WHERE id = ?`,
    )
    .run(input.promisedDeliveryDate, input.allocationsJson, input.updatedAt, input.id);
}

export function updateOrderDelay(input: {
  id: string;
  promisedDeliveryDate: string;
  delayCount: number;
  updatedAt: string;
  cancelFreeHours?: number;
}) {
  if (input.cancelFreeHours != null) {
    db()
      .prepare(
        `UPDATE orders SET promised_delivery_date = ?, delay_count = ?, cancel_free_hours = ?, updated_at = ? WHERE id = ?`,
      )
      .run(
        input.promisedDeliveryDate,
        input.delayCount,
        input.cancelFreeHours,
        input.updatedAt,
        input.id,
      );
    return;
  }
  db()
    .prepare(
      `UPDATE orders SET promised_delivery_date = ?, delay_count = ?, updated_at = ? WHERE id = ?`,
    )
    .run(input.promisedDeliveryDate, input.delayCount, input.updatedAt, input.id);
}

export function runOrderTx<T>(fn: () => T): T {
  return db().transaction(fn)();
}

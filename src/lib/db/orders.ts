import { randomUUID } from "node:crypto";
import type { LaundrySize, PriceChangeStatus } from "@/lib/laundryModel";
import { db } from "./client";

export type OrderRow = {
  id: string;
  provider_id: string;
  package_id: string;
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
  delivery_mode: string | null;
  scheduled_window_start: string | null;
  scheduled_window_end: string | null;
  lifecycle: string | null;
  product_id: string | null;
  product_name: string | null;
  guest_count: number | null;
  allergy_note: string | null;
  fulfillment_type: string;
  visit_district: string | null;
  visit_neighborhood: string | null;
  visit_address: string | null;
  address_share_consent: number;
  dispute_window_hours: number | null;
  cancel_free_hours: number | null;
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
  respond_by: string | null;
  respond_reminder_sent: number;
};

export type InsertOrderInput = {
  id: string;
  provider_id: string;
  package_id: string;
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
  delivery_mode: string;
  scheduled_window_start: string;
  lifecycle: string;
  size: LaundrySize;
  machine_units: number;
  estimated_delivery_date?: string | null;
  respond_by?: string | null;
  product_id?: string | null;
  product_name?: string | null;
  guest_count?: number | null;
  allergy_note?: string | null;
  fulfillment_type?: string;
  visit_district?: string | null;
  visit_neighborhood?: string | null;
  visit_address?: string | null;
  address_share_consent?: number;
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
        id, provider_id, package_id, express, drop_method, drop_point_id,
        slot, note, total, commission, status, created_at, updated_at,
        pickup_code, code_attempts, paid_at, payment_status, user_id,
        delivery_mode, scheduled_window_start, scheduled_window_end, lifecycle,
        product_id, product_name, guest_count, allergy_note,
        fulfillment_type, visit_district, visit_neighborhood, visit_address, address_share_consent,
        size, machine_units, price_change, estimated_delivery_date, respond_by
      ) VALUES (
        @id, @provider_id, @package_id, @express, @drop_method, @drop_point_id,
        @slot, @note, @total, @commission, @status, @created_at, @updated_at,
        NULL, 0, NULL, 'authorized', @user_id,
        @delivery_mode, @scheduled_window_start, NULL, @lifecycle,
        @product_id, @product_name, @guest_count, @allergy_note,
        @fulfillment_type, @visit_district, @visit_neighborhood, @visit_address, @address_share_consent,
        @size, @machine_units, 'none', @estimated_delivery_date, @respond_by
      )`,
    )
    .run({
      product_id: null,
      product_name: null,
      guest_count: null,
      allergy_note: null,
      fulfillment_type: "dropoff",
      visit_district: null,
      visit_neighborhood: null,
      visit_address: null,
      address_share_consent: 0,
      estimated_delivery_date: input.estimated_delivery_date ?? null,
      respond_by: input.respond_by ?? null,
      ...input,
    });
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
}) {
  if (input.pickupCode !== undefined && input.resetAttempts && input.paymentStatus === "captured") {
    db()
      .prepare(
        `UPDATE orders SET status = ?, lifecycle = ?, payment_status = 'captured', paid_at = ?, pickup_code = NULL,
         code_attempts = 0, updated_at = ? WHERE id = ?`,
      )
      .run(input.status, input.lifecycle, input.paidAt, input.updatedAt, input.id);
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
      `UPDATE orders SET confirmed_size = ?, color_groups = ?, machine_units = ?,
       pickup_confirmed_at = ?, total = ?, commission = ?, price_change = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      input.confirmedSize,
      input.colorGroups,
      input.machineUnits,
      input.at,
      input.total,
      input.commission,
      input.priceChange,
      input.at,
      input.id,
    );
}

export function updateOrderPriceChange(id: string, priceChange: PriceChangeStatus, updatedAt: string) {
  db().prepare(`UPDATE orders SET price_change = ?, updated_at = ? WHERE id = ?`).run(priceChange, updatedAt, id);
}

export function updateOrderCancelReason(id: string, reason: string, updatedAt: string) {
  db().prepare(`UPDATE orders SET cancel_reason = ?, updated_at = ? WHERE id = ?`).run(reason, updatedAt, id);
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

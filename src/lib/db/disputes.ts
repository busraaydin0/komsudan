import { db } from "./client";

export type DisputeStatus = "open" | "resolved";
export type DisputeOpenerRole = "customer" | "provider" | "admin";

export type DisputeRow = {
  id: string;
  order_id: string;
  opened_by: string;
  opener_role: DisputeOpenerRole;
  reason: string;
  status: DisputeStatus;
  created_at: string;
  resolved_at: string | null;
};

export function insertDispute(row: DisputeRow) {
  db()
    .prepare(
      `INSERT INTO disputes (
         id, order_id, opened_by, opener_role, reason, status, created_at, resolved_at
       ) VALUES (
         @id, @order_id, @opened_by, @opener_role, @reason, @status, @created_at, @resolved_at
       )`,
    )
    .run(row);
}

export function getDispute(id: string): DisputeRow | undefined {
  return db().prepare("SELECT * FROM disputes WHERE id = ?").get(id) as DisputeRow | undefined;
}

export function listDisputesForOrder(orderId: string): DisputeRow[] {
  return db()
    .prepare("SELECT * FROM disputes WHERE order_id = ? ORDER BY created_at DESC")
    .all(orderId) as DisputeRow[];
}

export function getOpenDisputeForOrder(orderId: string): DisputeRow | undefined {
  return db()
    .prepare("SELECT * FROM disputes WHERE order_id = ? AND status = 'open' LIMIT 1")
    .get(orderId) as DisputeRow | undefined;
}

export function listDisputesForParty(userId: string): DisputeRow[] {
  return db()
    .prepare(
      `SELECT d.* FROM disputes d
       JOIN orders o ON o.id = d.order_id
       WHERE o.user_id = ? OR o.provider_id = ?
       ORDER BY d.created_at DESC`,
    )
    .all(userId, userId) as DisputeRow[];
}

export function listDisputesAll(): DisputeRow[] {
  return db()
    .prepare("SELECT * FROM disputes ORDER BY created_at DESC")
    .all() as DisputeRow[];
}

export function resolveDispute(id: string, at: string) {
  const result = db()
    .prepare(
      `UPDATE disputes SET status = 'resolved', resolved_at = ?
       WHERE id = ? AND status = 'open'`,
    )
    .run(at, id);
  return result.changes;
}

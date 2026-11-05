import { randomUUID } from "node:crypto";
import { db } from "./client";

export type AdminProviderRow = {
  user_id: string;
  full_name: string;
  neighborhood: string | null;
  status: "active" | "paused";
  suspended: number;
  suspended_at: string | null;
  suspended_reason: string | null;
};

export type ProviderMonthCounts = {
  order_count: number;
  completed: number;
  cancelled: number;
  unanswered: number;
  delayed: number;
};

export type PaymentMonthSums = {
  revenue: number;
  commission: number;
};

export type RepeatCustomerCounts = {
  customers: number;
  repeaters: number;
};

export type CompletedDeliveryRow = {
  provider_id: string;
  promised_delivery_date: string;
  updated_at: string;
};

export type AdminAuditRow = {
  id: string;
  actor_id: string;
  action: string;
  target_type: string;
  target_id: string;
  reason: string | null;
  created_at: string;
};

export function listAdminProviderRows(): AdminProviderRow[] {
  return db()
    .prepare(
      `SELECT p.user_id, u.full_name, p.neighborhood, p.status,
              p.suspended, p.suspended_at, p.suspended_reason
       FROM provider_profiles p
       JOIN users u ON u.id = p.user_id
       ORDER BY u.full_name COLLATE NOCASE ASC`,
    )
    .all() as AdminProviderRow[];
}

export function getAdminProviderRow(providerId: string): AdminProviderRow | undefined {
  return db()
    .prepare(
      `SELECT p.user_id, u.full_name, p.neighborhood, p.status,
              p.suspended, p.suspended_at, p.suspended_reason
       FROM provider_profiles p
       JOIN users u ON u.id = p.user_id
       WHERE p.user_id = ?`,
    )
    .get(providerId) as AdminProviderRow | undefined;
}

export function listSuspendedProviderIds(): string[] {
  return (
    db()
      .prepare(`SELECT user_id FROM provider_profiles WHERE suspended = 1`)
      .all() as { user_id: string }[]
  ).map((row) => row.user_id);
}

export function setProviderSuspended(
  providerId: string,
  input: { suspended: boolean; reason: string | null; at: string },
) {
  db()
    .prepare(
      `UPDATE provider_profiles
       SET suspended = @suspended,
           suspended_at = @suspendedAt,
           suspended_reason = @reason,
           updated_at = @at
       WHERE user_id = @providerId`,
    )
    .run({
      providerId,
      suspended: input.suspended ? 1 : 0,
      suspendedAt: input.suspended ? input.at : null,
      reason: input.suspended ? input.reason : null,
      at: input.at,
    });
}

export function insertAdminAudit(input: {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  reason: string | null;
  at: string;
}): AdminAuditRow {
  const row: AdminAuditRow = {
    id: `aud-${randomUUID().slice(0, 12)}`,
    actor_id: input.actorId,
    action: input.action,
    target_type: input.targetType,
    target_id: input.targetId,
    reason: input.reason,
    created_at: input.at,
  };
  db()
    .prepare(
      `INSERT INTO admin_audit (id, actor_id, action, target_type, target_id, reason, created_at)
       VALUES (@id, @actor_id, @action, @target_type, @target_id, @reason, @created_at)`,
    )
    .run(row);
  return row;
}

export function listAdminAuditForTarget(targetId: string): AdminAuditRow[] {
  return db()
    .prepare(`SELECT * FROM admin_audit WHERE target_id = ? ORDER BY created_at ASC`)
    .all(targetId) as AdminAuditRow[];
}

export function getProviderMonthCounts(
  providerId: string,
  startIso: string,
  endIso: string,
): ProviderMonthCounts {
  const row = db()
    .prepare(
      `SELECT
         COUNT(*) AS order_count,
         COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) AS completed,
         COALESCE(SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END), 0) AS cancelled,
         COALESCE(SUM(CASE WHEN status = 'rejected' AND cancel_reason = 'expired' THEN 1 ELSE 0 END), 0) AS unanswered,
         COALESCE(SUM(
           CASE WHEN status = 'completed'
                 AND promised_delivery_date IS NOT NULL
                 AND date(updated_at, '+3 hours') > promised_delivery_date
                THEN 1 ELSE 0 END
         ), 0) AS delayed
       FROM orders
       WHERE provider_id = ? AND created_at >= ? AND created_at < ?`,
    )
    .get(providerId, startIso, endIso) as ProviderMonthCounts;
  return {
    order_count: Number(row.order_count),
    completed: Number(row.completed),
    cancelled: Number(row.cancelled),
    unanswered: Number(row.unanswered),
    delayed: Number(row.delayed),
  };
}

export function getMonthCountsAll(startIso: string, endIso: string): ProviderMonthCounts {
  const row = db()
    .prepare(
      `SELECT
         COUNT(*) AS order_count,
         COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) AS completed,
         COALESCE(SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END), 0) AS cancelled,
         COALESCE(SUM(CASE WHEN status = 'rejected' AND cancel_reason = 'expired' THEN 1 ELSE 0 END), 0) AS unanswered,
         COALESCE(SUM(
           CASE WHEN status = 'completed'
                 AND promised_delivery_date IS NOT NULL
                 AND date(updated_at, '+3 hours') > promised_delivery_date
                THEN 1 ELSE 0 END
         ), 0) AS delayed
       FROM orders
       WHERE created_at >= ? AND created_at < ?`,
    )
    .get(startIso, endIso) as ProviderMonthCounts;
  return {
    order_count: Number(row.order_count),
    completed: Number(row.completed),
    cancelled: Number(row.cancelled),
    unanswered: Number(row.unanswered),
    delayed: Number(row.delayed),
  };
}

export function getCapturedPaymentSums(
  startIso: string,
  endIso: string,
  providerId?: string,
): PaymentMonthSums {
  const row = providerId
    ? (db()
        .prepare(
          `SELECT COALESCE(SUM(p.amount), 0) AS revenue, COALESCE(SUM(p.commission), 0) AS commission
           FROM payments p
           JOIN orders o ON o.id = p.order_id
           WHERE p.status = 'captured' AND p.updated_at >= ? AND p.updated_at < ?
             AND o.provider_id = ?`,
        )
        .get(startIso, endIso, providerId) as PaymentMonthSums)
    : (db()
        .prepare(
          `SELECT COALESCE(SUM(p.amount), 0) AS revenue, COALESCE(SUM(p.commission), 0) AS commission
           FROM payments p
           WHERE p.status = 'captured' AND p.updated_at >= ? AND p.updated_at < ?`,
        )
        .get(startIso, endIso) as PaymentMonthSums);
  return { revenue: Number(row.revenue), commission: Number(row.commission) };
}

export function getReviewAvgInRange(
  providerId: string,
  startIso: string,
  endIso: string,
): number | null {
  const row = db()
    .prepare(
      `SELECT AVG(rating) AS avg FROM reviews
       WHERE provider_id = ? AND created_at >= ? AND created_at < ?`,
    )
    .get(providerId, startIso, endIso) as { avg: number | null };
  return row.avg == null ? null : Number(row.avg);
}

export function getDisputeCountInRange(
  providerId: string,
  startIso: string,
  endIso: string,
): number {
  const row = db()
    .prepare(
      `SELECT COUNT(*) AS n
       FROM disputes d
       JOIN orders o ON o.id = d.order_id
       WHERE o.provider_id = ? AND d.created_at >= ? AND d.created_at < ?`,
    )
    .get(providerId, startIso, endIso) as { n: number };
  return Number(row.n);
}

export function getOccupancyAvg(providerId: string, startDate: string, lastDate: string): number {
  const row = db()
    .prepare(
      `SELECT AVG(CAST(used_units AS REAL) / max_units) AS avg
       FROM provider_capacity_days
       WHERE provider_id = ? AND date >= ? AND date <= ? AND max_units > 0`,
    )
    .get(providerId, startDate, lastDate) as { avg: number | null };
  return row.avg == null ? 0 : Number(row.avg);
}

export function getRepeatCustomerCounts(startIso: string, endIso: string): RepeatCustomerCounts {
  const row = db()
    .prepare(
      `SELECT
         COUNT(*) AS customers,
         COALESCE(SUM(CASE WHEN n >= 2 THEN 1 ELSE 0 END), 0) AS repeaters
       FROM (
         SELECT user_id, COUNT(*) AS n
         FROM orders
         WHERE created_at >= ? AND created_at < ? AND user_id IS NOT NULL
         GROUP BY user_id
       )`,
    )
    .get(startIso, endIso) as RepeatCustomerCounts;
  return { customers: Number(row.customers), repeaters: Number(row.repeaters) };
}

export function listCompletedDeliveries(
  startIso: string,
  endIso: string,
  providerId?: string,
): CompletedDeliveryRow[] {
  if (providerId) {
    return db()
      .prepare(
        `SELECT provider_id, promised_delivery_date, updated_at
         FROM orders
         WHERE status = 'completed'
           AND promised_delivery_date IS NOT NULL
           AND created_at >= ? AND created_at < ?
           AND provider_id = ?`,
      )
      .all(startIso, endIso, providerId) as CompletedDeliveryRow[];
  }
  return db()
    .prepare(
      `SELECT provider_id, promised_delivery_date, updated_at
       FROM orders
       WHERE status = 'completed'
         AND promised_delivery_date IS NOT NULL
         AND created_at >= ? AND created_at < ?`,
    )
    .all(startIso, endIso) as CompletedDeliveryRow[];
}

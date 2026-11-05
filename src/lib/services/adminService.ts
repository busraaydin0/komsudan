import { DEMO_DELAY_RATE, DEMO_UNANSWERED_RATE } from "@/lib/admin/thresholds";
import type { AuthUser } from "@/lib/auth/types";
import { assertStaffAdmin } from "@/lib/auth/staff";
import { dateAtNoonIstanbul, istanbulMonthRange, istanbulYearMonth, isYearMonth } from "@/lib/capacity/istanbul";
import {
  getAdminProviderRow,
  getCapturedPaymentSums,
  getDisputeCountInRange,
  getMonthCountsAll,
  getOccupancyAvg,
  getProviderMonthCounts,
  getRepeatCustomerCounts,
  getReviewAvgInRange,
  insertAdminAudit,
  listAdminAuditForTarget,
  listAdminProviderRows,
  listCompletedDeliveries,
  setProviderSuspended,
  type AdminAuditRow,
} from "@/lib/db/admin";
import { ApiError } from "@/lib/errors";

export type AdminProviderListItem = {
  id: string;
  name: string;
  neighborhood: string | null;
  paused: boolean;
  suspended: boolean;
  suspendedAt: string | null;
  suspendedReason: string | null;
  attention: boolean;
};

export type ProviderMonthlyProfile = {
  providerId: string;
  name: string;
  month: string;
  orderCount: number;
  completed: number;
  cancelled: number;
  unanswered: number;
  delayed: number;
  delayedExpress: number;
  averageRating: number;
  disputeCount: number;
  revenue: number;
  commission: number;
  averageOccupancy: number;
};

export type PilotKpiSummary = {
  month: string;
  repeatOrderRate: number;
  cancelRate: number;
  unansweredRate: number;
  avgDeliveryDeltaHours: number;
  totalOrders: number;
  totalCommission: number;
};

function parseMonth(raw?: string | null): string {
  const month = raw?.trim() || istanbulYearMonth();
  if (!isYearMonth(month)) {
    throw new ApiError(400, "Ay YYYY-MM olmalı.", "VALIDATION_ERROR");
  }
  return month;
}

function ratio(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return part / whole;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function avgDeliveryHours(
  rows: { promised_delivery_date: string; updated_at: string }[],
): number {
  if (rows.length === 0) return 0;
  const sum = rows.reduce((acc, row) => {
    const promised = dateAtNoonIstanbul(row.promised_delivery_date).getTime();
    const actual = Date.parse(row.updated_at);
    return acc + (actual - promised) / 3_600_000;
  }, 0);
  return round1(sum / rows.length);
}

function attentionFor(orderCount: number, unanswered: number, completed: number, delayed: number) {
  if (orderCount <= 0) return false;
  const unansweredRate = ratio(unanswered, orderCount);
  const delayRate = ratio(delayed, completed);
  return unansweredRate >= DEMO_UNANSWERED_RATE || (completed > 0 && delayRate >= DEMO_DELAY_RATE);
}

export function listAdminProviders(actor: AuthUser, month?: string | null): AdminProviderListItem[] {
  assertStaffAdmin(actor);
  const range = istanbulMonthRange(parseMonth(month));
  return listAdminProviderRows().map((row) => {
    const counts = getProviderMonthCounts(row.user_id, range.startIso, range.endIso);
    return {
      id: row.user_id,
      name: row.full_name,
      neighborhood: row.neighborhood,
      paused: row.status === "paused",
      suspended: Boolean(row.suspended),
      suspendedAt: row.suspended_at,
      suspendedReason: row.suspended_reason,
      attention: attentionFor(counts.order_count, counts.unanswered, counts.completed, counts.delayed),
    };
  });
}

export function getProviderMonthlyProfile(
  actor: AuthUser,
  providerId: string,
  month?: string | null,
): ProviderMonthlyProfile {
  assertStaffAdmin(actor);
  const row = getAdminProviderRow(providerId);
  if (!row) throw new ApiError(404, "Hizmet veren bulunamadı.", "NOT_FOUND");
  const parsed = parseMonth(month);
  const range = istanbulMonthRange(parsed);
  const counts = getProviderMonthCounts(providerId, range.startIso, range.endIso);
  const pay = getCapturedPaymentSums(range.startIso, range.endIso, providerId);
  const rating = getReviewAvgInRange(providerId, range.startIso, range.endIso);
  return {
    providerId,
    name: row.full_name,
    month: parsed,
    orderCount: counts.order_count,
    completed: counts.completed,
    cancelled: counts.cancelled,
    unanswered: counts.unanswered,
    delayed: counts.delayed,
    delayedExpress: counts.delayed_express,
    averageRating: rating == null ? 0 : round1(rating),
    disputeCount: getDisputeCountInRange(providerId, range.startIso, range.endIso),
    revenue: pay.revenue,
    commission: pay.commission,
    averageOccupancy: round4(getOccupancyAvg(providerId, range.startDate, range.lastDate)),
  };
}

export function getPilotKpi(actor: AuthUser, month?: string | null): PilotKpiSummary {
  assertStaffAdmin(actor);
  const parsed = parseMonth(month);
  const range = istanbulMonthRange(parsed);
  const counts = getMonthCountsAll(range.startIso, range.endIso);
  const repeat = getRepeatCustomerCounts(range.startIso, range.endIso);
  const pay = getCapturedPaymentSums(range.startIso, range.endIso);
  const deliveries = listCompletedDeliveries(range.startIso, range.endIso);
  return {
    month: parsed,
    repeatOrderRate: round4(ratio(repeat.repeaters, repeat.customers)),
    cancelRate: round4(ratio(counts.cancelled, counts.order_count)),
    unansweredRate: round4(ratio(counts.unanswered, counts.order_count)),
    avgDeliveryDeltaHours: avgDeliveryHours(deliveries),
    totalOrders: counts.order_count,
    totalCommission: pay.commission,
  };
}

export function setProviderSuspend(
  actor: AuthUser,
  providerId: string,
  input: { suspended: boolean; reason: string },
) {
  assertStaffAdmin(actor);
  const row = getAdminProviderRow(providerId);
  if (!row) throw new ApiError(404, "Hizmet veren bulunamadı.", "NOT_FOUND");
  const reason = input.reason.trim();
  if (!reason) throw new ApiError(400, "Neden zorunlu.", "VALIDATION_ERROR");
  const at = new Date().toISOString();
  setProviderSuspended(providerId, { suspended: input.suspended, reason, at });
  const audit = insertAdminAudit({
    actorId: actor.id,
    action: input.suspended ? "provider_suspend" : "provider_unsuspend",
    targetType: "provider",
    targetId: providerId,
    reason,
    at,
  });
  const next = getAdminProviderRow(providerId)!;
  return {
    provider: {
      id: next.user_id,
      name: next.full_name,
      suspended: Boolean(next.suspended),
      suspendedAt: next.suspended_at,
      suspendedReason: next.suspended_reason,
    },
    audit: toPublicAudit(audit),
  };
}

export function listProviderAudit(actor: AuthUser, providerId: string) {
  assertStaffAdmin(actor);
  return listAdminAuditForTarget(providerId).map(toPublicAudit);
}

function toPublicAudit(row: AdminAuditRow) {
  return {
    id: row.id,
    actorId: row.actor_id,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    reason: row.reason,
    createdAt: row.created_at,
  };
}

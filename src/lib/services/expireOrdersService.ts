import { getAppointment } from "@/lib/db/appointments";
import { bumpExpiredCount } from "@/lib/db/providerStats";
import {
  getOrderRow,
  listAllOrderRows,
  recordTransition,
  runOrderTx,
  updateOrderCancelReason,
  updateOrderStatus,
} from "@/lib/db/orders";
import { parseAllocations } from "@/lib/db/providerCapacity";
import { pickupInstantIso } from "@/lib/scheduling/windows";
import { respondReminderAt } from "@/lib/scheduling/respondBy";
import { releaseOrderCapacity } from "@/lib/services/capacityService";
import { buildProviderCalendar } from "@/lib/services/calendarService";
import { voidPayment } from "@/lib/services/paymentService";
import { notifyOrderExpired, notifyRespondReminder } from "@/lib/services/notificationService";
import { db } from "@/lib/db/client";

const PICKUP_CUTOFF_MS = 60 * 60 * 1000;

function markReminderSent(orderId: string) {
  db().prepare(`UPDATE orders SET respond_reminder_sent = 1 WHERE id = ?`).run(orderId);
}

function expireOne(orderId: string, now: string) {
  const row = getOrderRow(orderId);
  if (!row || row.status !== "pending") return false;

  runOrderTx(() => {
    updateOrderCancelReason(orderId, "expired", now);
    updateOrderStatus({
      id: orderId,
      status: "rejected",
      updatedAt: now,
      paymentStatus: "voided",
    });
    recordTransition({
      orderId,
      fromStatus: "pending",
      toStatus: "rejected",
      actorId: null,
      actorRole: "system",
      note: "expired",
      at: now,
    });
    releaseOrderCapacity(row.provider_id, parseAllocations(row.capacity_allocations));
    voidPayment(orderId, now);
    bumpExpiredCount(row.provider_id);
  });

  const pickup = getAppointment(orderId, "pickup");
  const alternatives = pickup
    ? buildProviderCalendar(row.provider_id)
        .filter(
          (w) =>
            w.selectable &&
            w.date === pickup.date &&
            w.start === pickup.window_start &&
            w.end === pickup.window_end,
        )
        .length
    : 0;
  void alternatives;
  const altProviders = pickup ? findAlternativeProviders(pickup.date, pickup.window_start, pickup.window_end, row.provider_id) : [];
  notifyOrderExpired(row, altProviders);
  return true;
}

function findAlternativeProviders(date: string, start: string, end: string, excludeId: string) {
  const ids = db()
    .prepare(`SELECT id FROM providers WHERE id != ?`)
    .all(excludeId) as { id: string }[];
  return ids
    .filter(({ id }) =>
      buildProviderCalendar(id).some(
        (w) => w.selectable && w.date === date && w.start === start && w.end === end,
      ),
    )
    .map((r) => r.id)
    .slice(0, 5);
}

function shouldExpire(row: NonNullable<ReturnType<typeof getOrderRow>>, nowMs: number): boolean {
  const pickup = getAppointment(row.id, "pickup");
  if (pickup) {
    const start = pickupInstantIso(pickup.date, pickup.window_start).getTime();
    if (nowMs >= start - PICKUP_CUTOFF_MS) return true;
  }
  if (row.respond_by && nowMs > Date.parse(row.respond_by)) return true;
  return false;
}

function maybeRemind(row: NonNullable<ReturnType<typeof getOrderRow>>, nowMs: number) {
  if (row.respond_reminder_sent || !row.respond_by) return;
  if (row.status !== "pending") return;
  const half = Date.parse(respondReminderAt(new Date(row.created_at), row.respond_by));
  if (nowMs < half) return;
  notifyRespondReminder(row);
  markReminderSent(row.id);
}

/** Lazy cron: pending siparişleri süresi dolunca reddeder. */
export function expireStaleRequests(now = new Date()): number {
  const nowIso = now.toISOString();
  const nowMs = now.getTime();
  let n = 0;
  for (const row of listAllOrderRows()) {
    if (row.status !== "pending") continue;
    maybeRemind(row, nowMs);
    if (shouldExpire(row, nowMs) && expireOne(row.id, nowIso)) n += 1;
  }
  return n;
}

export function validateInternalExpireKey(req: Request) {
  const expected = process.env.INTERNAL_CRON_SECRET?.trim();
  if (!expected) return false;
  const header = req.headers.get("x-internal-key")?.trim();
  return header === expected;
}

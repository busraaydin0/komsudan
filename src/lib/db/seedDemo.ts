import { addCalendarDaysIso, isoDateInIstanbul, istanbulYearMonth } from "@/lib/capacity/istanbul";
import { PILOT_AREA } from "@/lib/laundry/pilot";
import { insertAppointment } from "./appointments";
import { updateUserPreferences } from "./auth";
import { db } from "./client";
import { upsertHandoffCode } from "./handoffCodes";
import { insertOrderItem } from "./orderItems";
import { getOrderRow, insertOrderRow, updateOrderCancelReason } from "./orders";
import { insertPayment } from "./payments";
import { DEMO_SERVICE_ADMIN_PHONE } from "./seed";
import { addBalance, ensureWalletRow, getWalletRow, insertLedger } from "./wallets";
import { expressBumpPortion } from "@/lib/pricing";
import { topupWallet } from "@/lib/services/walletService";

export const DEMO_CUSTOMER_PHONE = "5321100090";
export const DEMO_CUSTOMER_ID = "demo-musteri";

function putUser() {
  const now = new Date().toISOString();
  db()
    .prepare(
      `INSERT INTO users (
         id, phone, name, full_name, role, identity_verified, passkey_id,
         onboarding_completed_at, preferred_intent, preferred_category_ids,
         home_lat, home_lng, home_neighborhood, super_admin, created_at, updated_at
       ) VALUES (
         @id, @phone, 'Demo Müşteri', 'Demo Müşteri', 'customer', 1, 'demo-customer-passkey',
         @now, 'seek', '["camasir"]', @lat, @lng, 'Çukurambar', 0, @now, @now
       )
       ON CONFLICT(id) DO UPDATE SET
         identity_verified = 1,
         passkey_id = COALESCE(users.passkey_id, excluded.passkey_id),
         onboarding_completed_at = COALESCE(users.onboarding_completed_at, excluded.onboarding_completed_at)`,
    )
    .run({
      id: DEMO_CUSTOMER_ID,
      phone: DEMO_CUSTOMER_PHONE,
      now,
      lat: PILOT_AREA.center.lat,
      lng: PILOT_AREA.center.lng,
    });
  updateUserPreferences(DEMO_CUSTOMER_ID, {
    preferredCategoryIds: ["camasir"],
    preferredIntent: "seek",
    onboardingCompletedAt: now,
    homeLat: PILOT_AREA.center.lat,
    homeLng: PILOT_AREA.center.lng,
    homeNeighborhood: "Çukurambar",
  });
}

function putOrder(input: {
  id: string;
  status: "pending" | "accepted" | "washing" | "ready" | "completed" | "rejected";
  express?: boolean;
  expired?: boolean;
  pickupDate: string;
  deliveryDate: string;
  total: number;
  createdAt: string;
  commission?: number;
  paymentAmount?: number;
  expressRefund?: number;
  completedAt?: string;
}) {
  if (getOrderRow(input.id)) return;
  const commission = input.commission ?? Math.round(input.total * 0.1);
  insertOrderRow({
    id: input.id,
    provider_id: "elif",
    package_id: input.express ? "katlama" : "katlama",
    express: input.express ? 1 : 0,
    drop_method: "kapi",
    slot: `${input.pickupDate} 10:00–12:00`,
    note: "",
    total: input.total,
    commission,
    status: input.status,
    created_at: input.createdAt,
    updated_at: input.createdAt,
    user_id: DEMO_CUSTOMER_ID,
    delivery_mode: "door",
    scheduled_window_start: `${input.pickupDate}T10:00:00+03:00`,
    size: "kucuk",
    machine_units: 1,
    estimated_delivery_date: input.deliveryDate,
    respond_by: input.express
      ? new Date(Date.parse(input.createdAt) + 2 * 3600_000).toISOString()
      : new Date(Date.parse(input.createdAt) + 45 * 60_000).toISOString(),
    public_code: `KL-${input.id.slice(-4).toUpperCase()}`,
  });
  insertOrderItem({
    order_id: input.id,
    kind: "size",
    variant: "kucuk",
    qty: 1,
    unit_price: input.total,
  });
  insertAppointment({
    orderId: input.id,
    kind: "pickup",
    date: input.pickupDate,
    windowStart: "10:00",
    windowEnd: "12:00",
    at: input.createdAt,
  });
  insertAppointment({
    orderId: input.id,
    kind: "delivery",
    date: input.deliveryDate,
    windowStart: "10:00",
    windowEnd: "12:00",
    at: input.createdAt,
  });
  if (input.expired) updateOrderCancelReason(input.id, "expired", input.createdAt);
  const payStatus =
    input.status === "completed" ? "captured" : input.status === "rejected" ? "voided" : "authorized";
  insertPayment({
    orderId: input.id,
    amount: input.paymentAmount ?? input.total,
    commission,
    status: payStatus,
    providerReference: `demo-${input.id}`,
    at: input.createdAt,
  });
  if (input.completedAt) {
    db()
      .prepare(`UPDATE orders SET completed_at = ?, updated_at = ? WHERE id = ?`)
      .run(input.completedAt, input.completedAt, input.id);
  }
  if (input.expressRefund && input.expressRefund > 0) {
    db()
      .prepare(`UPDATE orders SET express_refund = ? WHERE id = ?`)
      .run(input.expressRefund, input.id);
  }
  if (input.status === "accepted" || input.status === "washing") {
    upsertHandoffCode({ orderId: input.id, kind: "pickup", code: "1234" });
  }
  if (input.status === "ready") {
    upsertHandoffCode({ orderId: input.id, kind: "return", code: "5678" });
  }
}

/** Geliştirme/demo: canlı siparişler + bakiyeli müşteri. Test ve production'da çağrılmaz. */
export function seedDemoScenario() {
  if (process.env.NODE_ENV === "production") return;
  putUser();
  ensureWalletRow(DEMO_CUSTOMER_ID, new Date().toISOString());
  const wallet = getWalletRow(DEMO_CUSTOMER_ID);
  if ((wallet?.balance ?? 0) < 2000) {
    topupWallet(DEMO_CUSTOMER_ID, "kart", 2500);
  }

  const today = isoDateInIstanbul(new Date());
  const tomorrow = addCalendarDaysIso(today, 1);
  const later = addCalendarDaysIso(today, 3);
  const now = new Date().toISOString();
  const month = istanbulYearMonth();
  const inMonth = `${month}-08T11:00:00.000+03:00`;

  putOrder({
    id: "demo-live-pending",
    status: "pending",
    pickupDate: tomorrow,
    deliveryDate: later,
    total: 180,
    createdAt: now,
  });
  putOrder({
    id: "demo-live-accepted",
    status: "accepted",
    pickupDate: tomorrow,
    deliveryDate: later,
    total: 200,
    createdAt: now,
  });
  putOrder({
    id: "demo-live-washing",
    status: "washing",
    pickupDate: today,
    deliveryDate: later,
    total: 160,
    createdAt: now,
  });
  putOrder({
    id: "demo-live-ready",
    status: "ready",
    pickupDate: today,
    deliveryDate: tomorrow,
    total: 190,
    createdAt: now,
  });
  putOrder({
    id: "demo-live-completed",
    status: "completed",
    pickupDate: addCalendarDaysIso(today, -3),
    deliveryDate: today,
    total: 220,
    createdAt: inMonth,
  });
  putOrder({
    id: "demo-live-expired",
    status: "rejected",
    expired: true,
    pickupDate: tomorrow,
    deliveryDate: later,
    total: 140,
    createdAt: inMonth,
  });
  putOrder({
    id: "demo-live-express",
    status: "pending",
    express: true,
    pickupDate: today,
    deliveryDate: addCalendarDaysIso(today, 1),
    total: 250,
    createdAt: now,
  });

  const latePickup = addCalendarDaysIso(today, -2);
  const latePickupStart = `${latePickup}T10:00:00+03:00`;
  const lateCompletedAt = new Date(Date.parse(latePickupStart) + 25 * 3_600_000).toISOString();
  const lateTotal = 140;
  const lateBump = expressBumpPortion(lateTotal);
  const lateNet = lateTotal - lateBump;
  putOrder({
    id: "demo-live-express-late",
    status: "completed",
    express: true,
    pickupDate: latePickup,
    deliveryDate: addCalendarDaysIso(latePickup, 1),
    total: lateTotal,
    commission: Math.round(lateNet * 0.1),
    paymentAmount: lateNet,
    expressRefund: lateBump,
    completedAt: lateCompletedAt,
    createdAt: inMonth,
  });
  const alreadyRefunded = db()
    .prepare(
      `SELECT id FROM wallet_ledger WHERE order_id = 'demo-live-express-late' AND kind = 'express_refund' LIMIT 1`,
    )
    .get() as { id: string } | undefined;
  if (!alreadyRefunded && lateBump > 0) {
    addBalance(DEMO_CUSTOMER_ID, lateBump, lateCompletedAt);
    insertLedger({
      userId: DEMO_CUSTOMER_ID,
      amount: lateBump,
      kind: "express_refund",
      orderId: "demo-live-express-late",
      at: lateCompletedAt,
    });
  }
}

export const DEMO_PHONES = {
  customer: DEMO_CUSTOMER_PHONE,
  serviceAdmin: DEMO_SERVICE_ADMIN_PHONE,
  elif: "5321100001",
} as const;

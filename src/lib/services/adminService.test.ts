import { beforeAll, describe, expect, it } from "vitest";
import { assertStaffAdmin } from "@/lib/auth/staff";
import { requireAuth } from "@/lib/auth/middleware";
import { addCalendarDaysIso, isoDateInIstanbul, istanbulMonthRange } from "@/lib/capacity/istanbul";
import { listAdminAuditForTarget } from "@/lib/db/admin";
import { insertUser, setUserSuperAdmin } from "@/lib/db/auth";
import { db } from "@/lib/db/client";
import { insertDispute } from "@/lib/db/disputes";
import { getOrderRow, insertOrderRow, updateOrderCancelReason } from "@/lib/db/orders";
import { insertPayment } from "@/lib/db/payments";
import { insertReview } from "@/lib/db/reviews";
import { ApiError } from "@/lib/errors";
import { providersLive } from "@/lib/services/catalogService";
import { loadUser, requestOtp, verifyOtp } from "./authService";
import { createOrder } from "./orderService";
import { topupWallet, withdrawWallet } from "./walletService";
import {
  getPilotKpi,
  getProviderMonthlyProfile,
  listAdminProviders,
  listProviderAudit,
  setProviderSuspend,
} from "./adminService";

const MONTH = "2025-03";
const INSIDE = "2025-03-15T09:00:00.000Z";
const LAST_IN = "2025-03-31T20:59:59.000Z";
const FIRST_OUT = "2025-03-31T21:00:00.000Z";

async function login(phone: string) {
  const sent = requestOtp(phone);
  return (await verifyOtp(phone, sent.demoCode!)).user;
}

function staffUser(phone: string, role: "service_admin" | "admin", superAdmin = false) {
  const existing = loadUser(insertUser(phone, role).id)!;
  if (superAdmin) {
    setUserSuperAdmin(existing.id, true);
    return loadUser(existing.id)!;
  }
  return existing;
}

function putOrder(input: {
  id: string;
  providerId: string;
  userId: string;
  status: "completed" | "cancelled" | "rejected" | "pending";
  createdAt: string;
  updatedAt?: string;
  promised?: string | null;
  expired?: boolean;
  total?: number;
  commission?: number;
  capture?: boolean;
}) {
  if (getOrderRow(input.id)) return;
  insertOrderRow({
    id: input.id,
    provider_id: input.providerId,
    package_id: "katlama",
    express: 0,
    drop_method: "kapi",
    slot: "10:00–12:00",
    note: "",
    total: input.total ?? 100,
    commission: input.commission ?? 10,
    status: input.status,
    created_at: input.createdAt,
    updated_at: input.updatedAt ?? input.createdAt,
    user_id: input.userId,
    delivery_mode: "door",
    scheduled_window_start: input.createdAt,
    size: "kucuk",
    machine_units: 1,
  });
  if (input.promised) {
    db().prepare(`UPDATE orders SET promised_delivery_date = ? WHERE id = ?`).run(input.promised, input.id);
  }
  if (input.expired) updateOrderCancelReason(input.id, "expired", input.createdAt);
  if (input.capture) {
    insertPayment({
      orderId: input.id,
      amount: input.total ?? 100,
      commission: input.commission ?? 10,
      status: "captured",
      providerReference: `cap-${input.id}`,
      at: input.updatedAt ?? input.createdAt,
    });
  }
}

describe("Hizmet Admini (K-009)", () => {
  beforeAll(() => {
    const a = insertUser("5550004110");
    const b = insertUser("5550004111");
    const c = insertUser("5550004112");
    putOrder({
      id: "adm-elif-done-late",
      providerId: "elif",
      userId: a.id,
      status: "completed",
      createdAt: INSIDE,
      updatedAt: "2025-03-18T12:00:00.000+03:00",
      promised: "2025-03-16",
      total: 200,
      commission: 20,
      capture: true,
    });
    putOrder({
      id: "adm-elif-done-ok",
      providerId: "elif",
      userId: b.id,
      status: "completed",
      createdAt: LAST_IN,
      updatedAt: "2025-03-20T12:00:00.000+03:00",
      promised: "2025-03-20",
      total: 80,
      commission: 8,
      capture: true,
    });
    putOrder({
      id: "adm-elif-cancel",
      providerId: "elif",
      userId: a.id,
      status: "cancelled",
      createdAt: INSIDE,
    });
    putOrder({
      id: "adm-elif-expired",
      providerId: "elif",
      userId: c.id,
      status: "rejected",
      createdAt: INSIDE,
      expired: true,
    });
    putOrder({
      id: "adm-elif-outside",
      providerId: "elif",
      userId: a.id,
      status: "completed",
      createdAt: FIRST_OUT,
      promised: "2025-04-02",
      capture: true,
    });
    insertReview({
      id: "adm-rev-elif",
      order_id: "adm-elif-done-late",
      provider_id: "elif",
      rating: 4,
      body: "fixture",
      author: "A",
      created_at: INSIDE,
    });
    insertDispute({
      id: "adm-disp-elif",
      order_id: "adm-elif-done-late",
      opened_by: a.id,
      opener_role: "customer",
      reason: "fixture",
      status: "open",
      created_at: INSIDE,
      resolved_at: null,
    });
    const upsertDay = db().prepare(
      `INSERT INTO provider_capacity_days (provider_id, date, max_units, used_units)
       VALUES ('elif', ?, 8, ?)
       ON CONFLICT(provider_id, date) DO UPDATE SET max_units = 8, used_units = excluded.used_units`,
    );
    upsertDay.run("2025-03-10", 4);
    upsertDay.run("2025-03-11", 2);
  });

  it("customer/provider yönetim → 403; service_admin ödeme/payout 403; super_admin tamam", async () => {
    const customer = await login("5550004101");
    const provider = loadUser("elif")!;
    const service = staffUser("5550004102", "service_admin");
    const superA = staffUser("5550004103", "admin", true);

    expect(() => listAdminProviders(customer)).toThrow(ApiError);
    expect(() => listAdminProviders(provider)).toThrow(ApiError);
    try {
      assertStaffAdmin(customer);
      expect.fail("müşteri geçmemeliydi");
    } catch (e) {
      expect((e as ApiError).status).toBe(403);
    }

    expect(listAdminProviders(service, MONTH).length).toBeGreaterThan(0);
    expect(listAdminProviders(superA, MONTH).length).toBeGreaterThan(0);

    try {
      topupWallet(service.id, "kart", 100);
      expect.fail("service_admin yükleme yapmamalı");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).status).toBe(403);
    }
    try {
      withdrawWallet(service.id, "iban", 10);
      expect.fail("service_admin çekim yapmamalı");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).status).toBe(403);
    }

    const wallet = topupWallet(superA.id, "kart", 250);
    expect(wallet.balance).toBeGreaterThanOrEqual(250);
  });

  it("service_admin provider rotasını geçemez", async () => {
    const service = staffUser("5550004104", "service_admin");
    const sent = requestOtp(service.phone);
    const session = await verifyOtp(service.phone, sent.demoCode!);
    const req = new Request("http://localhost/api/providers/me/profile", {
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    await expect(requireAuth(req, "provider")).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
  });

  it("aylık profil sayıları ve İstanbul ay sınırı", () => {
    const admin = staffUser("5550004105", "service_admin");
    const profile = getProviderMonthlyProfile(admin, "elif", MONTH);
    expect(profile.orderCount).toBe(4);
    expect(profile.completed).toBe(2);
    expect(profile.cancelled).toBe(1);
    expect(profile.unanswered).toBe(1);
    expect(profile.delayed).toBe(1);
    expect(profile.delayedExpress).toBe(0);
    expect(profile.averageRating).toBe(4);
    expect(profile.disputeCount).toBe(1);
    expect(profile.revenue).toBe(280);
    expect(profile.commission).toBe(28);
    expect(profile.averageOccupancy).toBeCloseTo(0.375, 3);

    const range = istanbulMonthRange(MONTH);
    expect(range.startIso).toBe("2025-02-28T21:00:00.000Z");
    expect(range.endIso).toBe("2025-03-31T21:00:00.000Z");

    const empty = getProviderMonthlyProfile(admin, "elif", "1999-01");
    expect(empty.orderCount).toBe(0);
    expect(empty.completed).toBe(0);
    expect(empty.cancelled).toBe(0);
    expect(empty.unanswered).toBe(0);
    expect(empty.delayed).toBe(0);
    expect(empty.delayedExpress).toBe(0);
    expect(empty.averageRating).toBe(0);
    expect(empty.disputeCount).toBe(0);
    expect(empty.revenue).toBe(0);
    expect(empty.commission).toBe(0);
    expect(empty.averageOccupancy).toBe(0);

    const elif = listAdminProviders(admin, MONTH).find((p) => p.id === "elif");
    expect(elif?.attention).toBe(true);
  });

  it("KPI tekrar sipariş oranı", () => {
    const admin = staffUser("5550004108", "service_admin");
    const kpi = getPilotKpi(admin, MONTH);
    expect(kpi.totalOrders).toBe(4);
    expect(kpi.repeatOrderRate).toBeCloseTo(1 / 3, 4);
    expect(kpi.cancelRate).toBeCloseTo(1 / 4, 4);
    expect(kpi.unansweredRate).toBeCloseTo(1 / 4, 4);
    expect(kpi.totalCommission).toBe(28);
    expect(kpi.avgDeliveryDeltaHours).toBeCloseTo(24, 0);

    const empty = getPilotKpi(admin, "1999-02");
    expect(empty.totalOrders).toBe(0);
    expect(empty.repeatOrderRate).toBe(0);
    expect(empty.cancelRate).toBe(0);
    expect(empty.unansweredRate).toBe(0);
    expect(empty.avgDeliveryDeltaHours).toBe(0);
    expect(empty.totalCommission).toBe(0);
  });

  it("askıdaki veren listede yok, sipariş alamaz; açınca döner; audit yazılır", async () => {
    const admin = staffUser("5550004109", "service_admin");
    const customer = await login("5550004119");
    expect(providersLive().some((p) => p.id === "leyla")).toBe(true);

    try {
      setProviderSuspend(admin, "leyla", { suspended: true, reason: "Pilot inceleme" });
      expect(providersLive().some((p) => p.id === "leyla")).toBe(false);
      expect(listAdminProviders(admin).find((p) => p.id === "leyla")?.suspended).toBe(true);

      const tomorrow = addCalendarDaysIso(isoDateInIstanbul(new Date()), 1);
      try {
        createOrder(
          {
            packageId: "katlama",
            size: "kucuk",
            addons: [],
            drop: "kapi",
            note: "",
            pickup: { date: tomorrow, windowStart: "10:00", windowEnd: "12:00" },
            delivery: { date: addCalendarDaysIso(tomorrow, 2), windowStart: "10:00", windowEnd: "12:00" },
            providerId: "leyla",
          },
          customer.id,
        );
        expect.fail("askıdaki veren sipariş almamalı");
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError);
        expect((e as ApiError).code).toBe("PROVIDER_SUSPENDED");
      }

      expect(listProviderAudit(admin, "leyla").some((a) => a.action === "provider_suspend")).toBe(true);

      setProviderSuspend(admin, "leyla", { suspended: false, reason: "İnceleme bitti" });
      expect(providersLive().some((p) => p.id === "leyla")).toBe(true);
      expect(listAdminProviders(admin).find((p) => p.id === "leyla")?.suspended).toBe(false);
      expect(listAdminAuditForTarget("leyla").some((a) => a.action === "provider_unsuspend")).toBe(true);
    } finally {
      db()
        .prepare(
          `UPDATE provider_profiles SET suspended = 0, suspended_at = NULL, suspended_reason = NULL WHERE user_id = 'leyla'`,
        )
        .run();
    }
  });
});

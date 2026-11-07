import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { insertUser, setUserRole } from "@/lib/db/auth";
import { db } from "@/lib/db/client";
import { getOrderRow } from "@/lib/db/orders";
import { listCapacityDays, upsertCapacitySettings } from "@/lib/db/providerCapacity";
import { remainingExpressQuotaOnDate } from "@/lib/services/capacityService";
import { expressBumpPortion } from "@/lib/pricing";
import { pickupInstantIso } from "@/lib/scheduling/windows";
import { insertSlotRow } from "@/lib/db/providers";
import { getWalletRow } from "@/lib/db/wallets";
import { ApiError } from "@/lib/errors";
import { addCalendarDaysIso } from "@/lib/capacity/istanbul";
import { expressDeliveryDate } from "@/lib/capacity/computeSchedule";
import { getHandoffCode } from "@/lib/db/handoffCodes";
import { providersLive } from "@/lib/services/catalogService";
import { buildProviderCalendar } from "@/lib/services/calendarService";
import { addPhoto } from "@/lib/services/photoService";
import { confirmPickupAtDoor } from "@/lib/services/pickupConfirmService";
import { approvePickupSummary } from "@/lib/services/handoffService";
import { expireStaleRequests } from "@/lib/services/expireOrdersService";
import { createReview } from "@/lib/services/reviewService";
import { paymentForOrder } from "@/lib/services/paymentService";
import { loadUser, requestOtp, verifyOtp } from "./authService";
import { applyOrderAction, applyStatus, createOrder } from "./orderService";
import { getWallet, topupWallet } from "./walletService";
import { pendingEarningWaitMs } from "@/lib/walletMethods";
import {
  getPilotKpi,
  getProviderMonthlyProfile,
  listAdminProviders,
  setProviderSuspend,
} from "./adminService";

const MINI_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

async function login(phone: string) {
  const sent = requestOtp(phone);
  return (await verifyOtp(phone, sent.demoCode!)).user;
}

function moneyOf(userId: string) {
  const w = getWalletRow(userId);
  if (!w) return 0;
  return (w.balance ?? 0) + (w.reserved ?? 0) + (w.pending ?? 0);
}

function capturedAmount(orderId: string) {
  const pay = paymentForOrder(orderId);
  if (!pay || pay.status !== "captured") return 0;
  return pay.amount;
}

/** Müşteri cüzdanı + bu siparişin tahsil tutarı (komisyon dahil) = yükleme. */
function conserved(customerId: string, orderId: string | null, topup: number) {
  return moneyOf(customerId) + (orderId ? capturedAmount(orderId) : 0) === topup;
}

function usedOn(providerId: string, date: string) {
  const row = listCapacityDays(providerId, date, date)[0];
  return row?.usedUnits ?? 0;
}

function windowsFor(providerId: string, express = false, now = new Date()) {
  const cal = buildProviderCalendar(providerId, now, express).filter((w) => w.selectable);
  if (cal.length === 0) throw new Error("takvim boş");
  const pickup = cal[0]!;
  const minDel = express
    ? expressDeliveryDate(pickup.date, pickup.start)
    : addCalendarDaysIso(pickup.date, 2);
  const delivery = cal.find((w) => w.date >= minDel) ?? cal[cal.length - 1]!;
  return {
    pickup: { date: pickup.date, windowStart: pickup.start, windowEnd: pickup.end },
    delivery: { date: delivery.date, windowStart: delivery.start, windowEnd: delivery.end },
  };
}

function openCapacity(providerId: string) {
  upsertCapacitySettings({
    providerId,
    halfUnitsPerDay: 80,
    workingDays: [1, 2, 3, 4, 5, 6],
    maxUnitsPerOrder: 10,
    expressQuota: 20,
  });
  db()
    .prepare(`UPDATE availability_slots SET start_time = '08:00', end_time = '20:00' WHERE provider_id = ?`)
    .run(providerId);
  for (const day of [1, 2, 3, 4, 5, 6]) {
    const id = `smoke-slot-${providerId}-${day}`;
    const exists = db().prepare(`SELECT 1 AS ok FROM availability_slots WHERE id = ?`).get(id);
    if (exists) continue;
    insertSlotRow({
      id,
      provider_id: providerId,
      day_of_week: day,
      start_time: "08:00",
      end_time: "20:00",
      delivery_mode: "door",
      is_active: 1,
    });
  }
}

beforeEach(() => {
  vi.useFakeTimers({ now: new Date("2026-06-15T10:00:00+03:00") });
  openCapacity("elif");
  openCapacity("merve");
  openCapacity("leyla");
});

afterEach(() => {
  vi.useRealTimers();
});

describe("uçtan uca duman (Adım 5)", () => {
  it("normal akış: OTP → yükle → sipariş → teslim → pending → balance → yorum", async () => {
    const customer = await login("5550005101");
    const provider = loadUser("elif")!;
    topupWallet(customer.id, "kart", 1000);
    expect(moneyOf(customer.id)).toBe(1000);
    expect(conserved(customer.id, null, 1000)).toBe(true);

    const w = windowsFor("elif");
    const order = createOrder(
      {
        providerId: "elif",
        packageId: "katlama",
        size: "kucuk",
        addons: [],
        drop: "kapi",
        note: "",
        pickup: w.pickup,
        delivery: w.delivery,
      },
      customer.id,
    );
    expect(order.status).toBe("pending");
    expect(getWalletRow(customer.id)!.reserved).toBe(order.total);
    expect(conserved(customer.id, order.id, 1000)).toBe(true);

    applyOrderAction(order.id, "accept", provider);
    expect(getOrderRow(order.id)!.status).toBe("accepted");
    expect(conserved(customer.id, order.id, 1000)).toBe(true);

    addPhoto(order.id, MINI_PNG, "dropoff");
    confirmPickupAtDoor(provider, order.id, { confirmedSize: "kucuk", addons: [], colorGroups: 1 });
    approvePickupSummary(customer, order.id);
    const pickupPin = getHandoffCode(order.id, "pickup")!.code;
    applyOrderAction(order.id, "advance", provider, pickupPin);
    applyOrderAction(order.id, "advance", provider);
    expect(getOrderRow(order.id)!.status).toBe("washing");
    applyOrderAction(order.id, "advance", provider);
    expect(getOrderRow(order.id)!.status).toBe("ready");

    addPhoto(order.id, MINI_PNG, "delivery");
    const returnPin = getHandoffCode(order.id, "return")!.code;
    applyOrderAction(order.id, "deliver", provider, returnPin);
    expect(getOrderRow(order.id)!.status).toBe("completed");
    expect(paymentForOrder(order.id)?.status).toBe("captured");
    expect(getWalletRow(customer.id)!.reserved).toBe(0);
    const net = order.total - order.commission;
    expect(getWalletRow("elif")!.pending).toBeGreaterThanOrEqual(net);
    expect(conserved(customer.id, order.id, 1000)).toBe(true);

    const later = new Date(Date.now() + pendingEarningWaitMs() + 2000).toISOString();
    const pendingBefore = getWalletRow("elif")!.pending;
    getWallet("elif", 0, later);
    expect(getWalletRow("elif")!.pending).toBeLessThan(pendingBefore);
    expect(getWalletRow("elif")!.balance).toBeGreaterThanOrEqual(net);
    expect(conserved(customer.id, order.id, 1000)).toBe(true);

    const review = createReview(customer, order.id, {
      rating: 5,
      body: "Kapıda temiz teslim, teşekkürler.",
    });
    expect(review.rating).toBe(5);
  });

  it("acil: bugün alım, 24 sa teslim, 15 dk cevap, EXPIRED red ve rezerv iade", async () => {
    vi.useFakeTimers({ now: new Date("2026-06-15T10:00:00+03:00") });
    const customer = await login("5550005102");
    topupWallet(customer.id, "kart", 800);
    const w = windowsFor("elif", true, new Date());
    const order = createOrder(
      {
        providerId: "elif",
        packageId: "katlama",
        size: "kucuk",
        addons: [],
        drop: "kapi",
        note: "",
        express: true,
        pickup: w.pickup,
        delivery: w.delivery,
      },
      customer.id,
    );
    expect(order.express).toBe(true);
    expect(order.respondBy).toBeTruthy();
    const created = Date.parse(getOrderRow(order.id)!.created_at);
    const respond = Date.parse(order.respondBy!);
    expect(respond - created).toBe(15 * 60 * 1000);
    expect(order.estimatedDeliveryDate).toBe(expressDeliveryDate(w.pickup.date, w.pickup.windowStart));
    expect(conserved(customer.id, order.id, 800)).toBe(true);

    const n = expireStaleRequests(new Date(respond + 1000));
    expect(n).toBeGreaterThanOrEqual(1);
    expect(getOrderRow(order.id)!.status).toBe("rejected");
    expect(getOrderRow(order.id)!.cancel_reason).toBe("expired");
    expect(paymentForOrder(order.id)?.status).toBe("voided");
    expect(getWalletRow(customer.id)!.reserved).toBe(0);
    expect(getWalletRow(customer.id)!.balance).toBe(800);
    expect(conserved(customer.id, order.id, 800)).toBe(true);
  });

  it("iptal ve red: reserved geri döner, kabul sonrası kapasite serbest", async () => {
    const customer = await login("5550005103");
    const provider = loadUser("elif")!;
    topupWallet(customer.id, "kart", 600);

    const w = windowsFor("elif");
    const rejected = createOrder(
      {
        providerId: "elif",
        packageId: "katlama",
        size: "kucuk",
        addons: [],
        drop: "kapi",
        note: "",
        pickup: w.pickup,
        delivery: w.delivery,
      },
      customer.id,
    );
    applyOrderAction(rejected.id, "reject", provider);
    expect(getOrderRow(rejected.id)!.status).toBe("rejected");
    expect(getWalletRow(customer.id)!.reserved).toBe(0);
    expect(getWalletRow(customer.id)!.balance).toBe(600);
    expect(conserved(customer.id, rejected.id, 600)).toBe(true);

    const cancelled = createOrder(
      {
        providerId: "elif",
        packageId: "katlama",
        size: "kucuk",
        addons: [],
        drop: "kapi",
        note: "",
        pickup: w.pickup,
        delivery: w.delivery,
      },
      customer.id,
    );
    applyOrderAction(cancelled.id, "accept", provider);
    const used = usedOn("elif", w.pickup.date);
    expect(used).toBeGreaterThan(0);
    applyStatus(cancelled.id, customer, "cancelled");
    expect(getOrderRow(cancelled.id)!.status).toBe("cancelled");
    expect(paymentForOrder(cancelled.id)?.status).toBe("voided");
    expect(getWalletRow(customer.id)!.reserved).toBe(0);
    expect(getWalletRow(customer.id)!.balance).toBe(600);
    expect(usedOn("elif", w.pickup.date)).toBeLessThan(used);
    expect(conserved(customer.id, cancelled.id, 600)).toBe(true);
  });

  it("yönetim: service_admin profil/KPI okur, askı listeden düşürür, sipariş engeller", async () => {
    const adminRow = insertUser("5550005104", "service_admin");
    setUserRole(adminRow.id, "service_admin");
    const admin = loadUser(adminRow.id)!;
    const list = listAdminProviders(admin);
    expect(list.length).toBeGreaterThan(0);
    expect(getProviderMonthlyProfile(admin, "elif").providerId).toBe("elif");
    expect(getPilotKpi(admin).totalOrders).toBeGreaterThanOrEqual(0);

    const customer = await login("5550005105");
    topupWallet(customer.id, "kart", 400);
    expect(providersLive().some((p) => p.id === "leyla")).toBe(true);
    try {
      setProviderSuspend(admin, "leyla", { suspended: true, reason: "duman testi" });
      expect(providersLive().some((p) => p.id === "leyla")).toBe(false);
      try {
        createOrder(
          {
            providerId: "leyla",
            packageId: "katlama",
            size: "kucuk",
            addons: [],
            drop: "kapi",
            note: "",
            pickup: { date: "2026-06-16", windowStart: "10:00", windowEnd: "12:00" },
            delivery: { date: "2026-06-18", windowStart: "10:00", windowEnd: "12:00" },
          },
          customer.id,
        );
        expect.fail("askıdaki veren sipariş almamalı");
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError);
        expect((e as ApiError).code).toBe("PROVIDER_SUSPENDED");
      }
    } finally {
      db()
        .prepare(
          `UPDATE provider_profiles SET suspended = 0, suspended_at = NULL, suspended_reason = NULL WHERE user_id = 'leyla'`,
        )
        .run();
    }
  });

  it("acil kota: iki sipariş, üçüncü hata, geç teslimde zam iadesi", async () => {
    upsertCapacitySettings({
      providerId: "elif",
      halfUnitsPerDay: 8,
      workingDays: [1, 2, 3, 4, 5, 6],
      maxUnitsPerOrder: 10,
      expressQuota: 2,
    });
    db()
      .prepare(
        `UPDATE provider_capacity_days SET used_units = 0, used_express_units = 0 WHERE provider_id = 'elif'`,
      )
      .run();

    const a = await login("5550005110");
    const b = await login("5550005111");
    const c = await login("5550005112");
    const provider = loadUser("elif")!;
    topupWallet(a.id, "kart", 1000);
    topupWallet(b.id, "kart", 1000);
    topupWallet(c.id, "kart", 1000);
    const topupA = 1000;
    const w = windowsFor("elif", true, new Date());

    const first = createOrder(
      {
        providerId: "elif",
        packageId: "katlama",
        size: "kucuk",
        addons: [],
        drop: "kapi",
        note: "",
        express: true,
        pickup: w.pickup,
        delivery: w.delivery,
      },
      a.id,
    );
    applyOrderAction(first.id, "accept", provider);
    const second = createOrder(
      {
        providerId: "elif",
        packageId: "katlama",
        size: "kucuk",
        addons: [],
        drop: "kapi",
        note: "",
        express: true,
        pickup: w.pickup,
        delivery: w.delivery,
      },
      b.id,
    );
    applyOrderAction(second.id, "accept", provider);
    expect(remainingExpressQuotaOnDate("elif", w.pickup.date)).toBe(0);
    const day = listCapacityDays("elif", w.pickup.date, w.pickup.date)[0]!;
    expect(day.usedExpressUnits).toBe(2);
    expect(day.usedUnits).toBe(0);

    try {
      createOrder(
        {
          providerId: "elif",
          packageId: "katlama",
          size: "kucuk",
          addons: [],
          drop: "kapi",
          note: "",
          express: true,
          pickup: w.pickup,
          delivery: w.delivery,
        },
        c.id,
      );
      expect.fail("üçüncü acil geçmemeliydi");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).code).toBe("EXPRESS_QUOTA");
    }

    addPhoto(first.id, MINI_PNG, "dropoff");
    confirmPickupAtDoor(provider, first.id, { confirmedSize: "kucuk", addons: [], colorGroups: 1 });
    approvePickupSummary(a, first.id);
    applyOrderAction(first.id, "advance", provider, getHandoffCode(first.id, "pickup")!.code);
    applyOrderAction(first.id, "advance", provider);
    applyOrderAction(first.id, "advance", provider);
    expect(getOrderRow(first.id)!.status).toBe("ready");
    addPhoto(first.id, MINI_PNG, "delivery");

    const start = pickupInstantIso(w.pickup.date, w.pickup.windowStart);
    vi.setSystemTime(new Date(start.getTime() + 25 * 3_600_000));
    applyOrderAction(first.id, "deliver", provider, getHandoffCode(first.id, "return")!.code);

    const row = getOrderRow(first.id)!;
    const bump = expressBumpPortion(first.total);
    const net = first.total - bump;
    expect(row.express_refund).toBe(bump);
    expect(paymentForOrder(first.id)?.amount).toBe(net);
    expect(paymentForOrder(first.id)?.commission).toBe(Math.round(net * 0.1));
    expect(getWalletRow(a.id)!.reserved).toBe(0);
    expect(getWalletRow(a.id)!.balance).toBe(topupA - net);
    expect(conserved(a.id, first.id, topupA)).toBe(true);
  });
});

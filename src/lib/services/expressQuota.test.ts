import { afterEach, describe, expect, it, vi } from "vitest";
import { isoDateInIstanbul } from "@/lib/capacity/istanbul";
import { insertAppointment } from "@/lib/db/appointments";
import { insertUser } from "@/lib/db/auth";
import { db } from "@/lib/db/client";
import { insertOrderRow, getOrderRow } from "@/lib/db/orders";
import {
  listCapacityDays,
  tryReserveExpressUnits,
  tryReserveUnits,
  upsertCapacitySettings,
} from "@/lib/db/providerCapacity";
import { getWalletRow, remainingReservedForOrder } from "@/lib/db/wallets";
import { ApiError } from "@/lib/errors";
import { COMMISSION, expressBumpPortion } from "@/lib/pricing";
import { canListForExpress } from "@/lib/laundry/customerUi";
import { providersLive } from "@/lib/services/catalogService";
import { remainingExpressQuotaOnDate, remainingUnitsOnDate } from "@/lib/services/capacityService";
import { loadUser, requestOtp, verifyOtp } from "./authService";
import { getProviderMonthlyProfile } from "./adminService";
import { createOrder } from "./orderService";
import { authorizePayment, capturePayment, paymentForOrder } from "./paymentService";
import { saveMyCapacitySettings } from "./providerCapacityService";
import { getWallet, holdForOrder, topupWallet } from "./walletService";

async function customer(phone: string) {
  const sent = requestOtp(phone);
  return (await verifyOtp(phone, sent.demoCode!)).user;
}

function restoreElif() {
  upsertCapacitySettings({
    providerId: "elif",
    halfUnitsPerDay: 8,
    workingDays: [1, 2, 3, 4, 5, 6],
    maxUnitsPerOrder: 10,
    expressQuota: 2,
  });
}

function setElifQuota(quota: number, half = 8) {
  upsertCapacitySettings({
    providerId: "elif",
    halfUnitsPerDay: half,
    workingDays: [1, 2, 3, 4, 5, 6, 7],
    maxUnitsPerOrder: 10,
    expressQuota: quota,
  });
  db()
    .prepare(
      `UPDATE provider_capacity_days SET used_units = 0, used_express_units = 0 WHERE provider_id = 'elif'`,
    )
    .run();
}

afterEach(() => {
  vi.useRealTimers();
  restoreElif();
});

describe("acil kota ve iade (Adım 8 / K-010)", () => {
  it("seed elif acil kotası 2", () => {
    restoreElif();
    const row = db()
      .prepare(`SELECT express_quota AS q FROM provider_capacity_settings WHERE provider_id = 'elif'`)
      .get() as { q: number };
    expect(row.q).toBe(2);
  });

  it("kota 0 → acil hata", async () => {
    vi.useFakeTimers({ now: new Date("2026-06-15T10:00:00+03:00") });
    const user = await customer("5550006101");
    setElifQuota(0);
    const today = isoDateInIstanbul(new Date());
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
          pickup: { date: today, windowStart: "23:00", windowEnd: "23:59" },
          delivery: { date: today, windowStart: "23:00", windowEnd: "23:59" },
        },
        user.id,
      );
      expect.fail("kota 0 iken acil geçmemeliydi");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).code).toBe("EXPRESS_QUOTA");
      expect((e as ApiError).message).toMatch(/acil kontenjan yok/i);
    }
  });

  it("kota 2, 3. birim hata", async () => {
    vi.useFakeTimers({ now: new Date("2026-06-15T10:00:00+03:00") });
    const user = await customer("5550006102");
    topupWallet(user.id, "kart", 2000);
    setElifQuota(2);
    const today = isoDateInIstanbul(new Date());
    try {
      createOrder(
        {
          providerId: "elif",
          packageId: "katlama",
          size: "kucuk",
          addons: [{ addon: "yorgan", variant: "tek", qty: 1 }],
          drop: "kapi",
          note: "",
          express: true,
          pickup: { date: today, windowStart: "23:00", windowEnd: "23:59" },
          delivery: { date: today, windowStart: "23:00", windowEnd: "23:59" },
        },
        user.id,
      );
      expect.fail("3 birim kota 2'ye sığmamalıydı");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).code).toBe("EXPRESS_QUOTA");
      expect((e as ApiError).message).toMatch(/yetmiyor/i);
    }
  });

  it("normal sipariş kota kadar daha az kapasite görür", () => {
    vi.useFakeTimers({ now: new Date("2026-06-15T10:00:00+03:00") });
    setElifQuota(2, 8);
    const today = isoDateInIstanbul(new Date());
    expect(remainingUnitsOnDate("elif", today)).toBe(6);
    expect(remainingExpressQuotaOnDate("elif", today)).toBe(2);
    const live = providersLive().find((p) => p.id === "elif");
    expect(live?.capacity?.todayFreeUnits).toBe(6);
    expect(live?.capacity?.todayExpressFreeUnits).toBe(2);
  });

  it("acil kota normal kapasiteyi tüketmez", () => {
    vi.useFakeTimers({ now: new Date("2026-06-15T10:00:00+03:00") });
    setElifQuota(2, 8);
    const today = isoDateInIstanbul(new Date());
    expect(tryReserveExpressUnits("elif", today, 2, 8, 2)).toBe(true);
    expect(remainingUnitsOnDate("elif", today)).toBe(6);
    expect(remainingExpressQuotaOnDate("elif", today)).toBe(0);
    const day = listCapacityDays("elif", today, today)[0]!;
    expect(day.usedUnits).toBe(0);
    expect(day.usedExpressUnits).toBe(2);
    expect(tryReserveUnits("elif", today, 6, 8, 2)).toBe(true);
    expect(remainingUnitsOnDate("elif", today)).toBe(0);
  });

  it("kota alanı: negatif ve günlük makineden büyük → hata", () => {
    const elif = loadUser("elif")!;
    try {
      saveMyCapacitySettings(elif, {
        halfUnitsPerDay: 8,
        workingDays: [1, 2, 3, 4, 5, 6],
        maxUnitsPerOrder: 10,
        expressQuota: -1,
      });
      expect.fail("negatif kota geçmemeliydi");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).code).toBe("VALIDATION_ERROR");
      expect((e as ApiError).message).toMatch(/negatif/i);
    }
    try {
      saveMyCapacitySettings(elif, {
        halfUnitsPerDay: 8,
        workingDays: [1, 2, 3, 4, 5, 6],
        maxUnitsPerOrder: 10,
        expressQuota: 9,
      });
      expect.fail("kotanın günlük kapasiteyi aşması geçmemeliydi");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).code).toBe("VALIDATION_ERROR");
      expect((e as ApiError).message).toMatch(/aşamaz/i);
    }
  });

  it("kota yetmezse acil kartı listelenmez", () => {
    vi.useFakeTimers({ now: new Date("2026-06-15T10:00:00+03:00") });
    setElifQuota(0);
    const elif = providersLive().find((p) => p.id === "elif")!;
    expect(canListForExpress(elif, 1)).toBe(false);
    setElifQuota(2);
    const open = providersLive().find((p) => p.id === "elif")!;
    expect(canListForExpress(open, 1)).toBe(true);
    expect(canListForExpress(open, 3)).toBe(false);
  });
});

describe("geciken acil iade", () => {
  function seedReadyExpress(id: string, userId: string, total: number) {
    const pickupDate = "2026-06-15";
    const created = "2026-06-15T08:00:00.000Z";
    const commission = Math.round(total * COMMISSION);
    insertOrderRow({
      id,
      provider_id: "elif",
      package_id: "katlama",
      express: 1,
      drop_method: "kapi",
      slot: `${pickupDate} 10:00–12:00`,
      note: "",
      total,
      commission,
      status: "ready",
      created_at: created,
      updated_at: created,
      user_id: userId,
      delivery_mode: "door",
      scheduled_window_start: `${pickupDate}T10:00:00+03:00`,
      size: "kucuk",
      machine_units: 1,
    });
    insertAppointment({
      orderId: id,
      kind: "pickup",
      date: pickupDate,
      windowStart: "10:00",
      windowEnd: "12:00",
      at: created,
    });
    authorizePayment({ orderId: id, amount: total, commission, at: created });
  }

  it("gecikmiş acil teslimde zam iadesi ve komisyon net üzerinden", async () => {
    const user = await customer("5550006103");
    const total = 140;
    const bump = expressBumpPortion(total);
    const net = total - bump;
    topupWallet(user.id, "kart", total);
    seedReadyExpress("ord-ex-late", user.id, total);
    holdForOrder(user.id, "ord-ex-late", total);
    const elifPendingBefore = getWalletRow("elif")?.pending ?? 0;

    const pay = capturePayment("ord-ex-late", "2026-06-16T11:00:00+03:00");
    expect(pay.amount).toBe(net);
    expect(pay.commission).toBe(Math.round(net * COMMISSION));
    expect(pay.status).toBe("captured");

    const row = getOrderRow("ord-ex-late")!;
    expect(row.express_refund).toBe(bump);
    expect(row.completed_at).toBeTruthy();

    const cust = getWallet(user.id);
    expect(cust.balance).toBe(bump);
    expect(cust.reserved).toBe(0);
    expect(remainingReservedForOrder("ord-ex-late")).toBe(0);

    const elifPending = getWalletRow("elif")?.pending ?? 0;
    const providerNet = net - Math.round(net * COMMISSION);
    expect(elifPending - elifPendingBefore).toBe(providerNet);

    const kinds = db()
      .prepare(`SELECT kind, amount FROM wallet_ledger WHERE order_id = 'ord-ex-late' ORDER BY kind`)
      .all() as { kind: string; amount: number }[];
    expect(kinds.filter((k) => k.kind === "express_refund")).toHaveLength(1);
    expect(kinds.find((k) => k.kind === "express_refund")?.amount).toBe(bump);

    expect(cust.total + pay.amount).toBe(total);
    expect(cust.total + (elifPending - elifPendingBefore) + pay.commission).toBe(total);
  });

  it("zamanında teslimde iade yok", async () => {
    const user = await customer("5550006104");
    const total = 140;
    topupWallet(user.id, "kart", total);
    seedReadyExpress("ord-ex-ontime", user.id, total);
    holdForOrder(user.id, "ord-ex-ontime", total);
    const pay = capturePayment("ord-ex-ontime", "2026-06-16T09:00:00+03:00");
    expect(pay.amount).toBe(total);
    expect(pay.commission).toBe(Math.round(total * COMMISSION));
    expect(getOrderRow("ord-ex-ontime")!.express_refund).toBe(0);
    expect(getWallet(user.id).balance).toBe(0);
    const refunds = db()
      .prepare(
        `SELECT COUNT(*) AS n FROM wallet_ledger WHERE order_id = 'ord-ex-ontime' AND kind = 'express_refund'`,
      )
      .get() as { n: number };
    expect(refunds.n).toBe(0);
  });

  it("çift iade yok; iade sonrası toplam para değişmezi", async () => {
    const user = await customer("5550006105");
    const total = 140;
    const bump = expressBumpPortion(total);
    const net = total - bump;
    topupWallet(user.id, "kart", total);
    seedReadyExpress("ord-ex-twice", user.id, total);
    holdForOrder(user.id, "ord-ex-twice", total);
    capturePayment("ord-ex-twice", "2026-06-16T12:00:00+03:00");
    capturePayment("ord-ex-twice", "2026-06-16T13:00:00+03:00");
    const refunds = db()
      .prepare(
        `SELECT COUNT(*) AS n FROM wallet_ledger WHERE order_id = 'ord-ex-twice' AND kind = 'express_refund'`,
      )
      .get() as { n: number };
    expect(refunds.n).toBe(1);
    expect(getOrderRow("ord-ex-twice")!.express_refund).toBe(bump);
    const pay = paymentForOrder("ord-ex-twice")!;
    expect(pay.amount).toBe(net);
    const cust = getWallet(user.id);
    expect(cust.total + pay.amount).toBe(total);
  });

  it("hold yoksa yalnız payments ve express_refund güncellenir", async () => {
    const user = await customer("5550006106");
    const total = 140;
    const bump = expressBumpPortion(total);
    const net = total - bump;
    seedReadyExpress("ord-ex-sim", user.id, total);
    const before = getWallet(user.id);
    const pay = capturePayment("ord-ex-sim", "2026-06-16T12:00:00+03:00");
    expect(pay.amount).toBe(net);
    expect(pay.commission).toBe(Math.round(net * COMMISSION));
    expect(getOrderRow("ord-ex-sim")!.express_refund).toBe(bump);
    const after = getWallet(user.id);
    expect(after.balance).toBe(before.balance);
    expect(after.reserved).toBe(before.reserved);
    const refunds = db()
      .prepare(
        `SELECT COUNT(*) AS n FROM wallet_ledger WHERE order_id = 'ord-ex-sim' AND kind = 'express_refund'`,
      )
      .get() as { n: number };
    expect(refunds.n).toBe(0);
  });

  it("aylık profilde geciken acil", async () => {
    const admin = loadUser(insertUser("5550006107", "service_admin").id)!;
    const created = "2026-11-03T09:00:00.000Z";
    insertOrderRow({
      id: "ord-ex-month",
      provider_id: "elif",
      package_id: "katlama",
      express: 1,
      drop_method: "kapi",
      slot: "2026-11-03 10:00–12:00",
      note: "",
      total: 140,
      commission: 10,
      status: "completed",
      created_at: created,
      updated_at: created,
      user_id: insertUser("5550006108").id,
      delivery_mode: "door",
      scheduled_window_start: "2026-11-03T10:00:00+03:00",
      size: "kucuk",
      machine_units: 1,
    });
    db()
      .prepare(`UPDATE orders SET express_refund = 40, completed_at = ? WHERE id = ?`)
      .run("2026-11-04T12:00:00.000Z", "ord-ex-month");
    const profile = getProviderMonthlyProfile(admin, "elif", "2026-11");
    expect(profile.delayedExpress).toBeGreaterThanOrEqual(1);
  });
});

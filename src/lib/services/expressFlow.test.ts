import { afterEach, describe, expect, it, vi } from "vitest";
import { isoDateInIstanbul } from "@/lib/capacity/istanbul";
import { addCalendarDaysIso } from "@/lib/capacity/istanbul";
import { insertOrderItem } from "@/lib/db/orderItems";
import { getOrderRow, insertOrderRow } from "@/lib/db/orders";
import { tryReserveUnits, upsertCapacitySettings } from "@/lib/db/providerCapacity";
import { ApiError } from "@/lib/errors";
import { quoteForProviderOrder } from "@/lib/pricingServer";
import { addPhoto } from "@/lib/services/photoService";
import { loadUser, requestOtp, verifyOtp } from "./authService";
import { createOrder } from "./orderService";
import { delayOrder } from "./delayOrderService";
import { expireStaleRequests } from "./expireOrdersService";
import { confirmPickupAtDoor } from "./pickupConfirmService";
import { authorizePayment, paymentForOrder } from "./paymentService";
import { db } from "@/lib/db/client";
import { insertAppointment } from "@/lib/db/appointments";
import { insertUser } from "@/lib/db/auth";

const MINI_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

async function customer(phone: string) {
  const sent = requestOtp(phone);
  return (await verifyOtp(phone, sent.demoCode!)).user;
}

function tomorrow() {
  return addCalendarDaysIso(isoDateInIstanbul(new Date()), 1);
}

const baseInput = () => ({
  packageId: "katlama" as const,
  size: "kucuk" as const,
  addons: [],
  drop: "kapi" as const,
  note: "",
  pickup: { date: tomorrow(), windowStart: "10:00", windowEnd: "12:00" },
  delivery: { date: addCalendarDaysIso(tomorrow(), 2), windowStart: "10:00", windowEnd: "12:00" },
});

describe("acil teslim (Adım 3a)", () => {
  it("veren express=false + express=true → hata", async () => {
    const user = await customer("5550000920");
    try {
      createOrder({ ...baseInput(), providerId: "ayse", express: true }, user.id);
      expect.fail("acil geçmemeliydi");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).code).toBe("EXPRESS_NOT_OFFERED");
    }
  });

  it("yarın + express → hata", async () => {
    const user = await customer("5550000921");
    try {
      createOrder({ ...baseInput(), providerId: "elif", express: true }, user.id);
      expect.fail("yarın acil geçmemeliydi");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).code).toBe("EXPRESS_NOT_TODAY");
    }
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("kapasiteye sığmayan acil → hata", async () => {
    vi.useFakeTimers({ now: new Date("2026-06-15T10:00:00+03:00") });
    const user = await customer("5550000922");
    const today = isoDateInIstanbul(new Date());
    upsertCapacitySettings({
      providerId: "elif",
      halfUnitsPerDay: 2,
      workingDays: [1, 2, 3, 4, 5, 6, 7],
      maxUnitsPerOrder: 10,
    });
    tryReserveUnits("elif", today, 2, 2);
    try {
      createOrder(
        {
          ...baseInput(),
          providerId: "elif",
          express: true,
          pickup: { date: today, windowStart: "23:00", windowEnd: "23:59" },
        },
        user.id,
      );
      expect.fail("dolu günde acil geçmemeliydi");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).code).toBe("CAPACITY");
    }
  });

  it("expire acil 15 dk sonra red", () => {
    const created = new Date("2026-10-07T10:00:00+03:00");
    const id = "ord-exp-express";
    const customerId = insertUser("5550000923").id;
    insertOrderRow({
      id,
      provider_id: "elif",
      package_id: "katlama",
      express: 1,
      drop_method: "kapi",
      slot: "2026-10-08 15:00–17:00",
      note: "",
      total: 140,
      commission: 14,
      status: "pending",
      created_at: created.toISOString(),
      updated_at: created.toISOString(),
      user_id: customerId,
      delivery_mode: "door",
      scheduled_window_start: created.toISOString(),
      size: "kucuk",
      machine_units: 1,
    });
    db()
      .prepare("UPDATE orders SET respond_by = ? WHERE id = ?")
      .run(new Date("2026-10-07T10:15:00+03:00").toISOString(), id);
    authorizePayment({ orderId: id, amount: 140, commission: 14, at: created.toISOString() });
    insertAppointment({
      orderId: id,
      kind: "pickup",
      date: "2026-10-08",
      windowStart: "15:00",
      windowEnd: "17:00",
      at: created.toISOString(),
    });
    const n = expireStaleRequests(new Date("2026-10-07T10:16:00+03:00"));
    expect(n).toBeGreaterThanOrEqual(1);
    expect(getOrderRow(id)!.status).toBe("rejected");
    expect(paymentForOrder(id)?.status).toBe("voided");
  });

  it("delayOrder acil → hata", () => {
    const now = new Date().toISOString();
    insertOrderRow({
      id: "ord-delay-express",
      provider_id: "elif",
      package_id: "katlama",
      express: 1,
      drop_method: "kapi",
      slot: "Bugün 10:00–12:00",
      note: "",
      total: 140,
      commission: 14,
      status: "accepted",
      created_at: now,
      updated_at: now,
      user_id: insertUser("5550000924").id,
      delivery_mode: "door",
      scheduled_window_start: now,
      size: "kucuk",
      machine_units: 1,
      promised_delivery_date: addCalendarDaysIso(isoDateInIstanbul(new Date()), 1),
    });
    const provider = loadUser("elif")!;
    expect(() => delayOrder(provider, "ord-delay-express", "Yoğunluk", 12)).toThrow(ApiError);
    try {
      delayOrder(provider, "ord-delay-express", "Yoğunluk", 12);
    } catch (e) {
      expect((e as ApiError).code).toBe("EXPRESS_NO_DELAY");
    }
  });

  it("kapıda yeniden fiyatlamada zam korunur", async () => {
    const user = await customer("5550000925");
    const now = new Date().toISOString();
    const q = quoteForProviderOrder("elif", "katlama", "kucuk", [], true);
    insertOrderRow({
      id: "ord-door-express",
      provider_id: "elif",
      package_id: "katlama",
      express: 1,
      drop_method: "kapi",
      slot: "Bugün 10:00–12:00",
      note: "",
      total: q.total,
      commission: q.commission,
      status: "accepted",
      created_at: now,
      updated_at: now,
      user_id: user.id,
      delivery_mode: "door",
      scheduled_window_start: now,
      size: "kucuk",
      machine_units: q.machineUnits,
    });
    insertOrderItem({
      order_id: "ord-door-express",
      kind: "size",
      variant: "kucuk",
      qty: 1,
      unit_price: q.sizePrice,
    });
    authorizePayment({ orderId: "ord-door-express", amount: q.total, commission: q.commission, at: now });
    addPhoto("ord-door-express", MINI_PNG, "dropoff");
    confirmPickupAtDoor(loadUser("elif")!, "ord-door-express", {
      confirmedSize: "kucuk",
      addons: [],
      colorGroups: 1,
    });
    const pay = paymentForOrder("ord-door-express")!;
    expect(pay.amount).toBe(q.total);
    expect(pay.commission).toBe(q.commission);
    const base = quoteForProviderOrder("elif", "katlama", "kucuk", [], false);
    expect(pay.amount).toBeGreaterThan(base.total);
  });
});

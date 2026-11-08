import { afterEach, describe, expect, it, vi } from "vitest";
import { addCalendarDaysIso } from "@/lib/capacity/istanbul";
import { getOrderRow } from "@/lib/db/orders";
import { listCapacityDays } from "@/lib/db/providerCapacity";
import { ApiError } from "@/lib/errors";
import { ORDER_FORBIDDEN_MESSAGE } from "@/lib/orders/orderAuth";
import { buildProviderCalendar } from "./calendarService";
import { loadUser, requestOtp, verifyOtp } from "./authService";
import { createOrder, applyOrderAction, listOrderHistory } from "./orderService";
import { confirmPickupAtDoor } from "./pickupConfirmService";
import { remainingUnitsOnDate } from "./capacityService";
import { topupWallet } from "./walletService";

async function login(phone: string) {
  const sent = requestOtp(phone);
  return (await verifyOtp(phone, sent.demoCode!)).user;
}

function windows() {
  const now = new Date();
  const cal = buildProviderCalendar("elif", now, false).filter((w) => w.selectable);
  const pickup = cal[0]!;
  const minDel = addCalendarDaysIso(pickup.date, 2);
  const delivery = cal.find((w) => w.date >= minDel) ?? cal[cal.length - 1]!;
  return {
    pickup: { date: pickup.date, windowStart: pickup.start, windowEnd: pickup.end },
    delivery: { date: delivery.date, windowStart: delivery.start, windowEnd: delivery.end },
  };
}

function usedOn(date: string) {
  return listCapacityDays("elif", date, date)[0]?.usedUnits ?? 0;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("kabul kapısı: oluşturma pending, kabul elle", () => {
  it("sipariş pending kalır; müşteri kabul edemez; yalnız veren accepted ve kapasite o anda ayrılır", async () => {
    vi.useFakeTimers({ now: new Date("2026-06-15T10:00:00+03:00") });
    const customer = await login("5550009101");
    const provider = loadUser("elif")!;
    topupWallet(customer.id, "kart", 1000);
    const w = windows();
    const before = remainingUnitsOnDate("elif", w.pickup.date);
    const usedBefore = usedOn(w.pickup.date);

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
    expect(remainingUnitsOnDate("elif", w.pickup.date)).toBe(before);
    expect(usedOn(w.pickup.date)).toBe(usedBefore);

    const createdHistory = listOrderHistory(customer, order.id);
    expect(createdHistory.map((h) => h.to)).toEqual(["pending"]);
    expect(createdHistory[0]?.actorRole).toBe("customer");
    expect(createdHistory.some((h) => h.to === "accepted")).toBe(false);

    try {
      applyOrderAction(order.id, "accept", customer);
      expect.fail("müşteri kabul 403 olmalı");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect(e).toMatchObject({ status: 403, code: "FORBIDDEN", message: ORDER_FORBIDDEN_MESSAGE });
    }
    expect(getOrderRow(order.id)!.status).toBe("pending");

    try {
      applyOrderAction(order.id, "advance", provider);
      expect.fail("pending iken alım/yıkama yok");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).code).toBe("INVALID_TRANSITION");
    }

    try {
      confirmPickupAtDoor(provider, order.id, { confirmedSize: "kucuk", addons: [], colorGroups: 1 });
      expect.fail("kabulsüz kapı doğrulama yok");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).code).toBe("INVALID_TRANSITION");
    }

    const accepted = applyOrderAction(order.id, "accept", provider);
    expect(accepted.status).toBe("accepted");
    expect(usedOn(w.pickup.date)).toBe(usedBefore + order.machineUnits);
    const hist = listOrderHistory(customer, order.id);
    const acc = hist.find((h) => h.to === "accepted");
    expect(acc?.actorId).toBe("elif");
    expect(acc?.actorRole).toBe("provider");
  });
});

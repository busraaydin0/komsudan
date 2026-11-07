import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors";
import { addCalendarDaysIso } from "@/lib/capacity/istanbul";
import { loadUser, requestOtp, verifyOtp } from "@/lib/services/authService";
import { buildProviderCalendar } from "@/lib/services/calendarService";
import { providersLive } from "@/lib/services/catalogService";
import { createOrder } from "@/lib/services/orderService";
import { topupWallet } from "@/lib/services/walletService";
import { assertNotSelfOrder, selfOrderAllowed } from "./selfOrder";

beforeEach(() => {
  vi.useFakeTimers({ now: new Date("2026-06-15T10:00:00+03:00") });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

async function customer(phone: string) {
  const sent = requestOtp(phone);
  return (await verifyOtp(phone, sent.demoCode!)).user;
}

function windows(providerId = "elif") {
  const cal = buildProviderCalendar(providerId, new Date()).filter((w) => w.selectable);
  if (cal.length === 0) throw new Error("takvim boş");
  const pickup = cal[0]!;
  const minDel = addCalendarDaysIso(pickup.date, 2);
  const delivery = cal.find((w) => w.date >= minDel) ?? cal[cal.length - 1]!;
  return {
    pickup: { date: pickup.date, windowStart: pickup.start, windowEnd: pickup.end },
    delivery: { date: delivery.date, windowStart: delivery.start, windowEnd: delivery.end },
  };
}

const laundry = () => ({
  packageId: "katlama" as const,
  size: "kucuk" as const,
  addons: [],
  drop: "kapi" as const,
  note: "",
  ...windows(),
});

describe("K-011 kendine sipariş", () => {
  it("aynı kullanıcı sipariş veremez (SELF_ORDER)", () => {
    const elif = loadUser("elif")!;
    topupWallet(elif.id, "kart", 2000);
    try {
      createOrder({ ...laundry(), providerId: "elif" }, elif.id);
      expect.fail("kendine sipariş geçmemeliydi");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect(e).toMatchObject({
        status: 403,
        code: "SELF_ORDER",
        message: "Kendi hizmetinizden sipariş veremezsiniz.",
      });
    }
  });

  it("bayrak açıkken dev'de verebilir", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("ALLOW_SELF_ORDER", "1");
    expect(selfOrderAllowed()).toBe(true);
    expect(() => assertNotSelfOrder("elif", "elif")).not.toThrow();
    const elif = loadUser("elif")!;
    topupWallet(elif.id, "kart", 2000);
    const order = createOrder({ ...laundry(), providerId: "elif" }, elif.id);
    expect(order.providerId).toBe("elif");
    expect(order.status).toBe("pending");
  });

  it("production'da bayrak etkisiz", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ALLOW_SELF_ORDER", "1");
    expect(selfOrderAllowed()).toBe(false);
    expect(() => assertNotSelfOrder("elif", "elif")).toThrow(ApiError);
    const elif = loadUser("elif")!;
    try {
      createOrder({ ...laundry(), providerId: "elif" }, elif.id);
      expect.fail("production self-order geçmemeliydi");
    } catch (e) {
      expect((e as ApiError).code).toBe("SELF_ORDER");
    }
  });

  it("farklı kullanıcı normal sipariş verebilir", async () => {
    const user = await customer("5550007110");
    topupWallet(user.id, "kart", 2000);
    const order = createOrder({ ...laundry(), providerId: "elif" }, user.id);
    expect(order.providerId).toBe("elif");
    expect(order.status).toBe("pending");
  });

  it("keşif listesi kendi kartını gizler; bayrakla gösterir", () => {
    expect(providersLive().some((p) => p.id === "elif")).toBe(true);
    expect(providersLive("elif").some((p) => p.id === "elif")).toBe(false);
    expect(providersLive("merve").some((p) => p.id === "elif")).toBe(true);
    vi.stubEnv("ALLOW_SELF_ORDER", "1");
    expect(providersLive("elif").some((p) => p.id === "elif")).toBe(true);
  });
});

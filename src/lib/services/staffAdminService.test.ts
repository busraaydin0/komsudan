import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requireAuth } from "@/lib/auth/middleware";
import { addCalendarDaysIso } from "@/lib/capacity/istanbul";
import { listAdminAuditForTarget } from "@/lib/db/admin";
import { getUserById, getUserByPhone } from "@/lib/db/auth";
import { insertAppointment } from "@/lib/db/appointments";
import { db } from "@/lib/db/client";
import { insertOrderItem } from "@/lib/db/orderItems";
import { insertOrderRow } from "@/lib/db/orders";
import { ensureProviderPriceGrid } from "@/lib/db/providerPrices";
import { DEMO_SERVICE_ADMIN_PHONE, demoSeedEnabled, seedCatalog, seedStaffUsers } from "@/lib/db/seed";
import { getWalletRow, listRecentLedger } from "@/lib/db/wallets";
import { ApiError } from "@/lib/errors";
import { parseValue } from "@/lib/validation/parse";
import { accountPatchSchema, mePatchSchema, otpVerifySchema } from "@/lib/validation/auth.schema";
import { loadUser, requestOtp, verifyOtp } from "./authService";
import { buildProviderCalendar } from "./calendarService";
import { applyOrderAction, createOrder } from "./orderService";
import { createOrSetStaffAdmin } from "./staffAdminService";
import { topupWallet, withdrawWallet } from "./walletService";

async function login(phone: string) {
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

describe("K-013 rol ve admin:create", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-06-15T10:00:00+03:00") });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("kayıt/OTP role alanı gönderilse bile müşteri kalır", async () => {
    const phone = "5550009120";
    const sent = requestOtp(phone);
    const parsed = parseValue(
      { phone, code: sent.demoCode, role: "admin", super_admin: 1 },
      otpVerifySchema,
    );
    expect(parsed).toEqual({ phone, code: sent.demoCode });
    const session = await verifyOtp(parsed.phone, parsed.code);
    expect(session.user.role).toBe("customer");
    expect(getUserById(session.user.id)?.super_admin).toBeFalsy();
    expect(parseValue({ fullName: "Ayşe Deneme", role: "admin" }, mePatchSchema)).toEqual({
      fullName: "Ayşe Deneme",
    });
    expect(parseValue({ name: "Ayşe", identity: true, role: "super_admin" }, accountPatchSchema)).toEqual({
      name: "Ayşe",
      identity: true,
    });
  });

  it("service_admin sipariş durumu ve ödeme/çekim yapamaz; super_admin yapabilir", async () => {
    const customer = await login("5550009121");
    const service = createOrSetStaffAdmin("5550009122", "service_admin");
    const superRow = createOrSetStaffAdmin("5550009123", "super_admin");
    const serviceUser = loadUser(service.id)!;
    const superUser = loadUser(superRow.id)!;

    const now = new Date().toISOString();
    ensureProviderPriceGrid("elif");
    insertOrderRow({
      id: "ord-k013-pay",
      provider_id: "elif",
      package_id: "katlama",
      express: 0,
      drop_method: "kapi",
      slot: "2026-06-16 10:00–12:00",
      note: "",
      total: 150,
      commission: 15,
      status: "pending",
      created_at: now,
      updated_at: now,
      user_id: customer.id,
      delivery_mode: "door",
      scheduled_window_start: now,
      size: "kucuk",
      machine_units: 1,
    });
    insertOrderItem({ order_id: "ord-k013-pay", kind: "size", variant: "kucuk", qty: 1, unit_price: 150 });
    insertAppointment({
      orderId: "ord-k013-pay",
      kind: "pickup",
      date: "2026-06-16",
      windowStart: "10:00",
      windowEnd: "12:00",
      at: now,
    });

    try {
      applyOrderAction("ord-k013-pay", "accept", serviceUser);
      expect.fail("service_admin sipariş değiştirmemeli");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).status).toBe(403);
    }
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

    applyOrderAction("ord-k013-pay", "accept", superUser);
    const wallet = topupWallet(superRow.id, "kart", 250);
    expect(wallet.balance).toBeGreaterThanOrEqual(250);
  });

  it("admin rolleri sipariş oluşturamaz", () => {
    const service = createOrSetStaffAdmin("5550009124", "service_admin");
    const superA = createOrSetStaffAdmin("5550009125", "super_admin");
    for (const id of [service.id, superA.id]) {
      try {
        createOrder({ ...laundry(), providerId: "elif" }, id);
        expect.fail("admin sipariş vermemeli");
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError);
        expect(e).toMatchObject({ status: 403, code: "ADMIN_CANNOT_ORDER" });
      }
    }
  });

  it("production'da demo admini ve seed passkey yok", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(demoSeedEnabled()).toBe(false);
    db().prepare("DELETE FROM users WHERE phone = ?").run(DEMO_SERVICE_ADMIN_PHONE);
    seedCatalog(db());
    expect(getUserByPhone(DEMO_SERVICE_ADMIN_PHONE)).toBeUndefined();
    vi.unstubAllEnvs();
    seedStaffUsers(db());
    expect(getUserByPhone(DEMO_SERVICE_ADMIN_PHONE)?.passkey_id).toBe("demo-staff-passkey");
  });

  it("admin:create doğru rolü yazar, cüzdan ve audit bırakır", () => {
    const created = createOrSetStaffAdmin("0555 000 91 26", "super_admin");
    expect(created.role).toBe("admin");
    expect(created.super_admin).toBe(1);
    expect(getWalletRow(created.id)).toBeTruthy();
    expect(listRecentLedger(created.id).length).toBeGreaterThan(0);
    const audit = listAdminAuditForTarget(created.id);
    expect(audit.some((a) => a.action === "admin_create" && a.reason?.includes("super_admin"))).toBe(true);

    const again = createOrSetStaffAdmin("5550009126", "service_admin");
    expect(again.id).toBe(created.id);
    expect(again.role).toBe("service_admin");
    expect(again.super_admin).toBe(0);
    expect(listAdminAuditForTarget(again.id).some((a) => a.action === "admin_role_set")).toBe(true);
  });

  it("geçersiz telefon ve rol hata verir", () => {
    try {
      createOrSetStaffAdmin("123", "super_admin");
      expect.fail("telefon hata vermeli");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).code).toBe("VALIDATION_ERROR");
    }
    try {
      createOrSetStaffAdmin("5550009127", "customer");
      expect.fail("rol hata vermeli");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).code).toBe("VALIDATION_ERROR");
    }
  });

  it("super_admin provider rotasını geçemez", async () => {
    const superA = createOrSetStaffAdmin("5550009128", "super_admin");
    const sent = requestOtp(superA.phone);
    const session = await verifyOtp(superA.phone, sent.demoCode!);
    const req = new Request("http://localhost/api/providers/me/profile", {
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    await expect(requireAuth(req, "provider")).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
  });
});

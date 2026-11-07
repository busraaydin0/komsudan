import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { insertUser, setUserSuperAdmin } from "@/lib/db/auth";
import { insertAppointment } from "@/lib/db/appointments";
import { insertOrderItem } from "@/lib/db/orderItems";
import { ensureProviderPriceGrid } from "@/lib/db/providerPrices";
import { getHandoffCode } from "@/lib/db/handoffCodes";
import { getOrderRow, insertOrderRow, listOrderRowsForCustomer } from "@/lib/db/orders";
import { ApiError } from "@/lib/errors";
import { ORDER_FORBIDDEN_MESSAGE } from "@/lib/orders/orderAuth";
import { addPhoto } from "@/lib/services/photoService";
import { loadUser, requestOtp, verifyOtp } from "./authService";
import {
  addOrderPhoto,
  applyOrderAction,
  applyStatus,
  getOrderFor,
  listOrdersFor,
} from "./orderService";
import { confirmPickupAtDoor, respondPriceChange } from "./pickupConfirmService";
import { approvePickupSummary } from "./handoffService";
import { delayOrder } from "./delayOrderService";
import { openDispute } from "./disputeService";
import { createReview } from "./reviewService";
import { authorizePayment } from "./paymentService";
import { sendOrderMessage } from "./messageService";

const MINI_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

async function login(phone: string) {
  const sent = requestOtp(phone);
  return (await verifyOtp(phone, sent.demoCode!)).user;
}

function expectForbidden(fn: () => unknown) {
  try {
    fn();
    expect.fail("403 FORBIDDEN bekleniyordu");
  } catch (e) {
    expect(e).toBeInstanceOf(ApiError);
    expect(e).toMatchObject({
      status: 403,
      code: "FORBIDDEN",
      message: ORDER_FORBIDDEN_MESSAGE,
    });
  }
}

function seedPending(id: string, userId: string, providerId = "elif") {
  const now = new Date().toISOString();
  ensureProviderPriceGrid(providerId);
  insertOrderRow({
    id,
    provider_id: providerId,
    package_id: "katlama",
    express: 0,
    drop_method: "kapi",
    slot: "2026-10-08 10:00–11:00",
    note: "",
    total: 150,
    commission: 15,
    status: "pending",
    created_at: now,
    updated_at: now,
    user_id: userId,
    delivery_mode: "door",
    scheduled_window_start: now,
    size: "kucuk",
    machine_units: 1,
    estimated_delivery_date: "2026-10-10",
    respond_by: new Date("2026-10-08T09:00:00+03:00").toISOString(),
    public_code: "KL-AUTH",
  });
  insertOrderItem({ order_id: id, kind: "size", variant: "kucuk", qty: 1, unit_price: 150 });
  insertAppointment({
    orderId: id,
    kind: "pickup",
    date: "2026-10-08",
    windowStart: "10:00",
    windowEnd: "11:00",
    at: now,
  });
  authorizePayment({ orderId: id, amount: 150, commission: 15, at: now });
}

describe("K-012 işlem bazlı yetki", () => {
  it("müşteri kabul / ilerletme / teslim kodu → 403", async () => {
    const customer = await login("5550008101");
    const provider = loadUser("elif")!;
    seedPending("ord-k012-cust", customer.id);
    expectForbidden(() => applyOrderAction("ord-k012-cust", "accept", customer));
    applyOrderAction("ord-k012-cust", "accept", provider);
    expectForbidden(() => applyOrderAction("ord-k012-cust", "advance", customer));
    expectForbidden(() => applyOrderAction("ord-k012-cust", "deliver", customer, "1234"));
  });

  it("başka hizmet veren başkasının siparişini değiştiremez → 403", async () => {
    const customer = await login("5550008102");
    const other = loadUser("merve")!;
    seedPending("ord-k012-other", customer.id);
    expectForbidden(() => applyOrderAction("ord-k012-other", "accept", other));
    expectForbidden(() => applyOrderAction("ord-k012-other", "reject", other));
    expectForbidden(() => addOrderPhoto(other, "ord-k012-other", MINI_PNG, "dropoff"));
  });

  it("hizmet veren alım onayı / müşteri iptali yapamaz", async () => {
    const customer = await login("5550008103");
    const provider = loadUser("elif")!;
    seedPending("ord-k012-prov", customer.id);
    expectForbidden(() => applyOrderAction("ord-k012-prov", "cancel", provider));
    applyOrderAction("ord-k012-prov", "accept", provider);
    addPhoto("ord-k012-prov", MINI_PNG, "dropoff");
    confirmPickupAtDoor(provider, "ord-k012-prov", {
      confirmedSize: "kucuk",
      addons: [],
      colorGroups: 1,
    });
    expectForbidden(() => approvePickupSummary(provider, "ord-k012-prov"));
    expectForbidden(() => respondPriceChange(provider, "ord-k012-prov", "approve"));
  });

  it("müşteri alım fotoğrafı / erteleme / kapı doğrulama yapamaz", async () => {
    const customer = await login("5550008104");
    const provider = loadUser("elif")!;
    seedPending("ord-k012-photo", customer.id);
    applyOrderAction("ord-k012-photo", "accept", provider);
    expectForbidden(() => addOrderPhoto(customer, "ord-k012-photo", MINI_PNG, "dropoff"));
    expectForbidden(() =>
      confirmPickupAtDoor(customer, "ord-k012-photo", {
        confirmedSize: "kucuk",
        addons: [],
        colorGroups: 1,
      }),
    );
    expectForbidden(() => delayOrder(customer, "ord-k012-photo", "Yoğunluk var", 12));
  });

  it("super_admin sipariş durumunu değiştirebilir", async () => {
    const customer = await login("5550008105");
    const adminRow = insertUser("5550008199", "admin");
    setUserSuperAdmin(adminRow.id, true);
    const admin = loadUser(adminRow.id)!;
    seedPending("ord-k012-admin", customer.id);
    applyOrderAction("ord-k012-admin", "accept", admin);
    expect(getOrderRow("ord-k012-admin")!.status).toBe("accepted");
    addOrderPhoto(admin, "ord-k012-admin", MINI_PNG, "dropoff");
    confirmPickupAtDoor(admin, "ord-k012-admin", {
      confirmedSize: "kucuk",
      addons: [],
      colorGroups: 1,
    });
    approvePickupSummary(admin, "ord-k012-admin");
    const pin = getHandoffCode("ord-k012-admin", "pickup")!.code;
    applyOrderAction("ord-k012-admin", "advance", admin, pin);
    expect(getOrderRow("ord-k012-admin")!.status).toBe("dropped_off");
  });

  it("service_admin sipariş durumu değiştiremez", async () => {
    const customer = await login("5550008110");
    const service = loadUser(insertUser("5550008111", "service_admin").id)!;
    seedPending("ord-k013-svc", customer.id);
    expectForbidden(() => applyOrderAction("ord-k013-svc", "accept", service));
    expectForbidden(() => applyOrderAction("ord-k013-svc", "cancel", service));
  });

  it("ilgisiz üçüncü kullanıcı siparişi göremez / değiştiremez", async () => {
    const owner = await login("5550008106");
    const stranger = await login("5550008107");
    seedPending("ord-k012-str", owner.id);
    try {
      getOrderFor(stranger, "ord-k012-str");
      expect.fail("üçüncü kişi siparişi görmemeli");
    } catch (e) {
      expect(e).toMatchObject({ status: 404, code: "NOT_FOUND" });
    }
    expect(listOrdersFor(stranger).some((o) => o.id === "ord-k012-str")).toBe(false);
    expect(listOrderRowsForCustomer(owner.id).some((o) => o.id === "ord-k012-str")).toBe(true);
    expect(listOrderRowsForCustomer(stranger.id).some((o) => o.id === "ord-k012-str")).toBe(false);
    expectForbidden(() => applyOrderAction("ord-k012-str", "accept", stranger));
    expectForbidden(() => applyOrderAction("ord-k012-str", "cancel", stranger));
    expectForbidden(() => openDispute(stranger, "ord-k012-str", "Bu sipariş bana ait değil, itiraz."));
    try {
      sendOrderMessage(stranger, "ord-k012-str", { body: "Merhaba, bu sipariş benim değil." });
      expect.fail("üçüncü kişi mesaj atamamalı");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).status).toBeGreaterThanOrEqual(400);
    }
  });

  it("müşteri iptali pending'de cancelled; hizmet veren red rejected", async () => {
    const customer = await login("5550008108");
    const provider = loadUser("elif")!;
    seedPending("ord-k012-cancel", customer.id);
    applyOrderAction("ord-k012-cancel", "cancel", customer);
    expect(getOrderRow("ord-k012-cancel")!.status).toBe("cancelled");

    seedPending("ord-k012-rej", customer.id);
    applyOrderAction("ord-k012-rej", "reject", provider);
    expect(getOrderRow("ord-k012-rej")!.status).toBe("rejected");
  });

  it("hizmet veren yorum / uyuşmazlık açamaz; müşteri kabul sonrası applyStatus cancelled yapabilir", async () => {
    const customer = await login("5550008109");
    const provider = loadUser("elif")!;
    seedPending("ord-k012-rev", customer.id);
    applyOrderAction("ord-k012-rev", "accept", provider);
    expectForbidden(() =>
      createReview(provider, "ord-k012-rev", { rating: 5, body: "Kendi işime yorum yok." }),
    );
    expectForbidden(() => openDispute(provider, "ord-k012-rev", "Veren itiraz açamasın diye uzun gerekçe."));
    applyStatus("ord-k012-rev", customer, "cancelled");
    expect(getOrderRow("ord-k012-rev")!.status).toBe("cancelled");
    expectForbidden(() => applyStatus("ord-k012-rev", provider, "cancelled"));
  });
});

describe("K-012 ALLOW_SELF_ORDER aynı hesap iki rol", () => {
  beforeEach(() => {
    vi.stubEnv("ALLOW_SELF_ORDER", "1");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("bayrak açıkken aynı hesap kabul ve iptal yapabilir", () => {
    const elif = loadUser("elif")!;
    seedPending("ord-k012-self", elif.id, "elif");
    applyOrderAction("ord-k012-self", "accept", elif);
    expect(getOrderRow("ord-k012-self")!.status).toBe("accepted");
    applyStatus("ord-k012-self", elif, "cancelled");
    expect(getOrderRow("ord-k012-self")!.status).toBe("cancelled");
  });
});

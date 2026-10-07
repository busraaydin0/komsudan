import { describe, expect, it } from "vitest";
import { insertOrderItem } from "@/lib/db/orderItems";
import { ensureProviderPriceGrid } from "@/lib/db/providerPrices";
import { getOrderRow, insertOrderRow } from "@/lib/db/orders";
import { getHandoffCode } from "@/lib/db/handoffCodes";
import type { AuthUser } from "@/lib/auth/types";
import { loadUser, requestOtp, verifyOtp } from "./authService";
import { confirmPickupAtDoor } from "./pickupConfirmService";
import { addPhoto } from "@/server/photos";
import { applyOrderAction, getOrderFor } from "./orderService";
import {
  approvePickupSummary,
  verifyHandoffPin,
  HANDOFF_MAX_ATTEMPTS,
} from "./handoffService";
import { adminResolveOverride, requestDeliveryOverride } from "./deliveryOverrideService";
import { setUserRole, setUserSuperAdmin } from "@/lib/db/auth";
import { authorizePayment } from "./paymentService";
import { ApiError } from "@/server/rules";

const MINI_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

async function customer(phone: string) {
  const sent = requestOtp(phone);
  return (await verifyOtp(phone, sent.demoCode!)).user;
}

function seedAccepted(id: string, userId: string) {
  const now = new Date().toISOString();
  ensureProviderPriceGrid("elif");
  insertOrderRow({
    id,
    provider_id: "elif",
    package_id: "katlama",
    express: 0,
    drop_method: "kapi",
    drop_point_id: null,
    slot: "Bugün 18:00–19:00",
    note: "",
    total: 150,
    commission: 15,
    status: "teslim_alindi",
    created_at: now,
    updated_at: now,
    user_id: userId,
    delivery_mode: "door",
    scheduled_window_start: now,
    lifecycle: "accepted",
    size: "kucuk",
    machine_units: 1,
    public_code: "KL-TEST",
  });
  insertOrderItem({ order_id: id, kind: "size", variant: "kucuk", qty: 1, unit_price: 150 });
  authorizePayment({ orderId: id, amount: 150, commission: 15, at: now });
}

async function doorReady(customerUser: AuthUser, orderId: string) {
  const provider = loadUser("elif")!;
  addPhoto(orderId, MINI_PNG, "dropoff");
  confirmPickupAtDoor(provider, orderId, { confirmedSize: "kucuk", addons: [], colorGroups: 1 });
  approvePickupSummary(customerUser, orderId);
  const pickupPin = getHandoffCode(orderId, "pickup")!.code;
  applyOrderAction(orderId, "advance", provider, pickupPin);
  applyOrderAction(orderId, "advance", provider);
  applyOrderAction(orderId, "advance", provider);
  return { provider, customerUser: customerUser };
}

describe("handoff kod sistemi", () => {
  it("sağlayıcı API cevabında alım/teslim kodları yok", async () => {
    const user = await customer("5550000701");
    seedAccepted("ord-ho-1", user.id);
    const { provider, customerUser } = await doorReady(user, "ord-ho-1");
    const forProvider = getOrderFor(provider, "ord-ho-1");
    const forCustomer = getOrderFor(customerUser, "ord-ho-1");
    expect(forProvider.publicCode).toBe("KL-TEST");
    expect(forCustomer.publicCode).toBe("KL-TEST");
    expect(forProvider.pickupHandoffCode).toBeNull();
    expect(forProvider.returnHandoffCode).toBeNull();
    expect(forCustomer.returnHandoffCode).toMatch(/^\d{4}$/);
  });

  it("5 yanlış denemede kilitlenir ve kod yenilenir", async () => {
    const user = await customer("5550000702");
    seedAccepted("ord-ho-2", user.id);
    await doorReady(user, "ord-ho-2");
    const row = getOrderRow("ord-ho-2")!;
    const before = getHandoffCode("ord-ho-2", "return")!.code;
    const now = new Date().toISOString();
    for (let i = 0; i < HANDOFF_MAX_ATTEMPTS - 1; i++) {
      expect(() => verifyHandoffPin(row, "return", "0000", "elif", now)).toThrow(ApiError);
    }
    expect(() => verifyHandoffPin(row, "return", "0000", "elif", now)).toThrow(/Yeni kod/);
    const after = getHandoffCode("ord-ho-2", "return")!.code;
    expect(after).not.toBe(before);
  });

  it("kod tek kullanımlık", async () => {
    const user = await customer("5550000703");
    seedAccepted("ord-ho-3", user.id);
    const { provider } = await doorReady(user, "ord-ho-3");
    const pin = getHandoffCode("ord-ho-3", "return")!.code;
    addPhoto("ord-ho-3", MINI_PNG, "delivery");
    applyOrderAction("ord-ho-3", "deliver", provider, pin);
    const row = getOrderRow("ord-ho-3")!;
    expect(() => verifyHandoffPin(row, "return", pin, "elif", new Date().toISOString())).toThrow(
      /zaten kullanıldı/,
    );
  });

  it("teslim fotoğrafı olmadan completed olmaz", async () => {
    const user = await customer("5550000704");
    seedAccepted("ord-ho-4", user.id);
    const { provider } = await doorReady(user, "ord-ho-4");
    const pin = getHandoffCode("ord-ho-4", "return")!.code;
    await expect(async () => applyOrderAction("ord-ho-4", "deliver", provider, pin)).rejects.toBeInstanceOf(
      ApiError,
    );
  });

  it("kodsuz teslim: admin hold ve süper admin onayı", async () => {
    const user = await customer("5550000705");
    seedAccepted("ord-ho-5", user.id);
    const { provider } = await doorReady(user, "ord-ho-5");
    const delivery = addPhoto("ord-ho-5", MINI_PNG, "delivery");
    requestDeliveryOverride(provider, "ord-ho-5", {
      photoId: delivery.id,
      note: "Müşteri kapıda yok, kod veremedi",
    });
    const held = getOrderRow("ord-ho-5")!;
    expect(held.admin_hold).toBe(1);
    expect(held.lifecycle).toBe("admin_pending");

    const plainAdmin = await customer("5550000706");
    setUserRole(plainAdmin.id, "admin");
    const adminRow = loadUser(plainAdmin.id)!;
    await expect(async () =>
      adminResolveOverride(adminRow, "ord-ho-5", true, "Pilot onay"),
    ).rejects.toBeInstanceOf(ApiError);

    setUserSuperAdmin(plainAdmin.id, true);
    adminResolveOverride(loadUser(plainAdmin.id)!, "ord-ho-5", true, "Pilot onay: foto ve konum uygun");
    const done = getOrderRow("ord-ho-5")!;
    expect(done.lifecycle).toBe("completed");
    expect(done.payment_status).toBe("captured");
  });
});

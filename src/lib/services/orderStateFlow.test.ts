import { describe, expect, it } from "vitest";
import { insertUser } from "@/lib/db/auth";
import { insertAppointment } from "@/lib/db/appointments";
import { insertOrderItem } from "@/lib/db/orderItems";
import { ensureProviderPriceGrid } from "@/lib/db/providerPrices";
import { getOrderRow, insertOrderRow } from "@/lib/db/orders";
import { getHandoffCode } from "@/lib/db/handoffCodes";
import type { Order } from "@/lib/types";
import type { OrderStatusId } from "@/lib/status";
import { loadUser, requestOtp, verifyOtp } from "./authService";
import { applyOrderAction, getOrderFor } from "./orderService";
import { confirmPickupAtDoor, respondPriceChange } from "./pickupConfirmService";
import { approvePickupSummary } from "./handoffService";
import { addPhoto } from "@/lib/services/photoService";
import { authorizePayment, paymentForOrder } from "./paymentService";
import { expireStaleRequests } from "./expireOrdersService";
import { openDispute } from "./disputeService";

const MINI_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

export function canonicalStatus(order: Pick<Order, "status">): OrderStatusId {
  return order.status;
}

async function customer(phone: string) {
  const sent = requestOtp(phone);
  return (await verifyOtp(phone, sent.demoCode!)).user;
}

function seedPending(id: string, userId: string, packageId: "yikama" | "katlama" | "tam" = "katlama") {
  const now = new Date().toISOString();
  ensureProviderPriceGrid("elif");
  insertOrderRow({
    id,
    provider_id: "elif",
    package_id: packageId,
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
    public_code: "KL-FLOW",
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

async function throughPickupDoor(orderId: string, userId: string, confirmedSize: "kucuk" | "orta" = "kucuk") {
  const provider = loadUser("elif")!;
  const cust = loadUser(userId)!;
  addPhoto(orderId, MINI_PNG, "dropoff");
  confirmPickupAtDoor(provider, orderId, { confirmedSize, addons: [], colorGroups: 1 });
  approvePickupSummary(cust, orderId);
  const pickupPin = getHandoffCode(orderId, "pickup")!.code;
  applyOrderAction(orderId, "advance", provider, pickupPin);
  return provider;
}

describe("sipariş durum akışı (karakterizasyon)", () => {
  it("oluştur → kabul: pending → accepted", async () => {
    const user = await customer("5550000801");
    seedPending("ord-flow-accept", user.id);
    const provider = loadUser("elif")!;
    const after = applyOrderAction("ord-flow-accept", "accept", provider);
    expect(canonicalStatus(after)).toBe("accepted");
    expect(paymentForOrder("ord-flow-accept")?.status).toBe("authorized");
  });

  it("pending → red: rejected ve ödeme void", async () => {
    const user = await customer("5550000802");
    seedPending("ord-flow-reject", user.id);
    const provider = loadUser("elif")!;
    const after = applyOrderAction("ord-flow-reject", "reject", provider);
    expect(canonicalStatus(after)).toBe("rejected");
    expect(paymentForOrder("ord-flow-reject")?.status).toBe("voided");
  });

  it("katlama: kabul → alım → yıkama → hazır → teslim (completed)", async () => {
    const user = await customer("5550000803");
    seedPending("ord-flow-katlama", user.id, "katlama");
    const provider = loadUser("elif")!;
    applyOrderAction("ord-flow-katlama", "accept", provider);
    await throughPickupDoor("ord-flow-katlama", user.id);
    applyOrderAction("ord-flow-katlama", "advance", provider);
    expect(canonicalStatus(getOrderFor(provider, "ord-flow-katlama"))).toBe("washing");
    applyOrderAction("ord-flow-katlama", "advance", provider);
    expect(canonicalStatus(getOrderFor(provider, "ord-flow-katlama"))).toBe("ready");
    const pin = getHandoffCode("ord-flow-katlama", "return")!.code;
    addPhoto("ord-flow-katlama", MINI_PNG, "delivery");
    applyOrderAction("ord-flow-katlama", "deliver", provider, pin);
    const done = getOrderFor(provider, "ord-flow-katlama");
    expect(canonicalStatus(done)).toBe("completed");
    expect(done.paymentStatus).toBe("captured");
  });

  it("tam paket: yıkama → ütü → hazır", async () => {
    const user = await customer("5550000804");
    seedPending("ord-flow-tam", user.id, "tam");
    const provider = loadUser("elif")!;
    applyOrderAction("ord-flow-tam", "accept", provider);
    await throughPickupDoor("ord-flow-tam", user.id);
    applyOrderAction("ord-flow-tam", "advance", provider);
    expect(canonicalStatus(getOrderFor(provider, "ord-flow-tam"))).toBe("washing");
    applyOrderAction("ord-flow-tam", "advance", provider);
    expect(canonicalStatus(getOrderFor(provider, "ord-flow-tam"))).toBe("ironing");
    applyOrderAction("ord-flow-tam", "advance", provider);
    expect(canonicalStatus(getOrderFor(provider, "ord-flow-tam"))).toBe("ready");
  });

  it("fiyat reddi → cancelled", async () => {
    const user = await customer("5550000805");
    const now = new Date().toISOString();
    ensureProviderPriceGrid("elif");
    insertOrderRow({
      id: "ord-flow-pc",
      provider_id: "elif",
      package_id: "katlama",
      express: 0,
      drop_method: "kapi",
      slot: "Bugün 10:00–11:00",
      note: "",
      total: 150,
      commission: 15,
      status: "accepted",
      created_at: now,
      updated_at: now,
      user_id: user.id,
      delivery_mode: "door",
      scheduled_window_start: now,
      size: "kucuk",
      machine_units: 1,
    });
    insertOrderItem({ order_id: "ord-flow-pc", kind: "size", variant: "kucuk", qty: 1, unit_price: 150 });
    const provider = loadUser("elif")!;
    addPhoto("ord-flow-pc", MINI_PNG, "dropoff");
    confirmPickupAtDoor(provider, "ord-flow-pc", { confirmedSize: "buyuk", addons: [], colorGroups: 1 });
    const cust = loadUser(user.id)!;
    respondPriceChange(cust, "ord-flow-pc", "reject");
    const row = getOrderRow("ord-flow-pc")!;
    expect(row.status).toBe("cancelled");
    expect(paymentForOrder("ord-flow-pc")?.status).toBe("voided");
  });

  it("yanıt süresi dolunca pending → rejected", () => {
    const cust = insertUser("5550000806");
    seedPending("ord-flow-exp", cust.id);
    const n = expireStaleRequests(new Date("2026-10-08T09:05:00+03:00"));
    expect(n).toBeGreaterThanOrEqual(1);
    expect(getOrderRow("ord-flow-exp")!.status).toBe("rejected");
  });

  it("completed sonrası itiraz kaydı açılır (sipariş completed kalır)", async () => {
    const user = await customer("5550000807");
    seedPending("ord-flow-dis", user.id);
    const provider = loadUser("elif")!;
    applyOrderAction("ord-flow-dis", "accept", provider);
    await throughPickupDoor("ord-flow-dis", user.id);
    applyOrderAction("ord-flow-dis", "advance", provider);
    applyOrderAction("ord-flow-dis", "advance", provider);
    const pin = getHandoffCode("ord-flow-dis", "return")!.code;
    addPhoto("ord-flow-dis", MINI_PNG, "delivery");
    applyOrderAction("ord-flow-dis", "deliver", provider, pin);
    const dispute = openDispute(user, "ord-flow-dis", "Teslim gecikti");
    expect(dispute.status).toBe("open");
    expect(canonicalStatus(getOrderFor(user, "ord-flow-dis"))).toBe("completed");
  });
});

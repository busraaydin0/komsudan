import { describe, expect, it } from "vitest";
import { insertOrderItem } from "@/lib/db/orderItems";
import { getOrderRow, insertOrderRow, runOrderTx } from "@/lib/db/orders";
import { ensureProviderPriceGrid } from "@/lib/db/providerPrices";
import { remainingReservedForOrder } from "@/lib/db/wallets";
import { ApiError } from "@/lib/errors";
import { quoteForProviderOrder } from "@/lib/pricingServer";
import { addPhoto } from "@/lib/services/photoService";
import { loadUser, requestOtp, verifyOtp } from "./authService";
import {
  authorizePayment,
  authorizePaymentAndHold,
  capturePayment,
  paymentForOrder,
} from "./paymentService";
import { confirmPickupAtDoor } from "./pickupConfirmService";
import { getWallet, holdForOrder, topupWallet } from "./walletService";

const MINI_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

async function customer(phone: string) {
  const sent = requestOtp(phone);
  return (await verifyOtp(phone, sent.demoCode!)).user;
}

function seedAccepted(
  id: string,
  userId: string,
  input: { size: "kucuk" | "buyuk"; total: number; commission: number; unitPrice: number },
) {
  const now = new Date().toISOString();
  ensureProviderPriceGrid("elif");
  insertOrderRow({
    id,
    provider_id: "elif",
    package_id: "katlama",
    express: 0,
    drop_method: "kapi",
    slot: "Bugün 18:00–19:00",
    note: "",
    total: input.total,
    commission: input.commission,
    status: "accepted",
    created_at: now,
    updated_at: now,
    user_id: userId,
    delivery_mode: "door",
    scheduled_window_start: now,
    size: input.size,
    machine_units: input.size === "buyuk" ? 4 : 1,
  });
  insertOrderItem({
    order_id: id,
    kind: "size",
    variant: input.size,
    qty: 1,
    unit_price: input.unitPrice,
  });
  authorizePayment({ orderId: id, amount: input.total, commission: input.commission, at: now });
}

describe("para tutarlılığı (Adım 2c)", () => {
  it("400→500 yetersiz: aynı transaction'da ödeme ve rezerv geri alınır", async () => {
    const user = await customer("5550000910");
    topupWallet(user.id, "kart", 400);
    seedAccepted("ord-money-repro", user.id, {
      size: "kucuk",
      total: 400,
      commission: 40,
      unitPrice: 400,
    });
    holdForOrder(user.id, "ord-money-repro", 400);
    expect(getWallet(user.id).balance).toBe(0);
    expect(paymentForOrder("ord-money-repro")?.amount).toBe(400);

    const now = new Date().toISOString();
    let thrown: ApiError | undefined;
    try {
      runOrderTx(() => {
        authorizePaymentAndHold({
          orderId: "ord-money-repro",
          amount: 500,
          commission: 50,
          at: now,
          userId: user.id,
        });
      });
    } catch (e) {
      thrown = e as ApiError;
    }
    expect(thrown?.code).toBe("INSUFFICIENT_BALANCE");
    expect(paymentForOrder("ord-money-repro")?.amount).toBe(400);
    expect(getWallet(user.id).reserved).toBe(400);
    expect(remainingReservedForOrder("ord-money-repro")).toBe(400);
    expect(getWallet(user.id).balance).toBe(0);
  });

  it("yetersiz bakiye: kapıda artış hata, tutarlar değişmemiş", async () => {
    const user = await customer("5550000911");
    ensureProviderPriceGrid("elif");
    const qSmall = quoteForProviderOrder("elif", "katlama", "kucuk", [], false);
    const qBig = quoteForProviderOrder("elif", "katlama", "buyuk", [], false);
    expect(qBig.total).toBeGreaterThan(qSmall.total);
    topupWallet(user.id, "kart", qSmall.total);
    seedAccepted("ord-money-up", user.id, {
      size: "kucuk",
      total: qSmall.total,
      commission: qSmall.commission,
      unitPrice: qSmall.sizePrice,
    });
    holdForOrder(user.id, "ord-money-up", qSmall.total);
    addPhoto("ord-money-up", MINI_PNG, "dropoff");
    const provider = loadUser("elif")!;
    try {
      confirmPickupAtDoor(provider, "ord-money-up", {
        confirmedSize: "buyuk",
        addons: [],
        colorGroups: 1,
      });
      expect.fail("artış geçmemeliydi");
    } catch (e) {
      expect((e as ApiError).code).toBe("INSUFFICIENT_BALANCE");
    }
    expect(paymentForOrder("ord-money-up")?.amount).toBe(qSmall.total);
    expect(getOrderRow("ord-money-up")!.total).toBe(qSmall.total);
    expect(getWallet(user.id).reserved).toBe(qSmall.total);
    expect(getWallet(user.id).balance).toBe(0);
  });

  it("tutar azalınca fark balance'a döner; ödeme yeni tutara iner", async () => {
    const user = await customer("5550000912");
    ensureProviderPriceGrid("elif");
    const qSmall = quoteForProviderOrder("elif", "katlama", "kucuk", [], false);
    const qBig = quoteForProviderOrder("elif", "katlama", "buyuk", [], false);
    topupWallet(user.id, "kart", qBig.total);
    seedAccepted("ord-money-down", user.id, {
      size: "buyuk",
      total: qBig.total,
      commission: qBig.commission,
      unitPrice: qBig.sizePrice,
    });
    holdForOrder(user.id, "ord-money-down", qBig.total);
    addPhoto("ord-money-down", MINI_PNG, "dropoff");
    confirmPickupAtDoor(loadUser("elif")!, "ord-money-down", {
      confirmedSize: "kucuk",
      addons: [],
      colorGroups: 1,
    });
    const w = getWallet(user.id);
    expect(w.reserved).toBe(qSmall.total);
    expect(w.balance).toBe(qBig.total - qSmall.total);
    expect(paymentForOrder("ord-money-down")?.amount).toBe(qSmall.total);
    expect(getOrderRow("ord-money-down")!.total).toBe(qSmall.total);
  });

  it("capture: müşteri reserved 0, veren pending + komisyon = tutar", async () => {
    const user = await customer("5550000913");
    ensureProviderPriceGrid("elif");
    const q = quoteForProviderOrder("elif", "katlama", "kucuk", [], false);
    topupWallet(user.id, "kart", q.total);
    seedAccepted("ord-money-cap", user.id, {
      size: "kucuk",
      total: q.total,
      commission: q.commission,
      unitPrice: q.sizePrice,
    });
    holdForOrder(user.id, "ord-money-cap", q.total);
    const pendingBefore = getWallet("elif").pending;
    capturePayment("ord-money-cap", new Date().toISOString());
    const pay = paymentForOrder("ord-money-cap")!;
    const customerW = getWallet(user.id);
    const earned = getWallet("elif").pending - pendingBefore;
    expect(pay.status).toBe("captured");
    expect(customerW.reserved).toBe(0);
    expect(earned).toBe(pay.amount - pay.commission);
    expect(customerW.reserved + earned + pay.commission).toBe(pay.amount);
  });

  it("hold < ödeme tutarı: capture hata, tutarlar değişmez", async () => {
    const user = await customer("5550000914");
    topupWallet(user.id, "kart", 400);
    seedAccepted("ord-money-mismatch", user.id, {
      size: "kucuk",
      total: 500,
      commission: 50,
      unitPrice: 500,
    });
    holdForOrder(user.id, "ord-money-mismatch", 400);
    const before = getWallet(user.id);
    const elifPending = getWallet("elif").pending;
    try {
      capturePayment("ord-money-mismatch", new Date().toISOString());
      expect.fail("kısmi capture geçmemeliydi");
    } catch (e) {
      expect((e as ApiError).code).toBe("HOLD_CAPTURE_MISMATCH");
    }
    expect(paymentForOrder("ord-money-mismatch")?.status).toBe("authorized");
    expect(paymentForOrder("ord-money-mismatch")?.amount).toBe(500);
    expect(getWallet(user.id).reserved).toBe(before.reserved);
    expect(getWallet(user.id).balance).toBe(before.balance);
    expect(getWallet("elif").pending).toBe(elifPending);
  });
});

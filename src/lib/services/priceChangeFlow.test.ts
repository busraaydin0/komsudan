import { describe, expect, it } from "vitest";
import { insertOrderItem } from "@/lib/db/orderItems";
import { ensureProviderPriceGrid } from "@/lib/db/providerPrices";
import { getOrderRow, insertOrderRow } from "@/lib/db/orders";
import { loadUser, requestOtp, verifyOtp } from "./authService";
import { confirmPickupAtDoor, respondPriceChange } from "./pickupConfirmService";
import { addPhoto } from "@/lib/services/photoService";
import { applyOrderAction } from "./orderService";
import { approvePickupSummary } from "./handoffService";
import { getHandoffCode } from "@/lib/db/handoffCodes";
import { ApiError } from "@/lib/errors";

const MINI_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

async function customer(phone: string) {
  const sent = requestOtp(phone);
  return (await verifyOtp(phone, sent.demoCode!)).user;
}

function seedAcceptedOrder(id: string, userId: string) {
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
    total: 150,
    commission: 15,
    status: "accepted",
    created_at: now,
    updated_at: now,
    user_id: userId,
    delivery_mode: "door",
    scheduled_window_start: now,
    size: "kucuk",
    machine_units: 1,
  });
  insertOrderItem({
    order_id: id,
    kind: "size",
    variant: "kucuk",
    qty: 1,
    unit_price: 150,
  });
}

describe("fiyat onayı akışı", () => {
  it("büyük boy onay bekler; dropped_off geçilemez", async () => {
    const user = await customer("5550000601");
    seedAcceptedOrder("ord-pc-1", user.id);
    addPhoto("ord-pc-1", MINI_PNG, "dropoff");
    const provider = loadUser("elif")!;
    confirmPickupAtDoor(provider, "ord-pc-1", {
      confirmedSize: "buyuk",
      addons: [],
      colorGroups: 2,
    });
    const row = getOrderRow("ord-pc-1")!;
    expect(row.price_change).toBe("pending");
    await expect(async () => applyOrderAction("ord-pc-1", "advance", provider)).rejects.toBeInstanceOf(
      ApiError,
    );
    respondPriceChange(user, "ord-pc-1", "approve");
    approvePickupSummary(user, "ord-pc-1");
    const pin = getHandoffCode("ord-pc-1", "pickup")!.code;
    applyOrderAction("ord-pc-1", "advance", provider, pin);
    expect(getOrderRow("ord-pc-1")!.status).toBe("dropped_off");
  });

  it("müşteri red → iptal size_rejected", async () => {
    const user = await customer("5550000602");
    seedAcceptedOrder("ord-pc-2", user.id);
    addPhoto("ord-pc-2", MINI_PNG, "dropoff");
    const provider = loadUser("elif")!;
    confirmPickupAtDoor(provider, "ord-pc-2", {
      confirmedSize: "buyuk",
      addons: [],
      colorGroups: 1,
    });
    respondPriceChange(user, "ord-pc-2", "reject");
    const row = getOrderRow("ord-pc-2")!;
    expect(row.status).toBe("cancelled");
    expect(row.cancel_reason).toBe("size_rejected");
    expect(row.payment_status).toBe("voided");
  });
});

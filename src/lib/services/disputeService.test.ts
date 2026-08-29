import { describe, expect, it } from "vitest";
import { ApiError } from "@/server/rules";
import { insertOrderRow, getOrderRow } from "@/lib/db/orders";
import { requestOtp, verifyOtp, loadUser } from "./authService";
import { listDisputesOnOrder, listMyDisputes, openDispute, resolveDispute } from "./disputeService";

async function customer(phone: string) {
  const sent = requestOtp(phone);
  const session = await verifyOtp(phone, sent.demoCode!);
  return session.user;
}

function seedOrder(id: string, userId: string, providerId = "elif") {
  const now = new Date().toISOString();
  insertOrderRow({
    id,
    provider_id: providerId,
    package_id: "yikama",
    pieces: 8,
    express: 0,
    drop_method: "kapi",
    drop_point_id: null,
    slot: "Bugün 18:00–19:00",
    note: "",
    total: 240,
    commission: 24,
    status: "teslim_edildi",
    created_at: now,
    updated_at: now,
    user_id: userId,
    price_per_kg_snapshot: 30,
    estimated_weight: 8,
    estimated_price: 240,
    delivery_mode: "door",
    scheduled_window_start: now,
    lifecycle: "completed",
  });
}

describe("itiraz kaydı", () => {
  it("müşteri veya sağlayıcı açar, ikinci açık itiraz olmaz, sipariş durumu değişmez", async () => {
    const user = await customer("5550000201");
    seedOrder("ord-dsp-1", user.id);
    const opened = openDispute(user, "ord-dsp-1", "Teslim eksik geldi, üç gömlek yok.");
    expect(opened.status).toBe("open");
    expect(opened.openerRole).toBe("customer");
    expect(opened.orderId).toBe("ord-dsp-1");

    expect(() => openDispute(user, "ord-dsp-1", "Aynı siparişe ikinci itiraz.")).toThrow(ApiError);

    const provider = loadUser("elif");
    expect(provider).toBeTruthy();
    const listed = listDisputesOnOrder(provider!, "ord-dsp-1");
    expect(listed).toHaveLength(1);
    expect(listMyDisputes(provider!).some((d) => d.id === opened.id)).toBe(true);

    const closed = resolveDispute(provider!, opened.id);
    expect(closed.status).toBe("resolved");
    expect(closed.resolvedAt).toBeTruthy();
    expect(getOrderRow("ord-dsp-1")?.status).toBe("teslim_edildi");

    const again = openDispute(provider!, "ord-dsp-1", "Sağlayıcı da itiraz açabilsin diye.");
    expect(again.openerRole).toBe("provider");
    expect(again.status).toBe("open");
  });

  it("yabancı siparişe itiraz açamaz", async () => {
    const owner = await customer("5550000202");
    const stranger = await customer("5550000203");
    seedOrder("ord-dsp-2", owner.id);
    expect(() => openDispute(stranger, "ord-dsp-2", "Bu sipariş bana ait değil.")).toThrow(ApiError);
  });
});

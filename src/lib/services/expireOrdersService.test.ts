import { describe, expect, it } from "vitest";
import { insertUser } from "@/lib/db/auth";
import { insertAppointment } from "@/lib/db/appointments";
import { insertOrderRow } from "@/lib/db/orders";
import { getExpiredCount } from "@/lib/db/providerStats";
import { expireStaleRequests } from "./expireOrdersService";
import { db } from "@/lib/db/client";
import { authorizePayment, paymentForOrder } from "@/lib/services/paymentService";

function seedPending(id: string, pickupDate: string, pickupStart: string) {
  const now = new Date("2026-10-07T08:00:00+03:00").toISOString();
  const customer = insertUser("5550000990");
  insertOrderRow({
    id,
    provider_id: "elif",
    package_id: "katlama",
    express: 0,
    drop_method: "kapi",
    slot: `${pickupDate} ${pickupStart}–16:00`,
    note: "",
    total: 100,
    commission: 10,
    status: "onay_bekliyor",
    created_at: now,
    updated_at: now,
    user_id: customer.id,
    delivery_mode: "door",
    scheduled_window_start: now,
    lifecycle: "pending",
    size: "orta",
    machine_units: 2,
    estimated_delivery_date: "2026-10-10",
  });
  dbRespondBy(id, new Date("2026-10-07T09:00:00+03:00").toISOString());
  authorizePayment({ orderId: id, amount: 100, commission: 10, at: now });
  insertAppointment({
    orderId: id,
    kind: "pickup",
    date: pickupDate,
    windowStart: pickupStart,
    windowEnd: "16:00",
    at: now,
  });
}

function dbRespondBy(id: string, iso: string) {
  db().prepare(`UPDATE orders SET respond_by = ? WHERE id = ?`).run(iso, id);
}

describe("expireStaleRequests", () => {
  it("alım penceresine 1 saat kala otomatik red ve ödeme void", () => {
    seedPending("ord-exp-1", "2026-10-07", "15:00");
    const n = expireStaleRequests(new Date("2026-10-07T14:05:00+03:00"));
    expect(n).toBeGreaterThanOrEqual(1);
    const pay = paymentForOrder("ord-exp-1");
    expect(pay?.status).toBe("voided");
    expect(getExpiredCount("elif")).toBeGreaterThanOrEqual(1);
  });
});

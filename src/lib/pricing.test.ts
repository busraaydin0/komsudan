import { describe, expect, it } from "vitest";
import { COMMISSION, estimate, estimateFood, estimateFor, MIN_ORDER } from "./pricing";
import { createOrderSchema } from "./validation/order.schema";
import type { Provider } from "./types";

function laundry(price: number): Provider {
  return {
    id: "p1",
    name: "Test",
    neighborhood: "Çukurambar",
    loc: { lng: 32.8, lat: 39.9 },
    rating: 5,
    reviews: 0,
    packages: [{ id: "katlama", title: "Katlama", blurb: "", pricePerPiece: price }],
    capacity: 40,
    remaining: 40,
    hasDryer: true,
    express: false,
    trust: "yeni",
    drops: ["nokta"],
    slots: ["10:00"],
    bio: "",
    workPhotos: [],
    recentReviews: [],
    categoryId: "camasir",
  };
}

describe("Fiyat sunucuda", () => {
  it("estimateFor sağlayıcı paket fiyatını kullanır; client tutarı yok", () => {
    const q = estimateFor(laundry(13), 8, "katlama", false, 0);
    expect(q.perPiece).toBe(13);
    expect(q.before).toBe(Math.max(MIN_ORDER, 8 * 13));
    expect(q.total).toBe(q.before);
    expect(q.commission).toBe(Math.round(q.total * COMMISSION));
  });

  it("estimateFood kişi × kişi başı; çamaşır tabanı 100 girmez", () => {
    const q = estimateFood(3, 20, 0);
    expect(q.before).toBe(60);
    expect(q.total).toBe(60);
    expect(q.perPiece).toBe(20);
  });

  it("createOrderSchema client total/price alanını yutmaz, yok sayar", () => {
    const parsed = createOrderSchema.parse({
      providerId: "p1",
      drop: "kapi",
      slot: "10:00",
      total: 1,
      price: 9999,
      commission: 0,
    });
    expect("total" in parsed).toBe(false);
    expect("price" in parsed).toBe(false);
    expect("commission" in parsed).toBe(false);
  });

  it("katalog fiyatı estimate katsayısıyla çarpılır, gönderilen tutarla değil", () => {
    const fromClient = 3;
    const server = estimateFood(4, 80, 0);
    expect(server.total).toBe(320);
    expect(server.total).not.toBe(fromClient);
  });

  it("çamaşır express çarpanı paket fiyatına uygulanır", () => {
    const plain = estimate(8, "tam", false);
    const express = estimate(8, "tam", true);
    expect(express.before).toBeGreaterThan(plain.before);
  });
});

import { describe, expect, it } from "vitest";
import { quoteForProvider } from "./customerUi";
import type { Provider } from "@/lib/types";

function stub(over: Partial<Provider> = {}): Provider {
  return {
    id: "p1",
    name: "Test",
    neighborhood: "Çukurambar",
    loc: { lat: 39.9, lng: 32.8 },
    rating: 5,
    reviews: 1,
    packages: [{ id: "tam", title: "Tam", blurb: "", pricePerPiece: 18 }],
    hasDryer: true,
    express: false,
    trust: "yeni",
    drops: ["kapi"],
    slots: [],
    bio: "",
    avatarUrl: null,
    workPhotos: [],
    recentReviews: [],
    ...over,
  };
}

describe("quoteForProvider", () => {
  it("fiyat ızgarası yoksa paket orta fiyatından teklif üretir", () => {
    const q = quoteForProvider(stub({ laundryPrices: { sizes: { tam: {} }, addons: {} } }), {
      size: "orta",
      addons: [],
      pkg: "tam",
      pickupDate: "2026-11-10",
    });
    expect(q.total).toBeGreaterThan(0);
    expect(q.machineUnits).toBe(2);
  });
});

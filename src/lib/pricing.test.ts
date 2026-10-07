import { describe, expect, it } from "vitest";
import {
  COMMISSION,
  isSameDayPickup,
  quoteLaundry,
  resolveExpress,
} from "./pricing";
import type { OrderAddonLine } from "./laundryModel";

describe("Boy + ek fiyat", () => {
  it("orta boy + bir yorgan tek fiyatı toplar; MIN_ORDER yok", () => {
    const addons: OrderAddonLine[] = [{ addon: "yorgan", variant: "tek", qty: 1 }];
    const q = quoteLaundry({
      packageId: "katlama",
      size: "orta",
      addons,
      express: false,
      sizePrice: 150,
      addonUnitPrices: { yorgan_tek: 95 },
    });
    expect(q.subtotal).toBe(245);
    expect(q.total).toBe(245);
    expect(q.machineUnits).toBe(4);
    expect(q.commission).toBe(Math.round(245 * COMMISSION));
  });

  it("büyük boy makine birimi 4; ekler +2 birim/adet", () => {
    const q = quoteLaundry({
      packageId: "yikama",
      size: "buyuk",
      addons: [{ addon: "battaniye", variant: "cift", qty: 2 }],
      express: false,
      sizePrice: 200,
      addonUnitPrices: { battaniye_cift: 120 },
    });
    expect(q.machineUnits).toBe(4 + 2 * 2);
  });

  it("aynı gün express +%25", () => {
    const base = quoteLaundry({
      packageId: "katlama",
      size: "kucuk",
      addons: [],
      express: false,
      sizePrice: 100,
      addonUnitPrices: {},
    });
    const express = quoteLaundry({
      packageId: "katlama",
      size: "kucuk",
      addons: [],
      express: true,
      sizePrice: 100,
      addonUnitPrices: {},
    });
    expect(express.total).toBeGreaterThan(base.total);
  });

  it("aynı gün alım express", () => {
    const now = new Date("2026-10-08T12:00:00+03:00");
    expect(isSameDayPickup("2026-10-08", now)).toBe(true);
    expect(resolveExpress(true, "2026-10-09", now)).toBe(false);
    expect(resolveExpress(true, "2026-10-08", now)).toBe(true);
  });
});

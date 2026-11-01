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

  it("3 makine 6 birim; fiyat orta × 3 siparişte sizePrice olarak gelir", () => {
    const q = quoteLaundry({
      packageId: "tam",
      size: "makine3",
      addons: [],
      express: false,
      sizePrice: 480,
      addonUnitPrices: {},
    });
    expect(q.machineUnits).toBe(6);
    expect(q.total).toBe(480);
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

  it("acil quote ×1.4 ve komisyon o toplamdan", () => {
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
    expect(base.total).toBe(100);
    expect(express.total).toBe(140);
    expect(express.commission).toBe(Math.round(140 * COMMISSION));
  });

  it("express=false iken bugün alım olsa da zam yok", () => {
    const now = new Date("2026-10-08T12:00:00+03:00");
    expect(isSameDayPickup("2026-10-08", now)).toBe(true);
    expect(resolveExpress(false)).toBe(false);
    expect(resolveExpress(true)).toBe(true);
    const q = quoteLaundry({
      packageId: "katlama",
      size: "kucuk",
      addons: [],
      express: false,
      sizePrice: 100,
      addonUnitPrices: {},
    });
    expect(q.total).toBe(100);
  });
});

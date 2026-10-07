import { describe, expect, it } from "vitest";
import {
  COMMISSION,
  isSameDaySlot,
  pickSlotForDay,
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

  it("createOrderSchema client total almaz; size + addons", () => {
    const parsed = createOrderSchema.parse({
      providerId: "p1",
      packageId: "tam",
      size: "orta",
      addons: [{ addon: "yorgan", variant: "tek", qty: 1 }],
      slot: "Bugün 10:00–11:00",
      total: 1,
    });
    expect("total" in parsed).toBe(false);
    expect(parsed.size).toBe("orta");
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

  it("bugün slotu aynı gün sayılır", () => {
    expect(isSameDaySlot("Bugün 18:00–19:00")).toBe(true);
    expect(isSameDaySlot("Yarın 18:00–19:00")).toBe(false);
  });

  it("aynı gün zamı slottan", () => {
    expect(resolveExpress(true, "Bugün 18:00–19:00")).toBe(true);
    expect(resolveExpress(true, "Yarın 18:00–19:00")).toBe(false);
  });

  it("slot tekerleği bugün/yarın", () => {
    const slots = ["Bugün 18:00–19:00", "Yarın 09:00–10:00"];
    expect(pickSlotForDay(slots, true, "Yarın 18:00–19:00")).toBe("Bugün 18:00–19:00");
    expect(pickSlotForDay(slots, false, "Bugün 18:00–19:00")).toBe("Yarın 09:00–10:00");
  });
});

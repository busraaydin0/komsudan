import { describe, expect, it } from "vitest";
import {
  LAUNDRY_SIZES,
  MAX_UNITS_PER_ORDER,
  HALF_UNITS_PER_MACHINE,
  halfUnitsToMachines,
  machineUnitsFor,
  machinesToHalfUnits,
  resolveSizePrice,
  scaledSizePrice,
  sizeRank,
} from "./laundryModel";

describe("çamaşır boyu 3–5 makine", () => {
  it("boy listesi küçük-ortadan 5 makineye kadar", () => {
    expect([...LAUNDRY_SIZES]).toEqual(["kucuk", "orta", "buyuk", "makine3", "makine4", "makine5"]);
    expect(MAX_UNITS_PER_ORDER).toBe(10);
  });

  it("makine ↔ yarım-makine birimi", () => {
    expect(HALF_UNITS_PER_MACHINE).toBe(2);
    expect(machinesToHalfUnits(1)).toBe(2);
    expect(halfUnitsToMachines(2)).toBe(1);
    expect(halfUnitsToMachines(machinesToHalfUnits(1))).toBe(1);
  });

  it("5 makine 10 birim; 3 makine orta × 3 fiyat", () => {
    expect(machineUnitsFor("makine5", [])).toBe(10);
    expect(machineUnitsFor("makine3", [])).toBe(6);
    expect(scaledSizePrice(150, "makine3")).toBe(450);
    expect(scaledSizePrice(150, "makine5")).toBe(750);
  });

  it("kayıtta yoksa orta fiyattan 3–5 makine üretir", () => {
    expect(resolveSizePrice("makine3", { orta: 160 })).toBe(480);
    expect(resolveSizePrice("orta", { orta: 160 })).toBe(160);
    expect(resolveSizePrice("makine4", { kucuk: 90 })).toBeNull();
  });

  it("kapıda yükseltme sırası 5 makineye kadar", () => {
    expect(sizeRank("buyuk")).toBeLessThan(sizeRank("makine3"));
    expect(sizeRank("makine5")).toBe(LAUNDRY_SIZES.length - 1);
  });
});

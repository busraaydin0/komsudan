import { describe, expect, it } from "vitest";
import { computeSchedule, type CapacitySettings, type DayUsage } from "./computeSchedule";

const settings: CapacitySettings = {
  halfUnitsPerDay: 4,
  workingDays: [1, 2, 3, 4, 5],
  maxUnitsPerOrder: 4,
};

function emptyUsage(from: string, days: number, max = 4): DayUsage[] {
  const out: DayUsage[] = [];
  let d = from;
  for (let i = 0; i < days; i++) {
    out.push({ date: d, maxUnits: max, usedUnits: 0 });
    const [y, m, day] = d.split("-").map(Number);
    const next = new Date(Date.UTC(y, m - 1, day + 1, 12, 0, 0));
    d = next.toISOString().slice(0, 10);
  }
  return out;
}

describe("computeSchedule", () => {
  it("tek gün: orta boy tek güne sığar", () => {
    const now = new Date("2026-10-08T10:00:00+03:00");
    const r = computeSchedule(
      settings,
      emptyUsage("2026-10-08", 14),
      {
        packageId: "katlama",
        machineUnits: 2,
        hasHeavyAddon: false,
        slot: "Bugün 18:00–19:00",
      },
      now,
    );
    expect(r).not.toBeNull();
    expect(r!.allocations).toEqual([{ date: "2026-10-08", units: 2 }]);
    expect(r!.deliveryDate).toBe("2026-10-10");
  });

  it("taşan sipariş iki güne yayılır", () => {
    const now = new Date("2026-10-08T10:00:00+03:00");
    const usage = emptyUsage("2026-10-08", 14);
    usage[0]!.usedUnits = 2;
    const r = computeSchedule(
      settings,
      usage,
      {
        packageId: "yikama",
        machineUnits: 4,
        hasHeavyAddon: false,
        slot: "Bugün 18:00–19:00",
      },
      now,
    );
    expect(r!.allocations).toEqual([
      { date: "2026-10-08", units: 2 },
      { date: "2026-10-09", units: 2 },
    ]);
  });

  it("çalışılmayan gün: Cumartesi alım Pazartesiye kayar", () => {
    const now = new Date("2026-10-10T10:00:00+03:00");
    const r = computeSchedule(
      settings,
      emptyUsage("2026-10-10", 14),
      {
        packageId: "katlama",
        machineUnits: 2,
        hasHeavyAddon: false,
        slot: "Bugün 18:00–19:00",
      },
      now,
    );
    expect(r!.pickupDate).toBe("2026-10-12");
    expect(r!.allocations[0]!.date).toBe("2026-10-12");
  });

  it("yorgan/battaniye +24 saat teslimi uzatır", () => {
    const now = new Date("2026-10-08T10:00:00+03:00");
    const plain = computeSchedule(
      settings,
      emptyUsage("2026-10-08", 14),
      {
        packageId: "katlama",
        machineUnits: 2,
        hasHeavyAddon: false,
        slot: "Bugün 18:00–19:00",
      },
      now,
    );
    const heavy = computeSchedule(
      settings,
      emptyUsage("2026-10-08", 14),
      {
        packageId: "katlama",
        machineUnits: 2,
        hasHeavyAddon: true,
        slot: "Bugün 18:00–19:00",
      },
      now,
    );
    expect(heavy!.deliveryDate > plain!.deliveryDate).toBe(true);
  });

  it("max_units_per_order üstü reddedilir", () => {
    const now = new Date("2026-10-08T10:00:00+03:00");
    const r = computeSchedule(
      settings,
      emptyUsage("2026-10-08", 14),
      {
        packageId: "katlama",
        machineUnits: 5,
        hasHeavyAddon: false,
        slot: "Bugün 18:00–19:00",
      },
      now,
    );
    expect(r).toBeNull();
  });
});

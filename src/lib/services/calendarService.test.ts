import { describe, expect, it, beforeAll } from "vitest";
import { buildProviderCalendar } from "./calendarService";
import { upsertCapacitySettings } from "@/lib/db/providerCapacity";
import { insertSlotRow } from "@/lib/db/providers";

describe("provider calendar", () => {
  beforeAll(() => {
    upsertCapacitySettings({
      providerId: "elif",
      halfUnitsPerDay: 8,
      workingDays: [1, 2, 3, 4, 5, 6, 7],
      maxUnitsPerOrder: 4,
    });
    insertSlotRow({
      id: "cal-test-wed",
      provider_id: "elif",
      day_of_week: 3,
      start_time: "12:00",
      end_time: "20:00",
      delivery_mode: "door",
      is_active: 1,
    });
  });

  it("bugün penceresi ≥2 saat eşiği", () => {
    const now = new Date("2026-10-07T11:00:00+03:00");
    const windows = buildProviderCalendar("elif", now).filter((w) => w.date === "2026-10-07");
    const tooSoon = windows.find((w) => w.start === "12:00");
    const ok = windows.find((w) => w.start === "14:00");
    expect(tooSoon?.selectable).toBe(false);
    expect(ok?.selectable).toBe(true);
  });
});

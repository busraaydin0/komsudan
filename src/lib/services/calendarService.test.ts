import { describe, expect, it, beforeAll } from "vitest";
import { buildProviderCalendar, buildProviderCalendarDays } from "./calendarService";
import { upsertCapacitySettings } from "@/lib/db/providerCapacity";
import { insertSlotRow } from "@/lib/db/providers";
import { CALENDAR_COPY } from "@/lib/calendar/gapCopy";

describe("provider calendar", () => {
  beforeAll(() => {
    upsertCapacitySettings({
      providerId: "elif",
      halfUnitsPerDay: 8,
      workingDays: [1, 2, 3, 4, 5, 6, 7],
      maxUnitsPerOrder: 4,
      expressQuota: 2,
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

  it("elif 7 günde seçilebilir pencere döner (normal ve acil)", () => {
    const now = new Date("2026-10-07T11:00:00+03:00");
    const normal = buildProviderCalendar("elif", now, false);
    const express = buildProviderCalendar("elif", now, true);
    expect(normal.some((w) => w.selectable)).toBe(true);
    expect(express.some((w) => w.selectable)).toBe(true);
  });

  it("acil bugün penceresi ≥1 saat eşiği", () => {
    const now = new Date("2026-10-07T11:00:00+03:00");
    const windows = buildProviderCalendar("elif", now, true).filter((w) => w.date === "2026-10-07");
    const oneHour = windows.find((w) => w.start === "12:00");
    const later = windows.find((w) => w.start === "14:00");
    expect(oneHour?.selectable).toBe(true);
    expect(later?.selectable).toBe(true);
  });

  it("öğleden sonra bugün pencere kalmaz, sonraki iş günü seçilir", () => {
    upsertCapacitySettings({
      providerId: "elif",
      halfUnitsPerDay: 8,
      workingDays: [1, 2, 3, 4, 5, 6],
      maxUnitsPerOrder: 10,
      expressQuota: 2,
    });
    const now = new Date("2026-11-07T17:00:00+03:00");
    const days = buildProviderCalendarDays("elif", now, false);
    const sat = days.find((d) => d.date === "2026-11-07");
    expect(sat?.windows.every((w) => !w.selectable)).toBe(true);
    expect(sat?.reason).toBe(CALENDAR_COPY.leadToday);
    expect(days.some((d) => d.windows.some((w) => w.selectable))).toBe(true);
  });

  it("pazar kapalı", () => {
    upsertCapacitySettings({
      providerId: "elif",
      halfUnitsPerDay: 8,
      workingDays: [1, 2, 3, 4, 5, 6],
      maxUnitsPerOrder: 10,
      expressQuota: 2,
    });
    const now = new Date("2026-11-08T11:00:00+03:00");
    const sun = buildProviderCalendarDays("elif", now, false).find((d) => d.date === "2026-11-08");
    expect(sun?.status).toBe("closed");
    expect(sun?.reason).toBe(CALENDAR_COPY.closed);
    expect(sun?.windows).toEqual([]);
  });

  it("kota kapasiteyi sıfırlamaz", () => {
    upsertCapacitySettings({
      providerId: "elif",
      halfUnitsPerDay: 8,
      workingDays: [1, 2, 3, 4, 5, 6],
      maxUnitsPerOrder: 10,
      expressQuota: 2,
    });
    const now = new Date("2026-11-09T10:00:00+03:00");
    const days = buildProviderCalendarDays("elif", now, false);
    expect(days.some((d) => d.windows.some((w) => w.selectable && w.status !== "full"))).toBe(true);
    expect(days.filter((d) => d.status === "full")).toEqual([]);
  });

  it("acil cumartesi 17:00 sonrası bugün pencere yok", () => {
    upsertCapacitySettings({
      providerId: "elif",
      halfUnitsPerDay: 8,
      workingDays: [1, 2, 3, 4, 5, 6],
      maxUnitsPerOrder: 10,
      expressQuota: 2,
    });
    const now = new Date("2026-11-07T17:05:00+03:00");
    const sat = buildProviderCalendarDays("elif", now, true).find((d) => d.date === "2026-11-07");
    expect(sat?.windows.every((w) => !w.selectable)).toBe(true);
    expect(sat?.reason).toBe(CALENDAR_COPY.expressNone);
  });

  it("acil kota sipariş boyuna yetmezse neden yazar", () => {
    upsertCapacitySettings({
      providerId: "elif",
      halfUnitsPerDay: 8,
      workingDays: [1, 2, 3, 4, 5, 6],
      maxUnitsPerOrder: 10,
      expressQuota: 2,
    });
    const now = new Date("2026-11-09T10:00:00+03:00");
    const today = buildProviderCalendarDays("elif", now, true, 6).find((d) => d.date === "2026-11-09");
    expect(today?.status).toBe("full");
    expect(today?.reason).toBe(CALENDAR_COPY.size);
    expect(today?.windows.every((w) => !w.selectable)).toBe(true);
  });

  it("acil kota 0 sessiz dolu değil, neden yazar", () => {
    const now = new Date("2026-11-09T10:00:00+03:00");
    const days = buildProviderCalendarDays("merve", now, true);
    expect(days.filter((d) => d.status !== "closed").every((d) => d.status === "full")).toBe(true);
    expect(days.find((d) => d.status === "full")?.reason).toBe(CALENDAR_COPY.expressNone);
    expect(days.flatMap((d) => d.windows).every((w) => !w.selectable)).toBe(true);
  });
});

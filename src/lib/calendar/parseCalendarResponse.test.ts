import { describe, expect, it } from "vitest";
import { parseCalendarDays, parseCalendarWindows } from "./parseCalendarResponse";
import { firstSelectableAppointment, isCalendarChipDisabled } from "./selection";
import { CALENDAR_COPY } from "./gapCopy";

const sample = {
  date: "2026-11-07",
  start: "10:00",
  end: "12:00",
  status: "ok" as const,
  selectable: true,
  reason: null,
};

describe("takvim API zarfı", () => {
  it("data.windows okunmazsa takvim boş kalır (kök hata)", () => {
    const envelope = { data: { windows: [sample], days: [] } };
    expect((envelope as { windows?: unknown }).windows).toBeUndefined();
    expect(parseCalendarWindows(envelope)).toEqual([sample]);
  });

  it("zarfsız gövdeyi de kabul eder", () => {
    expect(parseCalendarWindows({ windows: [sample] })).toEqual([sample]);
  });

  it("windows yoksa boş dizi", () => {
    expect(parseCalendarWindows({ data: {} })).toEqual([]);
    expect(parseCalendarWindows(null)).toEqual([]);
  });

  it("days zarfında kapalı gün penceresiz kalır", () => {
    const days = parseCalendarDays({
      data: {
        days: [{ date: "2026-11-08", status: "closed", reason: CALENDAR_COPY.closed, windows: [] }],
        windows: [],
      },
    });
    expect(days).toEqual([
      { date: "2026-11-08", status: "closed", reason: CALENDAR_COPY.closed, windows: [] },
    ]);
  });
});

describe("takvim seçimi", () => {
  it("veri gelince tarih seçilir", () => {
    const windows = parseCalendarWindows({ data: { windows: [sample] } });
    expect(windows.some((w) => !isCalendarChipDisabled(w))).toBe(true);
    expect(firstSelectableAppointment(windows)).toEqual({
      date: "2026-11-07",
      windowStart: "10:00",
      windowEnd: "12:00",
    });
  });

  it("dolu/kapalı pencere seçilmez", () => {
    expect(
      isCalendarChipDisabled({
        date: "2026-11-08",
        start: "10:00",
        end: "12:00",
        status: "closed",
        selectable: false,
        reason: CALENDAR_COPY.closed,
      }),
    ).toBe(true);
    expect(firstSelectableAppointment([])).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { parseCalendarWindows } from "./parseCalendarResponse";

const sample = {
  date: "2026-11-07",
  start: "10:00",
  end: "12:00",
  status: "ok" as const,
  selectable: true,
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
});

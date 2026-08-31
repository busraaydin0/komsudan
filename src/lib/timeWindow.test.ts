import { describe, expect, it } from "vitest";
import {
  DEFAULT_DURATION_MINUTES,
  durationMinutesFor,
  formatPilotSlot,
  isAllowedOrderSlot,
  isFreeOrderSlot,
  isValidWorkStart,
  listStartMinutes,
  parsePilotSlot,
} from "./timeWindow";

describe("serbest saat penceresi", () => {
  it("musluk süresi 60 dk, 15 dk adım, son başlangıç 18:00", () => {
    expect(durationMinutesFor("musluk")).toBe(60);
    const starts = listStartMinutes(60);
    expect(starts[0]).toBe(9 * 60);
    expect(starts.at(-1)).toBe(18 * 60);
    expect(starts.every((t) => t % 15 === 0)).toBe(true);
  });

  it("09:00 öncesi, 19:00 bitişini aşan ve 15 dk katı olmayan reddedilir", () => {
    expect(isValidWorkStart(8 * 60 + 45, 60)).toBe(false);
    expect(isValidWorkStart(19 * 60, 60)).toBe(false);
    expect(isValidWorkStart(18 * 60 + 15, 60)).toBe(false);
    expect(isValidWorkStart(14 * 60 + 7, 60)).toBe(false);
    expect(isValidWorkStart(10 * 60, 60)).toBe(true);
    expect(isValidWorkStart(18 * 60, 60)).toBe(true);
  });

  it("Bugün/Yarın HH:MM–HH:MM 60 dk ise serbest saat kabul", () => {
    expect(isFreeOrderSlot("Bugün 10:00–11:00")).toBe(true);
    expect(isFreeOrderSlot("Yarın 18:00–19:00")).toBe(true);
    expect(isFreeOrderSlot("Bugün 14:07–15:07")).toBe(false);
    expect(isFreeOrderSlot("Bugün 08:00–09:00")).toBe(false);
    expect(isFreeOrderSlot("10:00")).toBe(false);
  });

  it("eski sabit dilim listede ise geçerliliğini korur", () => {
    expect(isAllowedOrderSlot("Bugün 19:00–20:00", ["Bugün 19:00–20:00"])).toBe(true);
    expect(isAllowedOrderSlot("Bugün 19:00–20:00", [])).toBe(false);
    expect(isAllowedOrderSlot("Bugün 10:15–11:15", [])).toBe(true);
  });

  it("parse/format yuvarlak trip", () => {
    const slot = formatPilotSlot("bugun", 10 * 60 + 15, DEFAULT_DURATION_MINUTES);
    expect(slot).toBe("Bugün 10:15–11:15");
    expect(parsePilotSlot(slot)).toEqual({ day: "bugun", startMin: 615, endMin: 675 });
  });
});

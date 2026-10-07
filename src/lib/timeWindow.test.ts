import { describe, expect, it } from "vitest";
import { DEFAULT_DURATION_MINUTES, isValidWorkStart, listStartMinutes } from "./timeWindow";

describe("çalışma saati penceresi", () => {
  it("süre 60 dk, 15 dk adım, son başlangıç 18:00", () => {
    expect(DEFAULT_DURATION_MINUTES).toBe(60);
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
});

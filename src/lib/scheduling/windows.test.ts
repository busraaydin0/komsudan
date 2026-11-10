import { describe, expect, it } from "vitest";
import { splitTwoHourWindows, windowsFromAvailabilitySlots } from "./windows";

describe("windowsFromAvailabilitySlots", () => {
  it("yan yana 1 saatlik slotları 2 saatlik pencereye birleştirir", () => {
    expect(
      windowsFromAvailabilitySlots([
        { start_time: "18:00", end_time: "19:00" },
        { start_time: "19:00", end_time: "20:00" },
      ]),
    ).toEqual([{ start: "18:00", end: "20:00" }]);
  });

  it("tek 1 saatlik slotu yine seçilebilir bırakır", () => {
    expect(windowsFromAvailabilitySlots([{ start_time: "18:00", end_time: "19:00" }])).toEqual([
      { start: "18:00", end: "19:00" },
    ]);
  });

  it("uzun slotu 2 saatte böler", () => {
    expect(splitTwoHourWindows("08:00", "12:00")).toEqual([
      { start: "08:00", end: "10:00" },
      { start: "10:00", end: "12:00" },
    ]);
  });
});

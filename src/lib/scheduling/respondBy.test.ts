import { describe, expect, it } from "vitest";
import { computeRespondBy, firstWorkingInstant } from "./respondBy";
import type { SlotRow } from "@/lib/db/providers";

const slots: SlotRow[] = [
  {
    id: "1",
    provider_id: "p",
    day_of_week: 3,
    start_time: "09:00",
    end_time: "19:00",
    delivery_mode: "door",
    is_active: 1,
  },
];

describe("respondBy", () => {
  it("çalışma saatinde oluşturulursa +45 dk", () => {
    const created = new Date("2026-10-07T10:00:00+03:00");
    const by = computeRespondBy(created, slots);
    expect(by).toBe(new Date("2026-10-07T10:45:00+03:00").toISOString());
  });

  it("çalışma dışında ilk slot başlangıcında sayaç başlar", () => {
    const created = new Date("2026-10-07T20:00:00+03:00");
    const start = firstWorkingInstant(created, slots);
    expect(start.toISOString()).toBe(new Date("2026-10-14T09:00:00+03:00").toISOString());
    const by = computeRespondBy(created, slots);
    expect(by).toBe(new Date("2026-10-14T09:45:00+03:00").toISOString());
  });
});

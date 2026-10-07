import { describe, expect, it } from "vitest";
import { createOrderSchema } from "./order.schema";

describe("createOrderSchema", () => {
  it("size + addons kabul eder, client total yutmaz", () => {
    const parsed = createOrderSchema.parse({
      providerId: "p1",
      packageId: "tam",
      size: "orta",
      addons: [{ addon: "yorgan", variant: "tek", qty: 1 }],
      pickup: { date: "2026-10-08", windowStart: "10:00", windowEnd: "12:00" },
      delivery: { date: "2026-10-10", windowStart: "14:00", windowEnd: "16:00" },
      total: 999,
    });
    expect(parsed.size).toBe("orta");
    expect("total" in parsed).toBe(false);
  });
});

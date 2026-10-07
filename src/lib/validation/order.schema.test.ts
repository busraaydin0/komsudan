import { describe, expect, it } from "vitest";
import { createOrderSchema } from "./order.schema";

describe("createOrderSchema", () => {
  it("size + addons kabul eder, client total yutmaz", () => {
    const parsed = createOrderSchema.parse({
      providerId: "p1",
      packageId: "tam",
      size: "orta",
      addons: [{ addon: "yorgan", variant: "tek", qty: 1 }],
      slot: "Bugün 10:00–11:00",
      total: 999,
    });
    expect(parsed.size).toBe("orta");
    expect("total" in parsed).toBe(false);
  });
});

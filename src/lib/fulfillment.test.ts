import { describe, expect, it } from "vitest";
import { laundryDeliveryStrategy } from "./fulfillment";

describe("fulfillment", () => {
  it("çamaşır delivery stratejisi hazır ve geçişlere izin verir", () => {
    expect(laundryDeliveryStrategy.mode).toBe("delivery");
    expect(laundryDeliveryStrategy.ready).toBe(true);
    expect(laundryDeliveryStrategy.canTransition("pending", "accepted", "tam")).toBe(true);
  });
});

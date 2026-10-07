import { describe, expect, it } from "vitest";
import { deliveryStrategy, strategyFor } from "./fulfillment";

describe("fulfillment", () => {
  it("çamaşır her zaman delivery SM kullanır", () => {
    expect(strategyFor("delivery", "camasir", "dropoff")).toBe(deliveryStrategy);
    expect(strategyFor("home_visit", "camasir", "home_visit")).toBe(deliveryStrategy);
    expect(deliveryStrategy.ready).toBe(true);
    expect(deliveryStrategy.canTransition("pending", "accepted", "tam")).toBe(true);
  });
});

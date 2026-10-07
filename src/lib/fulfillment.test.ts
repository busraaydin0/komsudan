import { describe, expect, it } from "vitest";
import { deliveryStrategy, foodStrategy, homeVisitStrategy, strategyFor } from "./fulfillment";

describe("fulfillment type-aware SM", () => {
  it("çamaşır delivery SM kullanır; home_visit ayrı harita, ready false", () => {
    expect(strategyFor("delivery", "camasir", "dropoff")).toBe(deliveryStrategy);
    expect(strategyFor("delivery", "camasir", "home_visit")).toBe(homeVisitStrategy);
    expect(homeVisitStrategy.ready).toBe(false);
    expect(deliveryStrategy.ready).toBe(true);
    expect(foodStrategy.ready).toBe(true);
    expect(deliveryStrategy.canTransition("pending", "accepted", "tam")).toBe(true);
    expect(homeVisitStrategy.canTransition("pending", "accepted", "tam")).toBe(false);
  });
});

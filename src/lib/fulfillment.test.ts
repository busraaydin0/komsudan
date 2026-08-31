import { describe, expect, it } from "vitest";
import { foodStrategy, homeVisitStrategy, strategyFor } from "./fulfillment";

describe("fulfillment type-aware SM", () => {
  it("dropoff Tamir food SM kullanır; home_visit ayrı harita, ready false", () => {
    expect(strategyFor("delivery", "tamir", "dropoff")).toBe(foodStrategy);
    expect(strategyFor("delivery", "tamir", "home_visit")).toBe(homeVisitStrategy);
    expect(homeVisitStrategy.ready).toBe(false);
    expect(foodStrategy.ready).toBe(true);
    expect(foodStrategy.canTransition("pending", "accepted", "tam")).toBe(true);
    expect(homeVisitStrategy.canTransition("pending", "accepted", "tam")).toBe(false);
  });
});

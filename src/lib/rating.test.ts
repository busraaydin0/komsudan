import { describe, expect, it } from "vitest";
import { bayesianRating } from "./rating";

describe("bayesianRating", () => {
  it("az 5.0, çok 4.8’in altında kalır", () => {
    expect(bayesianRating(5, 3)).toBeLessThan(bayesianRating(4.8, 150));
    expect(bayesianRating(5, 1)).toBeLessThan(bayesianRating(5, 20));
  });

  it("yorum yoksa prior döner", () => {
    expect(bayesianRating(5, 0)).toBe(4);
  });
});

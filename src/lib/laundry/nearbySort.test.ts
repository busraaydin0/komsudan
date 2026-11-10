import { describe, expect, it } from "vitest";
import { NEARBY_SORTS } from "./nearbySort";

describe("NEARBY_SORTS", () => {
  it("Bugün yer var başta, uzaktan yakına yok", () => {
    expect(NEARBY_SORTS[0]?.id).toBe("space");
    expect(NEARBY_SORTS.some((s) => s.id === "far")).toBe(false);
  });
});

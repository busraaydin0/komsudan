import { describe, expect, it } from "vitest";
import { LAUNDRY_PACKAGE_IDS, LAUNDRY_PACKAGES } from "./packages";

describe("çamaşır paket sabitleri", () => {
  it("üç paket id tanımlı", () => {
    expect(LAUNDRY_PACKAGE_IDS).toEqual(["yikama", "katlama", "tam"]);
    expect(LAUNDRY_PACKAGES.map((p) => p.id)).toEqual(LAUNDRY_PACKAGE_IDS);
  });
});

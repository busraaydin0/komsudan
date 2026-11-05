import { describe, expect, it } from "vitest";
import { requiresPriceApproval } from "@/lib/pickupRules";

describe("kapı fiyat onayı", () => {
  it("büyük boy onay gerektirir", () => {
    expect(
      requiresPriceApproval("orta", [], "buyuk", []),
    ).toBe(true);
  });

  it("aynı boy ve ek onay gerektirmez", () => {
    expect(
      requiresPriceApproval(
        "orta",
        [{ addon: "yorgan", variant: "tek", qty: 1 }],
        "orta",
        [{ addon: "yorgan", variant: "tek", qty: 1 }],
      ),
    ).toBe(false);
  });

  it("fazla ek onay gerektirir", () => {
    expect(
      requiresPriceApproval(
        "kucuk",
        [],
        "kucuk",
        [{ addon: "battaniye", variant: "tek", qty: 2 }],
      ),
    ).toBe(true);
  });
});

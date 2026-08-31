import { describe, expect, it } from "vitest";
import { fulfillmentTypeForKind, lockRepairSubtype, REPAIR_KINDS } from "./repair";

describe("Tamir alt-tip fulfillment", () => {
  it("musluk home_visit ve iş başı kilidi; diğerleri dropoff", () => {
    expect(REPAIR_KINDS.some((k) => k.id === "musluk")).toBe(true);
    expect(fulfillmentTypeForKind("musluk")).toBe("home_visit");
    expect(fulfillmentTypeForKind("elektronik")).toBe("dropoff");
    expect(fulfillmentTypeForKind("ev")).toBe("dropoff");

    const musluk = lockRepairSubtype({
      kind: "musluk",
      priceType: "inceleme",
      priceUnit: "saat",
      fulfillmentType: "dropoff",
    });
    expect(musluk.fulfillmentType).toBe("home_visit");
    expect(musluk.priceType).toBe("sabit");
    expect(musluk.priceUnit).toBe("is");

    const laptop = lockRepairSubtype({ kind: "elektronik", priceType: "baslangic", priceUnit: "adet" });
    expect(laptop.fulfillmentType).toBe("dropoff");
    expect(laptop.priceType).toBe("baslangic");
  });
});

import { describe, expect, it } from "vitest";
import { visitAddressForViewer } from "./visitAddress";

const full = {
  fulfillmentType: "home_visit" as const,
  district: "Çankaya",
  neighborhood: "Çukurambar",
  address: "123. sokak no 4 daire 8",
};

describe("home_visit adres görünürlüğü", () => {
  it("pending provider’a tam adres vermez, mahalle/ilçe verir", () => {
    const v = visitAddressForViewer({ ...full, lifecycle: "pending", viewer: "provider" });
    expect(v.district).toBe("Çankaya");
    expect(v.neighborhood).toBe("Çukurambar");
    expect(v.address).toBeNull();
  });

  it("confirmed sonrası provider tam adresi görür", () => {
    const v = visitAddressForViewer({ ...full, lifecycle: "confirmed", viewer: "provider" });
    expect(v.address).toBe(full.address);
  });

  it("müşteri pending’de de tam adresi görür", () => {
    const v = visitAddressForViewer({ ...full, lifecycle: "pending", viewer: "customer" });
    expect(v.address).toBe(full.address);
  });

  it("dropoff siparişte adres alanı boş kalır", () => {
    const v = visitAddressForViewer({
      ...full,
      fulfillmentType: "dropoff",
      lifecycle: "pending",
      viewer: "provider",
    });
    expect(v.district).toBeNull();
    expect(v.neighborhood).toBeNull();
    expect(v.address).toBeNull();
  });
});

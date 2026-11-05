import { describe, expect, it } from "vitest";
import { CUSTOMER_PROVIDER_TABS, tabBarIconKind, tabBarItems } from "./tabBarItems";

describe("TabBar maddeleri", () => {
  it("müşteri/veren sekmeleri değişmez; 4. Hizmet", () => {
    const items = tabBarItems(false);
    expect(items).toEqual(CUSTOMER_PROVIDER_TABS);
    expect(items.map((t) => t.id)).toEqual(["harita", "siparis", "mesaj", "hizmet", "hesap"]);
    expect(items[3]).toEqual({ id: "hizmet", label: "Hizmet" });
    expect(items.some((t) => t.id === "yonetim")).toBe(false);
  });

  it("service_admin 4. sekme Yönetim etiketi ve admin ikonu", () => {
    const items = tabBarItems(true);
    expect(items.map((t) => t.id)).toEqual([
      "harita",
      "siparis",
      "mesaj",
      "yonetim",
      "hizmet",
      "hesap",
    ]);
    expect(items[3]).toEqual({ id: "yonetim", label: "Yönetim" });
    expect(items[3]?.label).not.toBe("Rotalar");
    expect(tabBarIconKind("yonetim")).toBe("admin");
    expect(tabBarIconKind("yonetim")).not.toBe("desk");
    expect(tabBarIconKind("hizmet")).toBe("desk");
    expect(items[4]).toEqual({ id: "hizmet", label: "Hizmet" });
  });
});

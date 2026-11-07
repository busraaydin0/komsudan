import { describe, expect, it } from "vitest";
import { CUSTOMER_PROVIDER_TABS, STAFF_TABS, tabBarIconKind, tabBarItems } from "./tabBarItems";

describe("TabBar maddeleri", () => {
  it("müşteri/veren sekmeleri değişmez; 4. Hizmet", () => {
    const items = tabBarItems(false);
    expect(items).toEqual(CUSTOMER_PROVIDER_TABS);
    expect(items.map((t) => t.id)).toEqual(["harita", "siparis", "mesaj", "hizmet", "hesap"]);
    expect(items[3]).toEqual({ id: "hizmet", label: "Hizmet" });
    expect(items.some((t) => t.id === "yonetim")).toBe(false);
  });

  it("yönetim rolleri yalnız Yönetim ve Hesap görür", () => {
    const items = tabBarItems(true);
    expect(items).toEqual(STAFF_TABS);
    expect(items.map((t) => t.id)).toEqual(["yonetim", "hesap"]);
    expect(items.some((t) => t.id === "harita" || t.id === "siparis" || t.id === "hizmet")).toBe(false);
    expect(items[0]).toEqual({ id: "yonetim", label: "Yönetim" });
    expect(items[0]?.label).not.toBe("Rotalar");
    expect(tabBarIconKind("yonetim")).toBe("admin");
    expect(tabBarIconKind("yonetim")).not.toBe("desk");
  });
});

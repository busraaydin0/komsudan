export type AppTab = "harita" | "siparis" | "mesaj" | "hizmet" | "yonetim" | "hesap";

export type TabBarItem = { id: AppTab; label: string };

export type TabBarIconKind = "map" | "bag" | "chat" | "desk" | "admin" | "account";

/** Müşteri ve hizmet veren: sıra sabit. */
export const CUSTOMER_PROVIDER_TABS: TabBarItem[] = [
  { id: "harita", label: "Harita" },
  { id: "siparis", label: "Sipariş" },
  { id: "mesaj", label: "Mesaj" },
  { id: "hizmet", label: "Hizmet" },
  { id: "hesap", label: "Hesap" },
];

/** Yönetim rolleri: keşif/sipariş yok; yalnız Yönetim + Hesap. */
export const STAFF_TABS: TabBarItem[] = [
  { id: "yonetim", label: "Yönetim" },
  { id: "hesap", label: "Hesap" },
];

export function tabBarItems(showAdmin: boolean): TabBarItem[] {
  if (!showAdmin) return CUSTOMER_PROVIDER_TABS;
  return STAFF_TABS;
}

export function tabBarIconKind(id: AppTab): TabBarIconKind {
  if (id === "harita") return "map";
  if (id === "siparis") return "bag";
  if (id === "mesaj") return "chat";
  if (id === "hizmet") return "desk";
  if (id === "yonetim") return "admin";
  return "account";
}

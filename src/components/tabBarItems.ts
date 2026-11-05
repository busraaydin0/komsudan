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

/** Hizmet Admini: 4. sekme Yönetim (Rotalar değil). Hizmet 5., Hesap 6. */
export function tabBarItems(showAdmin: boolean): TabBarItem[] {
  if (!showAdmin) return CUSTOMER_PROVIDER_TABS;
  return [
    CUSTOMER_PROVIDER_TABS[0]!,
    CUSTOMER_PROVIDER_TABS[1]!,
    CUSTOMER_PROVIDER_TABS[2]!,
    { id: "yonetim", label: "Yönetim" },
    CUSTOMER_PROVIDER_TABS[3]!,
    CUSTOMER_PROVIDER_TABS[4]!,
  ];
}

export function tabBarIconKind(id: AppTab): TabBarIconKind {
  if (id === "harita") return "map";
  if (id === "siparis") return "bag";
  if (id === "mesaj") return "chat";
  if (id === "hizmet") return "desk";
  if (id === "yonetim") return "admin";
  return "account";
}

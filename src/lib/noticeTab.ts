import type { AppTab } from "@/components/tabBarItems";

/** Bildirim tıklanınca hangi sekmeye gidilir. Gelen iş Hizmet’te. */
export function tabForNotice(type: string): AppTab {
  if (type === "nudge") return "harita";
  if (type === "order_message") return "mesaj";
  if (type === "order_created" || type === "order_respond_reminder") return "hizmet";
  if (type.startsWith("order_") || type === "pickup_code") return "siparis";
  return "hesap";
}

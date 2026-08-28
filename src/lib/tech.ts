import type {
  DropMethod,
  ProviderTech,
  TechDelivery,
  TechJob,
  TechKind,
  TechMaterials,
  TechPriceType,
  TechPriceUnit,
} from "./types";

export const TECH_KINDS: { id: TechKind; label: string }[] = [
  { id: "bilgisayar", label: "Bilgisayar" },
  { id: "telefon", label: "Telefon & Tablet" },
  { id: "yazici", label: "Yazıcı" },
  { id: "konsol", label: "Oyun Konsolu" },
  { id: "tv", label: "TV & Medya" },
  { id: "ag", label: "Ağ & İnternet" },
  { id: "diger", label: "Diğer" },
];

export const TECH_JOBS: { id: TechJob; label: string }[] = [
  { id: "kurulum", label: "Kurulum" },
  { id: "format", label: "Format" },
  { id: "yazilim", label: "Yazılım Kurulumu" },
  { id: "veri", label: "Veri Aktarımı" },
  { id: "bakim", label: "Bakım" },
  { id: "parca", label: "Parça Değişimi" },
  { id: "sorun", label: "Sorun Giderme" },
  { id: "diger", label: "Diğer" },
];

export const TECH_PRICE_TYPES: { id: TechPriceType; label: string }[] = [
  { id: "sabit", label: "Sabit fiyat" },
  { id: "baslangic", label: "Başlangıç fiyatı" },
  { id: "inceleme", label: "İnceleme sonrası fiyat" },
];

export const TECH_PRICE_UNITS: { id: TechPriceUnit; label: string; qty: string }[] = [
  { id: "cihaz", label: "Cihaz", qty: "cihaz" },
  { id: "islem", label: "İşlem", qty: "işlem" },
  { id: "saat", label: "Saat", qty: "saat" },
  { id: "paket", label: "Paket", qty: "paket" },
];

export const TECH_MATERIALS: { id: TechMaterials; label: string }[] = [
  { id: "provider", label: "Hizmet veren sağlar" },
  { id: "customer", label: "Müşteri sağlar" },
  { id: "included", label: "Fiyata dahil" },
  { id: "extra", label: "Fiyata dahil değil" },
  { id: "none", label: "Gerekli değil" },
];

export const TECH_DELIVERIES: { id: keyof TechDelivery; label: string }[] = [
  { id: "adres", label: "Hizmet verenin adresinden teslim" },
  { id: "nokta", label: "Belirlenen teslim noktası" },
  { id: "yakin", label: "Yakın noktada buluşma" },
  { id: "yerinde", label: "Yerinde hizmet" },
];

export function techKindLabel(id?: TechKind | null) {
  return TECH_KINDS.find((c) => c.id === id)?.label ?? "";
}

export function techJobLabel(id?: TechJob | null) {
  return TECH_JOBS.find((c) => c.id === id)?.label ?? "";
}

export function techPriceTypeLabel(id?: TechPriceType | null) {
  return TECH_PRICE_TYPES.find((c) => c.id === id)?.label ?? "";
}

export function techUnitMeta(id?: TechPriceUnit | null) {
  return TECH_PRICE_UNITS.find((u) => u.id === id) ?? TECH_PRICE_UNITS[0];
}

export function techMaterialsLabel(id?: TechMaterials | null) {
  return TECH_MATERIALS.find((p) => p.id === id)?.label ?? "";
}

export function techCanOrder(t?: Pick<ProviderTech, "price" | "priceType"> | null) {
  if (!t) return false;
  if (t.priceType === "inceleme" && t.price <= 0) return false;
  return t.price > 0;
}

export function techQtyBounds(
  t?: Pick<ProviderTech, "maxPerWeek"> | null,
  remaining?: number,
) {
  const min = 1;
  let max = Math.min(80, t?.maxPerWeek ?? 80);
  if (remaining && remaining > 0) max = Math.min(max, remaining);
  if (max < min) max = min;
  return { min, max };
}

export function techLeadLabel(t?: Pick<ProviderTech, "leadHours" | "leadDays"> | null) {
  if (!t) return "";
  if (t.leadHours != null && t.leadHours >= 0) {
    if (t.leadHours === 0) return "aynı gün";
    return t.leadHours === 1 ? "1 saat" : `${t.leadHours} saat`;
  }
  if (t.leadDays == null || t.leadDays < 0) return "";
  if (t.leadDays === 0) return "aynı gün";
  return t.leadDays === 1 ? "1 gün" : `${t.leadDays} gün`;
}

export function dropsForTech(
  tech: Pick<ProviderTech, "delivery"> | undefined,
  providerDrops: DropMethod[],
) {
  if (!tech) return providerDrops;
  const want: DropMethod[] = [];
  if (tech.delivery.nokta) want.push("nokta");
  if (tech.delivery.adres || tech.delivery.yakin || tech.delivery.yerinde) want.push("kapi");
  const hit = want.filter((d) => providerDrops.includes(d));
  return hit.length ? hit : want.length ? want : providerDrops;
}

export function techDropLabel(d: DropMethod, delivery?: TechDelivery) {
  if (d === "nokta") return "Belirlenen teslim noktası";
  if (!delivery) return "Kapı";
  const bits: string[] = [];
  if (delivery.adres) bits.push("adresinden teslim");
  if (delivery.yakin) bits.push("yakın buluşma");
  if (delivery.yerinde) bits.push("yerinde hizmet");
  if (!bits.length) return "Kapı";
  return bits.join(" / ").replace(/^./, (c) => c.toUpperCase());
}

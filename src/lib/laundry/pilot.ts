import type { LngLat } from "@/lib/types";

/** Müşteri / onboarding UI başlığı */
export const LAUNDRY_PRODUCT_NAME = "Çamaşır Yıkama";

export const PILOT_AREA = {
  id: "cankaya-cukurambar",
  city: "Ankara",
  label: "Çankaya · Çukurambar",
  center: { lng: 32.80286, lat: 39.90313 } satisfies LngLat,
  zoom: 15.7,
  radiusKm: 3,
  bounds: {
    west: 32.786,
    south: 39.894,
    east: 32.815,
    north: 39.913,
  },
};

export const PILOT_NEIGHBORHOODS: { name: string; loc: LngLat }[] = [
  { name: "Çukurambar", loc: { lng: 32.80286, lat: 39.90313 } },
  { name: "Söğütözü", loc: { lng: 32.7902, lat: 39.9076 } },
  { name: "Kızılırmak", loc: { lng: 32.8091, lat: 39.9055 } },
];

export function trustLabel(tier: "yeni" | "kurucu" | "guvenilir"): string {
  if (tier === "kurucu") return "Kurucu";
  if (tier === "guvenilir") return "Kapı açık";
  return "Yeni komşu";
}

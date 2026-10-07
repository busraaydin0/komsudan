import type { ServicePackage } from "@/lib/types";

export const LAUNDRY_PACKAGE_IDS = ["yikama", "katlama", "tam"] as const;
export type LaundryPackageId = (typeof LAUNDRY_PACKAGE_IDS)[number];
export type OrderPackageId = LaundryPackageId;

export const LAUNDRY_PACKAGES: ServicePackage[] = [
  { id: "yikama", title: "Sadece yıkama", blurb: "Yıka, kurut, poşetle", pricePerPiece: 9 },
  { id: "katlama", title: "Yıkama + katlama", blurb: "Düzenli katlanmış teslim", pricePerPiece: 13 },
  { id: "tam", title: "Yıkama + ütü + katlama", blurb: "Tam paket", pricePerPiece: 18 },
];

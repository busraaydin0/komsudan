import type { OrderStatus, PackageId } from "./types";

export function nextStatus(current: OrderStatus, packageId: PackageId): OrderStatus | null {
  if (current === "onay_bekliyor") return "teslim_alindi";
  if (current === "teslim_alindi") return "yikaniyor";
  if (current === "yikaniyor") return packageId === "tam" ? "utuleniyor" : "hazir";
  if (current === "utuleniyor") return "hazir";
  if (current === "hazir") return "teslim_edildi";
  return null;
}

export function canCancel(status: OrderStatus) {
  return status === "onay_bekliyor" || status === "teslim_alindi";
}

export function canAddPhotos(status: OrderStatus) {
  return status !== "onay_bekliyor" && status !== "iptal";
}

export function canReview(status: OrderStatus) {
  return status === "teslim_edildi";
}

export const PICKUP_CODE_LEN = 6;
export const PICKUP_CODE_TRIES = 5;

export function trackSteps(packageId: PackageId): OrderStatus[] {
  if (packageId === "tam") {
    return ["onay_bekliyor", "teslim_alindi", "yikaniyor", "utuleniyor", "hazir", "teslim_edildi"];
  }
  return ["onay_bekliyor", "teslim_alindi", "yikaniyor", "hazir", "teslim_edildi"];
}

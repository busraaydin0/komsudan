import type { ApiLifecycle, OrderStatus, PackageId } from "./types";

export const LIFECYCLES: ApiLifecycle[] = [
  "pending",
  "accepted",
  "dropped_off",
  "washing",
  "ironing",
  "ready",
  "completed",
  "rejected",
  "cancelled",
  "disputed",
];

export const LIFECYCLE_FROM_PILOT: Record<OrderStatus, ApiLifecycle> = {
  onay_bekliyor: "pending",
  teslim_alindi: "accepted",
  yikaniyor: "washing",
  utuleniyor: "ironing",
  hazir: "ready",
  teslim_edildi: "completed",
  iptal: "cancelled",
};

export const ALLOWED_TRANSITIONS: Record<ApiLifecycle, ApiLifecycle[]> = {
  pending: ["accepted", "rejected", "dropped_off"],
  accepted: ["dropped_off", "washing", "cancelled"],
  dropped_off: ["washing", "cancelled"],
  washing: ["ironing", "ready"],
  ironing: ["ready"],
  ready: ["completed"],
  completed: [],
  rejected: [],
  cancelled: [],
  disputed: [],
};

export function isLifecycle(value: string | null | undefined): value is ApiLifecycle {
  return Boolean(value && (LIFECYCLES as string[]).includes(value));
}

export function toLifecycle(status: OrderStatus): ApiLifecycle {
  return LIFECYCLE_FROM_PILOT[status];
}

export function lifecycleOf(status: OrderStatus, stored?: string | null): ApiLifecycle {
  if (isLifecycle(stored)) return stored;
  return toLifecycle(status);
}

export function pilotFromLifecycle(next: ApiLifecycle): OrderStatus {
  if (next === "pending") return "onay_bekliyor";
  if (next === "accepted" || next === "dropped_off") return "teslim_alindi";
  if (next === "washing") return "yikaniyor";
  if (next === "ironing") return "utuleniyor";
  if (next === "ready") return "hazir";
  if (next === "completed") return "teslim_edildi";
  return "iptal";
}

/** Çamaşır / delivery geçişleri. Sipariş servisi `fulfillment.ts` üzerinden çağırır. */
export function canTransition(from: ApiLifecycle, to: ApiLifecycle, packageId: PackageId) {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) return false;
  if (to === "ironing" && packageId !== "tam") return false;
  if (from === "washing" && to === "ready" && packageId === "tam") return false;
  if (from === "washing" && to === "ironing" && packageId !== "tam") return false;
  return true;
}

export function nextStatus(
  current: OrderStatus,
  packageId: PackageId | "davet" | "dikis",
  food = false,
): OrderStatus | null {
  if (food || packageId === "davet" || packageId === "dikis") {
    if (current === "onay_bekliyor") return "teslim_alindi";
    if (current === "teslim_alindi") return "hazir";
    if (current === "hazir") return "teslim_edildi";
    return null;
  }
  if (current === "onay_bekliyor") return "teslim_alindi";
  if (current === "teslim_alindi") return "yikaniyor";
  if (current === "yikaniyor") return packageId === "tam" ? "utuleniyor" : "hazir";
  if (current === "utuleniyor") return "hazir";
  if (current === "hazir") return "teslim_edildi";
  return null;
}

export function canCancel(status: OrderStatus) {
  return status === "onay_bekliyor";
}

export function canAddPhotos(status: OrderStatus) {
  return status !== "onay_bekliyor" && status !== "iptal";
}

export function canReview(status: OrderStatus) {
  return status === "teslim_edildi";
}

export const PICKUP_CODE_LEN = 6;
export const PICKUP_CODE_TRIES = 5;

export function trackSteps(packageId: PackageId | "davet" | "dikis", food = false): OrderStatus[] {
  if (food || packageId === "davet" || packageId === "dikis") {
    return ["onay_bekliyor", "teslim_alindi", "hazir", "teslim_edildi"];
  }
  if (packageId === "tam") {
    return ["onay_bekliyor", "teslim_alindi", "yikaniyor", "utuleniyor", "hazir", "teslim_edildi"];
  }
  return ["onay_bekliyor", "teslim_alindi", "yikaniyor", "hazir", "teslim_edildi"];
}

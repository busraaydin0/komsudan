import { isCatalogCategoryId } from "@/lib/categories/registry";
import type { ApiLifecycle, FulfillmentType, PackageId } from "@/lib/types";
import { canTransition as deliveryCanTransition } from "@/lib/status";
import type { FulfillmentMode } from "@/lib/db/categories";
import { isHomeVisitStatus, type HomeVisitStatus } from "@/lib/homeVisit";

export type FulfillmentStrategy = {
  mode: FulfillmentMode;
  /** false: kategori henüz sipariş kabul etmez (Faz 8). */
  ready: boolean;
  canTransition: (from: ApiLifecycle, to: ApiLifecycle, packageId: PackageId) => boolean;
};

/** Mevcut çamaşır akışı. PWA davranışı buradan değişmez. */
export const deliveryStrategy: FulfillmentStrategy = {
  mode: "delivery",
  ready: true,
  canTransition: deliveryCanTransition,
};

/** Davet: yıkama/ütü yok. pending → accepted → ready → completed. */
const FOOD_TRANSITIONS: Record<ApiLifecycle, ApiLifecycle[]> = {
  pending: ["accepted", "rejected"],
  accepted: ["ready", "cancelled"],
  dropped_off: [],
  washing: [],
  ironing: [],
  ready: ["completed"],
  completed: [],
  rejected: [],
  cancelled: [],
  disputed: [],
};

export const foodStrategy: FulfillmentStrategy = {
  mode: "delivery",
  ready: true,
  canTransition: (from, to) => FOOD_TRANSITIONS[from].includes(to),
};

export {
  HOME_VISIT_STATUSES,
  canHomeVisitTransition,
  homeVisitNext,
  type HomeVisitAction,
  type HomeVisitActor,
  type HomeVisitStatus,
} from "@/lib/homeVisit";

/**
 * Eve giden hizmet. Geçişler `homeVisit.ts` (rol whitelist).
 * ready false: sipariş kabulü kapalı — manuel onay olmadan açılmaz.
 */
export const homeVisitStrategy: FulfillmentStrategy = {
  mode: "home_visit",
  ready: false,
  canTransition: () => false,
};

export function strategyFor(
  mode: FulfillmentMode,
  categoryId?: string,
  fulfillmentType?: FulfillmentType | string | null,
): FulfillmentStrategy {
  if (fulfillmentType === "home_visit" || mode === "home_visit") return homeVisitStrategy;
  if (isCatalogCategoryId(categoryId)) {
    return foodStrategy;
  }
  return deliveryStrategy;
}

export function isHomeVisitFulfillment(value: string | null | undefined) {
  return value === "home_visit";
}

/** home_visit siparişte stored lifecycle HomeVisitStatus; dropoff ApiLifecycle. */
export function orderLifecycleOf(row: {
  fulfillment_type?: string | null;
  lifecycle?: string | null;
}) {
  if (row.fulfillment_type === "home_visit" && isHomeVisitStatus(row.lifecycle)) {
    return row.lifecycle as HomeVisitStatus;
  }
  return row.lifecycle ?? "pending";
}

import type { ApiLifecycle, PackageId } from "@/lib/types";
import { canTransition as deliveryCanTransition } from "@/lib/status";
import type { FulfillmentMode } from "@/lib/db/categories";

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

/**
 * Eve giden hizmet iskeleti. Adlar Faz 8'de netleşir; şu an geçiş yok.
 * pending → confirmed → on_the_way → in_progress → completed
 * pending → rejected; confirmed/on_the_way → cancelled
 */
export const HOME_VISIT_SKETCH = {
  pending: ["confirmed", "rejected"],
  confirmed: ["on_the_way", "cancelled"],
  on_the_way: ["in_progress", "cancelled"],
  in_progress: ["completed"],
  completed: [] as string[],
  rejected: [] as string[],
  cancelled: [] as string[],
} as const;

export const homeVisitStrategy: FulfillmentStrategy = {
  mode: "home_visit",
  ready: false,
  canTransition: () => false,
};

export function strategyFor(mode: FulfillmentMode): FulfillmentStrategy {
  return mode === "home_visit" ? homeVisitStrategy : deliveryStrategy;
}

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

export function strategyFor(mode: FulfillmentMode, categoryId?: string): FulfillmentStrategy {
  if (mode === "home_visit") return homeVisitStrategy;
  if (categoryId === "davet" || categoryId === "dikis" || categoryId === "tamir" || categoryId === "teknoloji" || categoryId === "araba" || categoryId === "kurye" || categoryId === "bahce" || categoryId === "kargo") {
    return foodStrategy;
  }
  return deliveryStrategy;
}

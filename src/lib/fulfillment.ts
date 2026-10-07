import type { ApiLifecycle, PackageId } from "@/lib/types";
import { canTransition as deliveryCanTransition } from "@/lib/status";
import type { FulfillmentMode } from "@/lib/db/categories";

export type FulfillmentStrategy = {
  mode: FulfillmentMode;
  ready: boolean;
  canTransition: (from: ApiLifecycle, to: ApiLifecycle, packageId: PackageId) => boolean;
};

/** Çamaşır teslim (kapı / nokta). PWA davranışı buradan değişmez. */
export const deliveryStrategy: FulfillmentStrategy = {
  mode: "delivery",
  ready: true,
  canTransition: deliveryCanTransition,
};

export function strategyFor(
  _mode?: FulfillmentMode,
  _categoryId?: string,
  _fulfillmentType?: string | null,
): FulfillmentStrategy {
  return deliveryStrategy;
}

import type { ApiLifecycle, PackageId } from "@/lib/types";
import { canTransition as deliveryCanTransition } from "@/lib/status";
import type { FulfillmentMode } from "@/lib/db/categories";

export type FulfillmentStrategy = {
  mode: FulfillmentMode;
  ready: boolean;
  canTransition: (from: ApiLifecycle, to: ApiLifecycle, packageId: PackageId) => boolean;
};

/** Çamaşır teslim (kapı). PWA davranışı buradan değişmez. */
export const deliveryStrategy: FulfillmentStrategy = {
  mode: "delivery",
  ready: true,
  canTransition: deliveryCanTransition,
};

export function strategyFor(
  mode?: FulfillmentMode,
  categoryId?: string,
  fulfillmentType?: string | null,
): FulfillmentStrategy {
  void mode;
  void categoryId;
  void fulfillmentType;
  return deliveryStrategy;
}

import type { PackageId } from "@/lib/types";
import { canTransition as deliveryCanTransition, type OrderStatusId } from "@/lib/status";
import type { FulfillmentMode } from "@/lib/db/categories";

export type FulfillmentStrategy = {
  mode: FulfillmentMode;
  ready: boolean;
  canTransition: (from: OrderStatusId, to: OrderStatusId, packageId: PackageId) => boolean;
};

/** Çamaşır teslim (kapı). PWA davranışı buradan değişmez. */
export const deliveryStrategy: FulfillmentStrategy = {
  mode: "delivery",
  ready: true,
  canTransition: (from, to, packageId) => deliveryCanTransition(from, to, "admin", { packageId }),
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

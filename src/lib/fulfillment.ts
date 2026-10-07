import type { OrderStatusId, PackageId } from "@/lib/status";
import { canTransition as laundryCanTransition } from "@/lib/status";

export type FulfillmentStrategy = {
  mode: "delivery";
  ready: boolean;
  canTransition: (from: OrderStatusId, to: OrderStatusId, packageId: PackageId) => boolean;
};

export const laundryDeliveryStrategy: FulfillmentStrategy = {
  mode: "delivery",
  ready: true,
  canTransition: (from, to, packageId) => laundryCanTransition(from, to, "admin", { packageId }),
};

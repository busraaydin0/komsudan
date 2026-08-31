import type { FulfillmentType } from "@/lib/types";

const FULL_ADDRESS_AFTER = new Set([
  "confirmed",
  "on_the_way",
  "in_progress",
  "completed",
]);

export type VisitAddressView = {
  district: string | null;
  neighborhood: string | null;
  /** Tam satır. Provider + pending’de null. */
  address: string | null;
};

export type VisitAddressViewer = "customer" | "provider" | "admin";

/** Tam adres yalnız home_visit ve confirmed+ provider’a. Route’ta değil, burada. */
export function visitAddressForViewer(args: {
  fulfillmentType: FulfillmentType | string | null | undefined;
  lifecycle: string | null | undefined;
  viewer: VisitAddressViewer;
  district: string | null | undefined;
  neighborhood: string | null | undefined;
  address: string | null | undefined;
}): VisitAddressView {
  const type = args.fulfillmentType === "home_visit" ? "home_visit" : "dropoff";
  if (type !== "home_visit") {
    return { district: null, neighborhood: null, address: null };
  }

  const district = args.district?.trim() || null;
  const neighborhood = args.neighborhood?.trim() || null;
  const address = args.address?.trim() || null;
  const coarse = { district, neighborhood, address: null as string | null };

  if (args.viewer === "customer" || args.viewer === "admin") {
    return { district, neighborhood, address };
  }

  const life = args.lifecycle ?? "pending";
  if (FULL_ADDRESS_AFTER.has(life)) {
    return { district, neighborhood, address };
  }
  return coarse;
}

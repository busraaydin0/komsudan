import { addonKey, type LaundrySize, type OrderAddonLine } from "./laundryModel";
import { getAddonPrice, getSizePrice } from "./db/providerPrices";
import type { PackageId } from "./types";
import { quoteLaundry, type LaundryQuote } from "./pricing";

export function quoteForProviderOrder(
  providerId: string,
  packageId: PackageId,
  size: LaundrySize,
  addons: OrderAddonLine[],
  express: boolean,
  loyaltyRate = 0,
): LaundryQuote {
  const sizePrice = getSizePrice(providerId, packageId, size);
  if (sizePrice == null) {
    throw new Error("SIZE_PRICE");
  }
  const addonUnitPrices: Record<string, number> = {};
  for (const a of addons) {
    if (a.qty < 1) continue;
    const key = addonKey(a.addon, a.variant);
    if (addonUnitPrices[key] != null) continue;
    const p = getAddonPrice(providerId, a.addon, a.variant);
    if (p == null) throw new Error(`ADDON_PRICE:${key}`);
    addonUnitPrices[key] = p;
  }
  return quoteLaundry({
    packageId,
    size,
    addons,
    express,
    loyaltyRate,
    sizePrice,
    addonUnitPrices,
  });
}

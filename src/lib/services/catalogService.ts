import { addonKey, EXTRA_MACHINE_SIZES, scaledSizePrice, type LaundrySize } from "@/lib/laundryModel";
import { db } from "@/lib/db/client";
import { toProvider } from "@/lib/db/catalog";
import {
  listAddonPricesForProviders,
  listSizePricesForProviders,
  type ProviderAddonPriceRow,
  type ProviderPriceRow,
} from "@/lib/db/providerPrices";
import type { LaundryPriceGrid, Provider } from "@/lib/types";
import { workPhotosForProvider } from "@/lib/services/photoService";
import { ratingBreakdown, reviewsForProvider } from "@/lib/services/reviewService";
import { listRatingAggregates, roundRating } from "@/lib/db/reviews";
import { listAvatarUrls } from "@/lib/db/providers";
import { capacitySummariesForProviders } from "@/lib/services/capacityService";

type PriceBundle = {
  sizeByProvider: Map<string, ProviderPriceRow[]>;
  addonByProvider: Map<string, ProviderAddonPriceRow[]>;
};

function groupPrices(sizeRows: ProviderPriceRow[], addonRows: ProviderAddonPriceRow[]): PriceBundle {
  const sizeByProvider = new Map<string, ProviderPriceRow[]>();
  for (const row of sizeRows) {
    const list = sizeByProvider.get(row.provider_id) ?? [];
    list.push(row);
    sizeByProvider.set(row.provider_id, list);
  }
  const addonByProvider = new Map<string, ProviderAddonPriceRow[]>();
  for (const row of addonRows) {
    const list = addonByProvider.get(row.provider_id) ?? [];
    list.push(row);
    addonByProvider.set(row.provider_id, list);
  }
  return { sizeByProvider, addonByProvider };
}

function laundryPricesFromRows(
  p: Provider,
  sizeRows: ProviderPriceRow[],
  addonRows: ProviderAddonPriceRow[],
): LaundryPriceGrid {
  const sizes: LaundryPriceGrid["sizes"] = {};
  for (const pack of p.packages) {
    const rows = sizeRows.filter((r) => r.package_id === pack.id);
    const stored = Object.fromEntries(rows.map((r) => [r.size, r.price])) as Partial<
      Record<LaundrySize, number>
    >;
    const orta = stored.orta;
    if (orta != null) {
      for (const extra of EXTRA_MACHINE_SIZES) {
        if (stored[extra] == null) stored[extra] = scaledSizePrice(orta, extra);
      }
    }
    sizes[pack.id] = stored;
  }
  const addons: Record<string, number> = {};
  for (const row of addonRows) {
    addons[addonKey(row.addon, row.variant)] = row.price;
  }
  return { sizes, addons };
}

function ratingFromAggregate(
  providerId: string,
  seed: { rating: number; reviews: number },
  aggregates: Map<string, { sum: number; count: number }>,
): { rating: number; reviews: number } {
  const hit = aggregates.get(providerId);
  if (!hit || hit.count === 0) {
    return seed.reviews > 0 ? seed : { rating: 0, reviews: 0 };
  }
  return { rating: roundRating(hit.sum, hit.count), reviews: hit.count };
}

function hydrate(
  p: Provider,
  avatars: Record<string, string>,
  full: boolean,
  ctx: {
    prices: PriceBundle;
    ratings: Map<string, { sum: number; count: number }>;
    capacities: Map<string, Provider["capacity"]>;
  },
): Provider {
  const sizeRows = ctx.prices.sizeByProvider.get(p.id) ?? [];
  const addonRows = ctx.prices.addonByProvider.get(p.id) ?? [];
  const live = ratingFromAggregate(p.id, { rating: p.rating, reviews: p.reviews }, ctx.ratings);
  return {
    ...p,
    rating: live.rating,
    reviews: live.reviews,
    ratingBreakdown: full ? ratingBreakdown(p.id, live) : p.ratingBreakdown,
    avatarUrl: avatars[p.id] || p.avatarUrl || null,
    workPhotos: full ? workPhotosForProvider(p.id, 12) : (p.workPhotos ?? []),
    recentReviews: full ? reviewsForProvider(p.id).slice(0, 6) : (p.recentReviews ?? []),
    laundryPrices: laundryPricesFromRows(p, sizeRows, addonRows),
    capacity: ctx.capacities.get(p.id) ?? p.capacity,
  };
}

export function getProvider(id: string): Provider | undefined {
  const row = db()
    .prepare("SELECT id, payload FROM providers WHERE id = ?")
    .get(id) as { id: string; payload: string } | undefined;
  if (!row) return undefined;
  const p = toProvider(row);
  const ids = [id];
  const prices = groupPrices(listSizePricesForProviders(ids), listAddonPricesForProviders(ids));
  const ratings = new Map(listRatingAggregates().map((r) => [r.provider_id, { sum: r.sum, count: r.count }]));
  const capacities = capacitySummariesForProviders(ids);
  return hydrate(p, listAvatarUrls(), true, { prices, ratings, capacities });
}

export function providersLive(): Provider[] {
  const avatars = listAvatarUrls();
  const rows = db()
    .prepare(`SELECT id, payload FROM providers`)
    .all() as { id: string; payload: string }[];
  const providers = rows.map((row) => toProvider(row));
  const ids = providers.map((p) => p.id);
  const prices = groupPrices(listSizePricesForProviders(ids), listAddonPricesForProviders(ids));
  const ratings = new Map(listRatingAggregates().map((r) => [r.provider_id, { sum: r.sum, count: r.count }]));
  const capacities = capacitySummariesForProviders(ids);
  const ctx = { prices, ratings, capacities };
  return providers
    .map((p) => hydrate(p, avatars, false, ctx))
    .filter((p) => p.capacity?.configured);
}

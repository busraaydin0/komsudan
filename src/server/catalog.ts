import { clampPublicCategoryIds } from "@/lib/categories/registry";
import { addonKey } from "@/lib/laundryModel";
import {
  ensureProviderPriceGrid,
  listAddonPrices,
  listSizePrices,
} from "@/lib/db/providerPrices";
import { db, toProvider } from "./db";
import type { LaundryPriceGrid, Provider } from "@/lib/types";
import { workPhotosForProvider } from "./photos";
import { ratingBreakdown, ratingForProvider, reviewsForProvider } from "@/lib/services/reviewService";
import { listAvatarUrls } from "@/lib/db/providers";

function laundryPricesForProvider(p: Provider): LaundryPriceGrid {
  ensureProviderPriceGrid(p.id);
  const sizes: LaundryPriceGrid["sizes"] = {};
  for (const pack of p.packages) {
    const rows = listSizePrices(p.id, pack.id);
    sizes[pack.id] = Object.fromEntries(rows.map((r) => [r.size, r.price]));
  }
  const addons: Record<string, number> = {};
  for (const row of listAddonPrices(p.id)) {
    addons[addonKey(row.addon, row.variant)] = row.price;
  }
  return { sizes, addons };
}

function hydrate(p: Provider, avatars: Record<string, string>, full: boolean): Provider {
  const live = ratingForProvider(p.id, { rating: p.rating, reviews: p.reviews });
  return {
    ...p,
    rating: live.rating,
    reviews: live.reviews,
    ratingBreakdown: full ? ratingBreakdown(p.id, live) : p.ratingBreakdown,
    avatarUrl: avatars[p.id] || p.avatarUrl || null,
    workPhotos: full ? workPhotosForProvider(p.id, 12) : (p.workPhotos ?? []),
    recentReviews: full ? reviewsForProvider(p.id).slice(0, 6) : (p.recentReviews ?? []),
    laundryPrices: laundryPricesForProvider(p),
  };
}

export function getProvider(id: string): Provider | undefined {
  const row = db()
    .prepare("SELECT id, payload, remaining, category_id FROM providers WHERE id = ?")
    .get(id) as { id: string; payload: string; remaining: number; category_id: string | null } | undefined;
  return row ? hydrate(toProvider(row), listAvatarUrls(), true) : undefined;
}

export function providersLive(categoryIds?: string[]): Provider[] {
  const cats = clampPublicCategoryIds(categoryIds);
  const avatars = listAvatarUrls();
  const inList = cats.length
    ? `WHERE COALESCE(category_id, 'camasir') IN (${cats.map((_, i) => `@c${i}`).join(",")})`
    : "";
  const params: Record<string, string> = {};
  cats.forEach((id, i) => {
    params[`c${i}`] = id;
  });
  const stmt = db().prepare(
    `SELECT id, payload, remaining, category_id FROM providers ${inList}`,
  );
  const rows = (cats.length ? stmt.all(params) : stmt.all()) as {
    id: string;
    payload: string;
    remaining: number;
    category_id: string | null;
  }[];
  return rows.map((row) => hydrate(toProvider(row), avatars, false));
}

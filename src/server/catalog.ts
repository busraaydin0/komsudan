import { db, toDrop, toProvider } from "./db";
import type { DropPoint, Provider } from "@/lib/types";
import { workPhotosForProvider } from "./photos";
import { ratingFor, reviewsForProvider } from "./reviews";

function hydrate(p: Provider): Provider {
  const live = ratingFor(p.id, p.rating, p.reviews);
  return {
    ...p,
    rating: live.rating,
    reviews: live.reviews,
    workPhotos: workPhotosForProvider(p.id, 12),
    recentReviews: reviewsForProvider(p.id).slice(0, 6),
  };
}

export function getProvider(id: string): Provider | undefined {
  const row = db()
    .prepare("SELECT id, payload, remaining FROM providers WHERE id = ?")
    .get(id) as { id: string; payload: string; remaining: number } | undefined;
  return row ? hydrate(toProvider(row)) : undefined;
}

export function listDrops(): DropPoint[] {
  return (db().prepare("SELECT payload FROM drop_points").all() as { payload: string }[]).map(toDrop);
}

export function getDrop(id: string): DropPoint | undefined {
  const row = db()
    .prepare("SELECT payload FROM drop_points WHERE id = ?")
    .get(id) as { payload: string } | undefined;
  return row ? toDrop(row) : undefined;
}

export function providersLive(): Provider[] {
  return (
    db().prepare("SELECT id, payload, remaining FROM providers").all() as {
      id: string;
      payload: string;
      remaining: number;
    }[]
  ).map((row) => hydrate(toProvider(row)));
}

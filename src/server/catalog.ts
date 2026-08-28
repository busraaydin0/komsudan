import { db, toDrop, toProvider } from "./db";
import type { DropPoint, Provider } from "@/lib/types";
import { workPhotosForProvider } from "./photos";
import { ratingFor, reviewsForProvider } from "./reviews";
import { listAvatarUrls } from "@/lib/db/providers";

function hydrate(p: Provider, avatars: Record<string, string>): Provider {
  const live = ratingFor(p.id, p.rating, p.reviews);
  return {
    ...p,
    rating: live.rating,
    reviews: live.reviews,
    avatarUrl: avatars[p.id] || p.avatarUrl || null,
    workPhotos: workPhotosForProvider(p.id, 12),
    recentReviews: reviewsForProvider(p.id).slice(0, 6),
  };
}

export function getProvider(id: string): Provider | undefined {
  const row = db()
    .prepare("SELECT id, payload, remaining, category_id FROM providers WHERE id = ?")
    .get(id) as { id: string; payload: string; remaining: number; category_id: string | null } | undefined;
  return row ? hydrate(toProvider(row), listAvatarUrls()) : undefined;
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

export function providersLive(categoryIds?: string[]): Provider[] {
  const cats = categoryIds?.filter(Boolean) ?? [];
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
  return rows.map((row) => hydrate(toProvider(row), avatars));
}

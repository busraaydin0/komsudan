import type { DropPoint, Provider } from "@/lib/types";

export function toProvider(row: {
  id: string;
  payload: string;
  remaining: number;
  category_id?: string | null;
}): Provider {
  const p = JSON.parse(row.payload) as Provider;
  return {
    ...p,
    remaining: row.remaining,
    workPhotos: p.workPhotos ?? [],
    avatarUrl: p.avatarUrl ?? null,
    recentReviews: p.recentReviews ?? [],
    categoryId: row.category_id ?? p.categoryId ?? "camasir",
  };
}

export function toDrop(row: { payload: string }): DropPoint {
  return JSON.parse(row.payload) as DropPoint;
}

import type { DropPoint, Provider } from "@/lib/types";

export function toProvider(row: { id: string; payload: string; remaining: number }): Provider {
  const p = JSON.parse(row.payload) as Provider;
  return {
    ...p,
    remaining: row.remaining,
    workPhotos: p.workPhotos ?? [],
    recentReviews: p.recentReviews ?? [],
  };
}

export function toDrop(row: { payload: string }): DropPoint {
  return JSON.parse(row.payload) as DropPoint;
}

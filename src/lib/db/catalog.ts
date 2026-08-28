import type { DropPoint, Provider } from "@/lib/types";
import { listProducts, toPublicProduct } from "./products";

export function toProvider(row: {
  id: string;
  payload: string;
  remaining: number;
  category_id?: string | null;
}): Provider {
  const p = JSON.parse(row.payload) as Provider;
  const categoryId = row.category_id ?? p.categoryId ?? "camasir";
  const products = listProducts(p.id).map(toPublicProduct);
  return {
    ...p,
    remaining: row.remaining,
    workPhotos: p.workPhotos ?? [],
    avatarUrl: p.avatarUrl ?? null,
    recentReviews: p.recentReviews ?? [],
    categoryId,
    products: products.length > 0 ? products : (p.products ?? []),
  };
}

export function toDrop(row: { payload: string }): DropPoint {
  return JSON.parse(row.payload) as DropPoint;
}

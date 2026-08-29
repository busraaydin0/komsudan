import { randomUUID } from "node:crypto";
import { canReview } from "@/lib/status";
import type { OrderStatus, Review } from "@/lib/types";
import { getOrderRow } from "@/lib/db/orders";
import {
  aggregateForProvider,
  getReviewByOrderId,
  insertReview,
  listReviewsForProvider,
  roundRating,
  writeProfileRating,
  type ReviewRow,
} from "@/lib/db/reviews";
import { photosForReview } from "@/server/photos";
import { ApiError } from "@/server/rules";

export type ProviderRating = { rating: number; reviews: number };

function toReview(row: ReviewRow): Review {
  return {
    id: row.id,
    providerId: row.provider_id,
    orderId: row.order_id,
    rating: row.rating,
    body: row.body,
    author: row.author,
    createdAt: row.created_at,
    photos: photosForReview(row.id),
  };
}

export function ratingForProvider(
  providerId: string,
  seed?: ProviderRating,
): ProviderRating {
  const { sum, count } = aggregateForProvider(providerId);
  if (count === 0) return seed ?? { rating: 0, reviews: 0 };
  return { rating: roundRating(sum, count), reviews: count };
}

export function reviewsForProvider(providerId: string): Review[] {
  return listReviewsForProvider(providerId).map(toReview);
}

export function reviewForOrder(orderId: string): Review | null {
  const row = getReviewByOrderId(orderId);
  return row ? toReview(row) : null;
}

export function createReview(
  orderId: string,
  input: { rating: number; body: string },
  author: string,
): Review {
  const order = getOrderRow(orderId);
  if (!order) throw new ApiError(404, "Sipariş yok.");
  if (!canReview(order.status as OrderStatus)) {
    throw new ApiError(409, "Yorum ancak teslimden sonra.");
  }
  if (getReviewByOrderId(orderId)) throw new ApiError(409, "Bu siparişe yorum zaten var.");

  const rating = Math.round(input.rating);
  if (rating < 1 || rating > 5) throw new ApiError(400, "Puan 1–5 olmalı.");

  const body = input.body.trim().slice(0, 400);
  if (body.length < 8) throw new ApiError(400, "Yorum en az birkaç cümle olsun.");

  const authorName = author.trim().slice(0, 40) || "Komşu";
  const now = new Date().toISOString();
  const id = `rev-${randomUUID().slice(0, 8)}`;

  try {
    insertReview({
      id,
      order_id: orderId,
      provider_id: order.provider_id,
      rating,
      body,
      author: authorName,
      created_at: now,
    });
  } catch {
    throw new ApiError(409, "Bu siparişe yorum zaten var.");
  }

  writeProfileRating(order.provider_id);
  return reviewForOrder(orderId)!;
}

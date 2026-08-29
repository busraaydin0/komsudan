import { randomUUID } from "node:crypto";
import { canReview } from "@/lib/status";
import type { OrderStatus, RatingBreakdown, Review } from "@/lib/types";
import { bayesianRating } from "@/lib/rating";
import { getOrderRow } from "@/lib/db/orders";
import {
  aggregateDimensions,
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

export type ReviewWriteInput = {
  rating: number;
  body: string;
  quality?: number | null;
  timeliness?: number | null;
  communication?: number | null;
  wouldRepeat?: boolean | null;
};

export type ReviewSignals = RatingBreakdown & { rankScore: number };

function toScore(row: ReviewRow, key: "quality" | "timeliness" | "communication"): number | null {
  const value = row[key];
  return value == null ? null : value;
}

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
    quality: toScore(row, "quality"),
    timeliness: toScore(row, "timeliness"),
    communication: toScore(row, "communication"),
    wouldRepeat: row.would_repeat == null ? null : Boolean(row.would_repeat),
  };
}

function optionalStar(value: number | null | undefined, label: string): number | null {
  if (value == null) return null;
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < 1 || n > 5) {
    throw new ApiError(400, `${label} 1–5 olmalı.`);
  }
  return n;
}

export function ratingForProvider(
  providerId: string,
  seed?: ProviderRating,
): ProviderRating {
  const { sum, count } = aggregateForProvider(providerId);
  if (count === 0) return seed ?? { rating: 0, reviews: 0 };
  return { rating: roundRating(sum, count), reviews: count };
}

export function ratingBreakdown(providerId: string, seed?: ProviderRating): RatingBreakdown {
  const agg = aggregateDimensions(providerId);
  if (agg.count === 0) {
    return {
      overall: seed?.rating ?? 0,
      count: seed?.reviews ?? 0,
      quality: null,
      timeliness: null,
      communication: null,
      repeatRate: null,
    };
  }
  return {
    overall: roundRating(agg.sum, agg.count),
    count: agg.count,
    quality: agg.quality == null ? null : roundRating(agg.quality, 1),
    timeliness: agg.timeliness == null ? null : roundRating(agg.timeliness, 1),
    communication: agg.communication == null ? null : roundRating(agg.communication, 1),
    repeatRate: agg.repeatAnswered === 0 ? null : Math.round((agg.repeatYes / agg.repeatAnswered) * 100) / 100,
  };
}

export function reviewSignalsForProvider(providerId: string, seed?: ProviderRating): ReviewSignals {
  const rating = ratingBreakdown(providerId, seed);
  return {
    ...rating,
    rankScore: Math.round(bayesianRating(rating.overall, rating.count) * 100) / 100,
  };
}

export function reviewsForProvider(providerId: string): Review[] {
  return listReviewsForProvider(providerId).map(toReview);
}

export function reviewForOrder(orderId: string): Review | null {
  const row = getReviewByOrderId(orderId);
  return row ? toReview(row) : null;
}

export function createReview(orderId: string, input: ReviewWriteInput, author: string): Review {
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
  const wouldRepeat = input.wouldRepeat == null ? null : input.wouldRepeat ? 1 : 0;

  try {
    insertReview({
      id,
      order_id: orderId,
      provider_id: order.provider_id,
      rating,
      body,
      author: authorName,
      created_at: now,
      quality: optionalStar(input.quality, "Kalite"),
      timeliness: optionalStar(input.timeliness, "Zamanlama"),
      communication: optionalStar(input.communication, "İletişim"),
      would_repeat: wouldRepeat,
    });
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(409, "Bu siparişe yorum zaten var.");
  }

  writeProfileRating(order.provider_id);
  return reviewForOrder(orderId)!;
}

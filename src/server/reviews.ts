import { randomUUID } from "node:crypto";
import { canReview } from "@/lib/status";
import type { OrderStatus, Review } from "@/lib/types";
import { db } from "./db";
import { photosForReview } from "./photos";
import { ApiError } from "./rules";

type ReviewRow = {
  id: string;
  order_id: string | null;
  provider_id: string;
  rating: number;
  body: string;
  author: string;
  created_at: string;
};

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

export function reviewsForProvider(providerId: string): Review[] {
  const rows = db()
    .prepare("SELECT * FROM reviews WHERE provider_id = ? ORDER BY created_at DESC")
    .all(providerId) as ReviewRow[];
  return rows.map(toReview);
}

export function reviewForOrder(orderId: string): Review | null {
  const row = db().prepare("SELECT * FROM reviews WHERE order_id = ?").get(orderId) as
    | ReviewRow
    | undefined;
  return row ? toReview(row) : null;
}

export function ratingFor(
  providerId: string,
  seedRating: number,
  seedCount: number,
): { rating: number; reviews: number } {
  const live = reviewsForProvider(providerId);
  const extra = live.filter((r) => r.orderId);
  if (extra.length === 0) return { rating: seedRating, reviews: seedCount };
  const sum = seedRating * seedCount + extra.reduce((s, r) => s + r.rating, 0);
  const n = seedCount + extra.length;
  return { rating: Math.round((sum / n) * 10) / 10, reviews: n };
}

export function createReview(
  orderId: string,
  input: { rating: number; body: string },
  author: string,
): Review {
  const order = db()
    .prepare("SELECT id, provider_id, status FROM orders WHERE id = ?")
    .get(orderId) as { id: string; provider_id: string; status: string } | undefined;
  if (!order) throw new ApiError(404, "Sipariş yok.");
  if (!canReview(order.status as OrderStatus)) {
    throw new ApiError(409, "Yorum ancak teslimden sonra.");
  }
  if (reviewForOrder(orderId)) throw new ApiError(409, "Bu siparişe yorum zaten var.");

  const rating = Math.round(input.rating);
  if (rating < 1 || rating > 5) throw new ApiError(400, "Puan 1–5 olmalı.");

  const body = input.body.trim().slice(0, 400);
  if (body.length < 8) throw new ApiError(400, "Yorum en az birkaç cümle olsun.");

  const authorName = author.trim().slice(0, 40) || "Komşu";
  const now = new Date().toISOString();
  const id = `rev-${randomUUID().slice(0, 8)}`;

  try {
    db()
      .prepare(
        `INSERT INTO reviews (id, order_id, provider_id, rating, body, author, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(id, orderId, order.provider_id, rating, body, authorName, now);
  } catch {
    throw new ApiError(409, "Bu siparişe yorum zaten var.");
  }

  return reviewForOrder(orderId)!;
}

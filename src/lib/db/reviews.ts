import { db } from "./client";
import { setProfileRating } from "./providers";

export type ReviewRow = {
  id: string;
  order_id: string | null;
  provider_id: string;
  rating: number;
  body: string;
  author: string;
  created_at: string;
};

export function roundRating(sum: number, count: number): number {
  if (count <= 0) return 0;
  return Math.round((sum / count) * 10) / 10;
}

export function getReviewById(id: string): ReviewRow | undefined {
  return db().prepare("SELECT * FROM reviews WHERE id = ?").get(id) as ReviewRow | undefined;
}

export function getReviewByOrderId(orderId: string): ReviewRow | undefined {
  return db().prepare("SELECT * FROM reviews WHERE order_id = ?").get(orderId) as ReviewRow | undefined;
}

export function listReviewsForProvider(providerId: string): ReviewRow[] {
  return db()
    .prepare("SELECT * FROM reviews WHERE provider_id = ? ORDER BY created_at DESC")
    .all(providerId) as ReviewRow[];
}

export function aggregateForProvider(providerId: string): { sum: number; count: number } {
  const row = db()
    .prepare(
      `SELECT COALESCE(SUM(rating), 0) AS sum, COUNT(*) AS count
       FROM reviews WHERE provider_id = ?`,
    )
    .get(providerId) as { sum: number; count: number };
  return { sum: Number(row.sum), count: Number(row.count) };
}

export function listRatingAggregates(): { provider_id: string; sum: number; count: number }[] {
  return db()
    .prepare(
      `SELECT provider_id, SUM(rating) AS sum, COUNT(*) AS count
       FROM reviews
       GROUP BY provider_id`,
    )
    .all() as { provider_id: string; sum: number; count: number }[];
}

export function insertReview(row: ReviewRow) {
  db()
    .prepare(
      `INSERT INTO reviews (id, order_id, provider_id, rating, body, author, created_at)
       VALUES (@id, @order_id, @provider_id, @rating, @body, @author, @created_at)`,
    )
    .run(row);
}

export function writeProfileRating(providerId: string) {
  const { sum, count } = aggregateForProvider(providerId);
  setProfileRating(providerId, roundRating(sum, count), count);
}

export function writeProfileRatingsFromReviews() {
  for (const a of listRatingAggregates()) {
    const count = Number(a.count);
    setProfileRating(a.provider_id, roundRating(Number(a.sum), count), count);
  }
}

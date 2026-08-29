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
  quality: number | null;
  timeliness: number | null;
  communication: number | null;
  would_repeat: number | null;
};

export type ReviewWrite = Omit<ReviewRow, "quality" | "timeliness" | "communication" | "would_repeat"> & {
  quality?: number | null;
  timeliness?: number | null;
  communication?: number | null;
  would_repeat?: number | null;
};

export type DimensionAgg = {
  sum: number;
  count: number;
  quality: number | null;
  timeliness: number | null;
  communication: number | null;
  repeatYes: number;
  repeatAnswered: number;
};

export function roundRating(sum: number, count: number): number {
  if (count <= 0) return 0;
  return Math.round((sum / count) * 10) / 10;
}

function numOrNull(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
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

export function aggregateDimensions(providerId: string): DimensionAgg {
  const row = db()
    .prepare(
      `SELECT
         COALESCE(SUM(rating), 0) AS sum,
         COUNT(*) AS count,
         AVG(quality) AS quality,
         AVG(timeliness) AS timeliness,
         AVG(communication) AS communication,
         SUM(CASE WHEN would_repeat = 1 THEN 1 ELSE 0 END) AS repeat_yes,
         SUM(CASE WHEN would_repeat IS NOT NULL THEN 1 ELSE 0 END) AS repeat_n
       FROM reviews WHERE provider_id = ?`,
    )
    .get(providerId) as {
    sum: number;
    count: number;
    quality: number | null;
    timeliness: number | null;
    communication: number | null;
    repeat_yes: number;
    repeat_n: number;
  };
  return {
    sum: Number(row.sum),
    count: Number(row.count),
    quality: numOrNull(row.quality),
    timeliness: numOrNull(row.timeliness),
    communication: numOrNull(row.communication),
    repeatYes: Number(row.repeat_yes ?? 0),
    repeatAnswered: Number(row.repeat_n ?? 0),
  };
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

export function insertReview(row: ReviewWrite) {
  db()
    .prepare(
      `INSERT INTO reviews (
         id, order_id, provider_id, rating, body, author, created_at,
         quality, timeliness, communication, would_repeat
       ) VALUES (
         @id, @order_id, @provider_id, @rating, @body, @author, @created_at,
         @quality, @timeliness, @communication, @would_repeat
       )`,
    )
    .run({
      ...row,
      quality: row.quality ?? null,
      timeliness: row.timeliness ?? null,
      communication: row.communication ?? null,
      would_repeat: row.would_repeat ?? null,
    });
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

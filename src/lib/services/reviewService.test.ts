import { describe, expect, it } from "vitest";
import { getProfile } from "@/lib/db/providers";
import {
  aggregateForProvider,
  insertReview,
  roundRating,
  writeProfileRating,
} from "@/lib/db/reviews";
import { ratingForProvider } from "./reviewService";

describe("yorum ortalaması", () => {
  it("satır yoksa tohum puanı korur, karıştırmaz", () => {
    const seed = { rating: 4.9, reviews: 86 };
    expect(ratingForProvider("selin", seed)).toEqual(seed);
    expect(ratingForProvider("selin")).toEqual({ rating: 0, reviews: 0 });
  });

  it("yorum satırlarından AVG/COUNT üretir; sahte 86 karışmaz", () => {
    const { sum, count } = aggregateForProvider("elif");
    expect(count).toBe(2);
    expect(sum).toBe(10);
    expect(ratingForProvider("elif", { rating: 4.9, reviews: 86 })).toEqual({
      rating: 5,
      reviews: 2,
    });

    insertReview({
      id: "rev-test-agg-1",
      order_id: null,
      provider_id: "elif",
      rating: 1,
      body: "Test için düşük puan, ortalama düşsün.",
      author: "T.T.",
      created_at: "2026-08-29T12:00:00.000Z",
    });
    writeProfileRating("elif");

    const live = ratingForProvider("elif", { rating: 4.9, reviews: 86 });
    expect(live.reviews).toBe(3);
    expect(live.rating).toBe(roundRating(11, 3));
    expect(live.rating).toBe(3.7);

    const profile = getProfile("elif");
    expect(profile?.rating_avg).toBe(3.7);
    expect(profile?.rating_count).toBe(3);
  });
});

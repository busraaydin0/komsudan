import { describe, expect, it } from "vitest";
import { ApiError } from "@/server/rules";
import { insertOrderRow } from "@/lib/db/orders";
import { getProfile } from "@/lib/db/providers";
import {
  aggregateForProvider,
  insertReview,
  roundRating,
  writeProfileRating,
} from "@/lib/db/reviews";
import { requestOtp, verifyOtp } from "./authService";
import { createReview, ratingBreakdown, ratingForProvider, reviewSignalsForProvider } from "./reviewService";

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

function seedOrder(id: string, userId: string, status: string, lifecycle: string, providerId = "jale") {
  const now = new Date().toISOString();
  insertOrderRow({
    id,
    provider_id: providerId,
    package_id: "yikama",
    pieces: 6,
    express: 0,
    drop_method: "kapi",
    drop_point_id: null,
    slot: "Bugün 18:00–19:00",
    note: "",
    total: 180,
    commission: 18,
    status,
    created_at: now,
    updated_at: now,
    user_id: userId,
    price_per_kg_snapshot: 30,
    estimated_weight: 6,
    estimated_price: 180,
    delivery_mode: "door",
    scheduled_window_start: now,
    lifecycle,
  });
}

async function customer(phone: string) {
  const sent = requestOtp(phone);
  return (await verifyOtp(phone, sent.demoCode!)).user;
}

describe("yorum kırılımı", () => {
  it("hiç yorum yoksa boyutlar ve tekrar oranı boştur", () => {
    expect(ratingBreakdown("selin")).toEqual({
      overall: 0,
      count: 0,
      quality: null,
      timeliness: null,
      communication: null,
      repeatRate: null,
    });
  });

  it("tek yorum genel puanı taşır; eksik alt puan ve tekrar null kalır", () => {
    insertReview({
      id: "rev-test-one",
      order_id: null,
      provider_id: "jale",
      rating: 5,
      body: "Tek yorum, alt puan yok.",
      author: "A.A.",
      created_at: "2026-08-29T12:00:00.000Z",
    });
    expect(ratingBreakdown("jale")).toEqual({
      overall: 5,
      count: 1,
      quality: null,
      timeliness: null,
      communication: null,
      repeatRate: null,
    });
  });

  it("alt puanlardan biri eksikse o boyut ortalamaya girmez", () => {
    insertReview({
      id: "rev-test-dim",
      order_id: null,
      provider_id: "nuran",
      rating: 4,
      body: "Yalnızca kalite ve tekrar var.",
      author: "B.B.",
      created_at: "2026-08-29T12:00:00.000Z",
      quality: 5,
      would_repeat: 1,
    });
    const live = ratingBreakdown("nuran");
    expect(live.quality).toBe(5);
    expect(live.timeliness).toBeNull();
    expect(live.communication).toBeNull();
    expect(live.repeatRate).toBe(1);
  });

  it("trust sinyali ham ortalama yanında rankScore üretir", () => {
    const signals = reviewSignalsForProvider("jale");
    expect(signals.overall).toBe(5);
    expect(signals.count).toBe(1);
    expect(signals.rankScore).toBeLessThan(5);
    expect(signals.rankScore).toBeGreaterThan(4);
  });
});

describe("yorum yazma kuralları", () => {
  it("aynı siparişe ikinci yorumu, iptali ve tamamlanmamış siparişi reddeder", async () => {
    const user = await customer("5550000301");
    seedOrder("ord-rev-ok", user.id, "teslim_edildi", "completed");
    seedOrder("ord-rev-cancel", user.id, "iptal", "cancelled");
    seedOrder("ord-rev-open", user.id, "onay_bekliyor", "pending");

    const first = createReview(
      "ord-rev-ok",
      {
        rating: 5,
        body: "Teslim temizdi, tekrar bırakırım.",
        quality: 5,
        timeliness: 4,
        communication: 5,
        wouldRepeat: true,
      },
      user.name,
    );
    expect(first.quality).toBe(5);
    expect(first.wouldRepeat).toBe(true);

    expect(() =>
      createReview("ord-rev-ok", { rating: 4, body: "İkinci yorum olmamalıdır." }, user.name),
    ).toThrow(ApiError);
    expect(() =>
      createReview("ord-rev-cancel", { rating: 2, body: "İptal siparişe yorum yok." }, user.name),
    ).toThrow(ApiError);
    expect(() =>
      createReview("ord-rev-open", { rating: 3, body: "Bitmeyen siparişe yorum yok." }, user.name),
    ).toThrow(ApiError);
  });
});


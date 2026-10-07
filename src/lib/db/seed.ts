import type Database from "better-sqlite3";
import { PROVIDERS, SEED_REVIEWS } from "@/lib/data";
import { EXPRESS_BUMP } from "@/lib/pricing";
import { ensureProviderPriceGrid } from "./providerPrices";
import { upsertCapacitySettings } from "./providerCapacity";
import {
  countSlots,
  insertSlotRow,
  upsertPackage,
  upsertProfile,
  upsertProviderUser,
} from "./providers";
import { writeProfileRatingsFromReviews } from "./reviews";

const SEED_PHONES: Record<string, string> = {
  elif: "5321100001",
  ayse: "5321100002",
  merve: "5321100003",
  zeynep: "5321100005",
  gulsen: "5321100008",
  selin: "5321100009",
  burak: "5321100010",
  leyla: "5321100011",
};

const SEED_CAPACITY: Record<string, { half: number; maxOrder: number; days?: number[] }> = {
  elif: { half: 8, maxOrder: 4 },
  ayse: { half: 6, maxOrder: 4 },
  merve: { half: 4, maxOrder: 4 },
  zeynep: { half: 10, maxOrder: 4 },
  gulsen: { half: 4, maxOrder: 2 },
  selin: { half: 6, maxOrder: 4 },
  burak: { half: 5, maxOrder: 4 },
  leyla: { half: 7, maxOrder: 4 },
};

function seedCategory(database: Database.Database) {
  database
    .prepare(
      `INSERT INTO service_categories (id, name, icon, fulfillment_mode, pricing_model, is_active, blurb, sort_order)
       VALUES ('camasir', 'Çamaşır Yıkama', 'laundry', 'delivery', 'per_piece', 1, 'Yıka, katla, kapıda bırak', 1)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         icon = excluded.icon,
         is_active = 1,
         blurb = excluded.blurb,
         sort_order = excluded.sort_order`,
    )
    .run();
}

function seedProviderDirectory() {
  for (const [i, p] of PROVIDERS.entries()) {
    const phone = SEED_PHONES[p.id] ?? `532119${String(i + 1).padStart(4, "0")}`;
    upsertProviderUser({ id: p.id, phone, fullName: p.name, avatarUrl: p.avatarUrl });
    upsertProfile({
      userId: p.id,
      bio: p.bio,
      lat: p.loc.lat,
      lng: p.loc.lng,
      neighborhood: p.neighborhood,
      hasDryer: p.hasDryer,
      isFounder: p.trust === "kurucu",
      ratingAvg: p.rating,
      ratingCount: p.reviews,
      avatarUrl: p.avatarUrl,
      categoryId: "camasir",
    });
    for (const pack of p.packages) {
      upsertPackage({
        id: `${p.id}:${pack.id}`,
        provider_id: p.id,
        name: pack.title,
        price_per_kg: pack.pricePerPiece,
        min_order_amount: 0,
        express_available: p.express ? 1 : 0,
        express_surcharge_pct: p.express ? EXPRESS_BUMP : 0,
      });
    }
    ensureProviderPriceGrid(p.id);
    if (countSlots(p.id) === 0) {
      const windows = [...new Set(p.slots.map((s) => s.replace(/^(Bugün|Yarın) /, "")))];
      for (const day of [1, 2, 3, 4, 5]) {
        for (const window of windows) {
          const [start, end] = window.split("–");
          if (!start || !end) continue;
          insertSlotRow({
            id: `${p.id}:${day}:${start}`,
            provider_id: p.id,
            day_of_week: day,
            start_time: start,
            end_time: end,
            delivery_mode: "door",
            is_active: 1,
          });
        }
      }
    }
  }
}

/** Deterministik çamaşır pilot seed — idempotent. */
export function seedCatalog(database: Database.Database) {
  const upProvider = database.prepare(
    `INSERT INTO providers (id, payload, category_id)
     VALUES (@id, @payload, @categoryId)
     ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, category_id = excluded.category_id`,
  );
  const upReview = database.prepare(
    `INSERT INTO reviews (id, order_id, provider_id, rating, body, author, created_at)
     VALUES (@id, @order_id, @provider_id, @rating, @body, @author, @created_at)
     ON CONFLICT(id) DO UPDATE SET
       body = excluded.body,
       rating = excluded.rating,
       author = excluded.author`,
  );
  const tx = database.transaction(() => {
    seedCategory(database);
    for (const p of PROVIDERS) {
      upProvider.run({
        id: p.id,
        payload: JSON.stringify({ ...p, drops: ["kapi"] }),
        categoryId: "camasir",
      });
      const cap = SEED_CAPACITY[p.id] ?? { half: 6, maxOrder: 4 };
      upsertCapacitySettings({
        providerId: p.id,
        halfUnitsPerDay: cap.half,
        workingDays: cap.days ?? [1, 2, 3, 4, 5, 6],
        maxUnitsPerOrder: cap.maxOrder,
      });
    }
    for (const r of SEED_REVIEWS) {
      upReview.run({
        id: r.id,
        order_id: r.orderId,
        provider_id: r.providerId,
        rating: r.rating,
        body: r.body,
        author: r.author,
        created_at: r.createdAt,
      });
    }
    seedProviderDirectory();
    writeProfileRatingsFromReviews();
  });
  tx();
}

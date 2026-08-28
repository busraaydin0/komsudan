import type Database from "better-sqlite3";
import { DROP_POINTS, PROVIDERS, SEED_REVIEWS } from "@/lib/data";
import { EXPRESS_BUMP, MIN_ORDER } from "@/lib/pricing";
import {
  countSlots,
  insertSlotRow,
  upsertDrop,
  upsertPackage,
  upsertProfile,
  upsertProviderUser,
} from "./providers";
import { upsertProduct } from "./products";

const SEED_PHONES: Record<string, string> = {
  elif: "5321100001",
  ayse: "5321100002",
  merve: "5321100003",
  fatma: "5321100004",
  zeynep: "5321100005",
  hatice: "5321100006",
  nurcan: "5321100007",
  gulsen: "5321100008",
};

function deliveryMode(drops: Array<"kapi" | "nokta">): "door" | "point" | "both" {
  const door = drops.includes("kapi");
  const point = drops.includes("nokta");
  if (door && point) return "both";
  if (door) return "door";
  return "point";
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
      categoryId: p.categoryId ?? "camasir",
    });
    if ((p.categoryId ?? "camasir") !== "davet") {
      for (const pack of p.packages) {
        upsertPackage({
          id: `${p.id}:${pack.id}`,
          provider_id: p.id,
          name: pack.title,
          price_per_kg: pack.pricePerPiece,
          min_order_amount: MIN_ORDER,
          express_available: p.express ? 1 : 0,
          express_surcharge_pct: p.express ? EXPRESS_BUMP : 0,
        });
      }
    }
    for (const product of p.products ?? []) {
      upsertProduct({
        id: product.id,
        provider_id: p.id,
        name: product.name,
        price_per_person: product.pricePerPerson,
      });
    }
    if (p.drops.includes("nokta")) {
      for (const d of DROP_POINTS) {
        upsertDrop({
          id: `${p.id}:${d.id}`,
          provider_id: p.id,
          label: d.name,
          lat: d.loc.lat,
          lng: d.loc.lng,
          is_active: 1,
        });
      }
    }
    if (countSlots(p.id) === 0) {
      const windows = [...new Set(p.slots.map((s) => s.replace(/^(Bugün|Yarın) /, "")))];
      const mode = deliveryMode(p.drops);
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
            delivery_mode: mode,
            is_active: 1,
          });
        }
      }
    }
  }
}

export function seedCatalog(database: Database.Database) {
  const upProvider = database.prepare(
    `INSERT INTO providers (id, payload, remaining, category_id)
     VALUES (@id, @payload, @remaining, @categoryId)
     ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, category_id = excluded.category_id`,
  );
  const upDrop = database.prepare(
    `INSERT INTO drop_points (id, payload) VALUES (@id, @payload)
     ON CONFLICT(id) DO UPDATE SET payload = excluded.payload`,
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
    for (const p of PROVIDERS) {
      const { remaining, ...rest } = p;
      upProvider.run({
        id: p.id,
        payload: JSON.stringify({ ...rest, remaining }),
        remaining,
        categoryId: p.categoryId ?? "camasir",
      });
    }
    for (const d of DROP_POINTS) {
      upDrop.run({ id: d.id, payload: JSON.stringify(d) });
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
  });
  tx();
}

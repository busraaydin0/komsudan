import type Database from "better-sqlite3";
import { DROP_POINTS, PROVIDERS, SEED_REVIEWS } from "@/lib/data";

export function seedCatalog(db: Database.Database) {
  const upProvider = db.prepare(
    `INSERT INTO providers (id, payload, remaining)
     VALUES (@id, @payload, @remaining)
     ON CONFLICT(id) DO UPDATE SET payload = excluded.payload`,
  );
  const upDrop = db.prepare(
    `INSERT INTO drop_points (id, payload) VALUES (@id, @payload)
     ON CONFLICT(id) DO UPDATE SET payload = excluded.payload`,
  );
  const upReview = db.prepare(
    `INSERT INTO reviews (id, order_id, provider_id, rating, body, author, created_at)
     VALUES (@id, @order_id, @provider_id, @rating, @body, @author, @created_at)
     ON CONFLICT(id) DO UPDATE SET
       body = excluded.body,
       rating = excluded.rating,
       author = excluded.author`,
  );
  const tx = db.transaction(() => {
    for (const p of PROVIDERS) {
      const { remaining, ...rest } = p;
      upProvider.run({
        id: p.id,
        payload: JSON.stringify({ ...rest, remaining }),
        remaining,
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
  });
  tx();
}

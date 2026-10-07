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

const KEEP_SEED_IDS = new Set(PROVIDERS.map((p) => p.id));

function deliveryMode(drops: Array<"kapi" | "nokta">): "door" | "point" | "both" {
  const door = drops.includes("kapi");
  const point = drops.includes("nokta");
  if (door && point) return "both";
  if (door) return "door";
  return "point";
}

function tableExists(database: Database.Database, name: string) {
  return Boolean(
    database.prepare("SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = ?").get(name),
  );
}

function hasColumn(database: Database.Database, table: string, col: string) {
  if (!tableExists(database, table)) return false;
  const cols = database.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return cols.some((c) => c.name === col);
}

/** Eski 14 kategori seed’i (fatma, okan…). Kullanıcı kartları (`u-…`) durur. */
function pruneLeftoverSeedProviders(database: Database.Database) {
  const extra = (
    database.prepare("SELECT id FROM providers").all() as { id: string }[]
  )
    .map((r) => r.id)
    .filter((id) => !KEEP_SEED_IDS.has(id) && !id.startsWith("u-"));
  if (!extra.length) return;

  const ph = extra.map(() => "?").join(",");
  const run = (sql: string) => database.prepare(sql).run(...extra);
  const delIf = (table: string, sql: string) => {
    if (!tableExists(database, table)) return;
    if (sql.includes("user_id") && !hasColumn(database, table, "user_id")) return;
    if (sql.includes("provider_id") && !hasColumn(database, table, "provider_id")) return;
    if (sql.includes("order_id") && !hasColumn(database, table, "order_id")) return;
    run(sql);
  };

  const orderIds = (
    database.prepare(`SELECT id FROM orders WHERE provider_id IN (${ph})`).all(...extra) as { id: string }[]
  ).map((r) => r.id);

  if (orderIds.length) {
    const oh = orderIds.map(() => "?").join(",");
    const runO = (sql: string) => database.prepare(sql).run(...orderIds);
    const delO = (table: string, sql: string) => {
      if (tableExists(database, table)) runO(sql);
    };
    delO(
      "message_reports",
      `DELETE FROM message_reports WHERE message_id IN (
         SELECT m.id FROM messages m JOIN conversations c ON c.id = m.conversation_id
         WHERE c.order_id IN (${oh}))`,
    );
    delO(
      "message_moderation_events",
      `DELETE FROM message_moderation_events WHERE message_id IN (
         SELECT m.id FROM messages m JOIN conversations c ON c.id = m.conversation_id
         WHERE c.order_id IN (${oh}))`,
    );
    delO(
      "messages",
      `DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE order_id IN (${oh}))`,
    );
    delO("conversations", `DELETE FROM conversations WHERE order_id IN (${oh})`);
    delO("order_photos", `DELETE FROM order_photos WHERE order_id IN (${oh})`);
    delO("order_status_history", `DELETE FROM order_status_history WHERE order_id IN (${oh})`);
    delO("order_events", `DELETE FROM order_events WHERE order_id IN (${oh})`);
    delO("payments", `DELETE FROM payments WHERE order_id IN (${oh})`);
    delO("disputes", `DELETE FROM disputes WHERE order_id IN (${oh})`);
    delO("appointments", `DELETE FROM appointments WHERE order_id IN (${oh})`);
    delO("notifications", `DELETE FROM notifications WHERE order_id IN (${oh})`);
    delO("wallet_ledger", `DELETE FROM wallet_ledger WHERE order_id IN (${oh})`);
    delO("reviews", `DELETE FROM reviews WHERE order_id IN (${oh})`);
    runO(`DELETE FROM orders WHERE id IN (${oh})`);
  }

  delIf("reviews", `DELETE FROM reviews WHERE provider_id IN (${ph})`);
  delIf("gallery_photos", `DELETE FROM gallery_photos WHERE provider_id IN (${ph})`);
  delIf("service_packages", `DELETE FROM service_packages WHERE provider_id IN (${ph})`);
  delIf("provider_drop_points", `DELETE FROM provider_drop_points WHERE provider_id IN (${ph})`);
  delIf("availability_slots", `DELETE FROM availability_slots WHERE provider_id IN (${ph})`);
  run(`DELETE FROM providers WHERE id IN (${ph})`);
  delIf("provider_profiles", `DELETE FROM provider_profiles WHERE user_id IN (${ph})`);
  delIf("wallets", `DELETE FROM wallets WHERE user_id IN (${ph})`);
  delIf("wallet_ledger", `DELETE FROM wallet_ledger WHERE user_id IN (${ph})`);
  delIf("sessions", `DELETE FROM sessions WHERE user_id IN (${ph})`);
  delIf("refresh_tokens", `DELETE FROM refresh_tokens WHERE user_id IN (${ph})`);
  delIf("notifications", `DELETE FROM notifications WHERE user_id IN (${ph})`);
  run(`DELETE FROM users WHERE id IN (${ph})`);
}

/** Çamaşır paketi olmayan eski kartları (ör. tamir denemesi) haritadan indir. Kullanıcı hesabı durur. */
function unpublishWithoutLaundryPackages(database: Database.Database) {
  if (!tableExists(database, "service_packages")) return;
  const ids = (
    database
      .prepare(
        `SELECT p.id FROM providers p
         WHERE NOT EXISTS (
           SELECT 1 FROM service_packages s
           WHERE s.provider_id = p.id AND COALESCE(s.is_active, 1) = 1
         )`,
      )
      .all() as { id: string }[]
  )
    .map((r) => r.id)
    .filter((id) => !KEEP_SEED_IDS.has(id));
  if (!ids.length) return;
  const ph = ids.map(() => "?").join(",");
  database.prepare(`DELETE FROM providers WHERE id IN (${ph})`).run(...ids);
  if (tableExists(database, "provider_profiles") && hasColumn(database, "provider_profiles", "status")) {
    database.prepare(`UPDATE provider_profiles SET status = 'paused' WHERE user_id IN (${ph})`).run(...ids);
  }
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
        min_order_amount: MIN_ORDER,
        express_available: p.express ? 1 : 0,
        express_surcharge_pct: p.express ? EXPRESS_BUMP : 0,
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
        categoryId: "camasir",
      });
    }
    for (const d of DROP_POINTS) {
      upDrop.run({ id: d.id, payload: JSON.stringify(d) });
    }
    const knownProviders = new Set(PROVIDERS.map((p) => p.id));
    for (const r of SEED_REVIEWS) {
      if (!knownProviders.has(r.providerId)) continue;
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
    pruneLeftoverSeedProviders(database);
    unpublishWithoutLaundryPackages(database);
    writeProfileRatingsFromReviews();
  });
  tx();
}

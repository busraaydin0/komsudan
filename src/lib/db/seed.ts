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
import { upsertWash } from "./washes";
import { writeProfileRatingsFromReviews } from "./reviews";

const SEED_PHONES: Record<string, string> = {
  elif: "5321100001",
  ayse: "5321100002",
  merve: "5321100003",
  fatma: "5321100004",
  zeynep: "5321100005",
  hatice: "5321100006",
  nurcan: "5321100007",
  gulsen: "5321100008",
  selin: "5321100009",
  burak: "5321100010",
  leyla: "5321100011",
  sevim: "5321100012",
  dilek: "5321100013",
  cemile: "5321100014",
  guler: "5321100015",
  nuran: "5321100016",
  tulay: "5321100017",
  hasan: "5321100018",
  metin: "5321100019",
  ozkan: "5321100020",
  emre: "5321100021",
  caner: "5321100022",
  baris: "5321100023",
  okan: "5321100024",
  serkan: "5321100025",
  volkan: "5321100026",
  deniz: "5321100027",
  kaan: "5321100028",
  yusuf: "5321100029",
  selda: "5321100030",
  tarik: "5321100031",
  nilay: "5321100032",
  hakan: "5321100033",
  ece: "5321100034",
  umut: "5321100035",
  pinar: "5321100036",
  berk: "5321100037",
  nisa: "5321100038",
  gulay: "5321100039",
  meryem: "5321100040",
  hulya: "5321100041",
  serap: "5321100042",
  cemal: "5321100043",
  aylin: "5321100044",
  seda: "5321100045",
  tugce: "5321100046",
  melis: "5321100047",
  dilara: "5321100048",
  burcu: "5321100049",
  ceren: "5321100050",
  defne: "5321100051",
  irem: "5321100052",
  jale: "5321100053",
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
    if ((p.categoryId ?? "camasir") === "camasir") {
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
    for (const wash of p.washes ?? []) {
      upsertWash({
        id: wash.id,
        provider_id: p.id,
        name: wash.name,
        description: wash.description,
        job: wash.job,
        vehicle: wash.vehicle,
        price: wash.price,
        includes: wash.includes,
        durationMin: wash.durationMin,
        maxPerDay: wash.maxPerDay,
        booking: wash.booking,
        location: wash.location,
        workHours: wash.workHours,
        materials: wash.materials,
        notes: wash.notes,
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
    writeProfileRatingsFromReviews();
  });
  tx();
}

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
import { upsertService } from "./services";
import { upsertRepair } from "./repairs";
import { upsertTech } from "./tech";
import { upsertWash } from "./washes";
import { upsertCourier } from "./couriers";
import { upsertGarden } from "./gardens";
import { upsertCargo } from "./cargos";
import { upsertPrint } from "./prints";
import { upsertPreserve } from "./preserves";
import { upsertCarpet } from "./carpets";
import { upsertLesson } from "./lessons";
import { upsertTalk } from "./talks";
import { upsertGrave } from "./graves";

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
    for (const product of p.products ?? []) {
      upsertProduct({
        id: product.id,
        provider_id: p.id,
        name: product.name,
        price_per_person: product.pricePerPerson,
      });
    }
    for (const service of p.services ?? []) {
      upsertService({
        id: service.id,
        provider_id: p.id,
        name: service.name,
        description: service.description,
        subcategory: service.subcategory,
        price: service.price,
        priceUnit: service.priceUnit,
        minOrder: service.minOrder,
        leadDays: service.leadDays,
        maxPerWeek: service.maxPerWeek,
        delivery: service.delivery,
        workRadiusKm: service.workRadiusKm,
        notes: service.notes,
        material: service.material,
      });
    }
    for (const repair of p.repairs ?? []) {
      upsertRepair({
        id: repair.id,
        provider_id: p.id,
        name: repair.name,
        description: repair.description,
        kind: repair.kind,
        item: repair.item,
        job: repair.job,
        price: repair.price,
        priceType: repair.priceType,
        priceUnit: repair.priceUnit,
        parts: repair.parts,
        leadDays: repair.leadDays,
        maxPerWeek: repair.maxPerWeek,
        delivery: repair.delivery,
        workRadiusKm: repair.workRadiusKm,
        inspectRequired: repair.inspectRequired,
        quoteFrom: repair.quoteFrom,
        warrantyDays: repair.warrantyDays,
        notes: repair.notes,
        workHours: repair.workHours,
      });
    }
    for (const tech of p.techs ?? []) {
      upsertTech({
        id: tech.id,
        provider_id: p.id,
        name: tech.name,
        description: tech.description,
        kind: tech.kind,
        item: tech.item,
        job: tech.job,
        price: tech.price,
        priceType: tech.priceType,
        priceUnit: tech.priceUnit,
        materials: tech.materials,
        leadHours: tech.leadHours,
        leadDays: tech.leadDays,
        maxPerWeek: tech.maxPerWeek,
        delivery: tech.delivery,
        inspectRequired: tech.inspectRequired,
        quoteFromPhoto: tech.quoteFromPhoto,
        platform: tech.platform,
        warrantyDays: tech.warrantyDays,
        notes: tech.notes,
        workHours: tech.workHours,
      });
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
    for (const courier of p.couriers ?? []) {
      upsertCourier({
        id: courier.id,
        provider_id: p.id,
        name: courier.name,
        description: courier.description,
        transport: courier.transport,
        sizes: courier.sizes,
        maxKm: courier.maxKm,
        price: courier.price,
        priceType: courier.priceType,
        durationMin: courier.durationMin,
        routes: courier.routes,
        avail: courier.avail,
        workHours: courier.workHours,
        region: courier.region,
        carry: courier.carry,
        carryOther: courier.carryOther,
        refuse: courier.refuse,
        confirm: courier.confirm,
        notes: courier.notes,
      });
    }
    for (const garden of p.gardens ?? []) {
      upsertGarden({
        id: garden.id,
        provider_id: p.id,
        name: garden.name,
        description: garden.description,
        jobs: garden.jobs,
        areas: garden.areas,
        price: garden.price,
        priceType: garden.priceType,
        durationMin: garden.durationMin,
        equipment: garden.equipment,
        location: garden.location,
        maxKm: garden.maxKm,
        avail: garden.avail,
        workHours: garden.workHours,
        canDo: garden.canDo,
        cannotDo: garden.cannotDo,
        notes: garden.notes,
      });
    }
    for (const cargo of p.cargos ?? []) {
      upsertCargo({
        id: cargo.id,
        provider_id: p.id,
        name: cargo.name,
        jobs: cargo.jobs,
        sizes: cargo.sizes,
        maxKm: cargo.maxKm,
        branches: cargo.branches,
        points: cargo.points,
        price: cargo.price,
        priceType: cargo.priceType,
        durationMin: cargo.durationMin,
        avail: cargo.avail,
        workHours: cargo.workHours,
        pickup: cargo.pickup,
        dropoff: cargo.dropoff,
        confirm: cargo.confirm,
        refuse: cargo.refuse,
        notes: cargo.notes,
      });
    }
    for (const print of p.prints ?? []) {
      upsertPrint({
        id: print.id,
        provider_id: p.id,
        name: print.name,
        colors: print.colors,
        paper: print.paper,
        sides: print.sides,
        files: print.files,
        price: print.price,
        minPages: print.minPages,
        durationMin: print.durationMin,
        send: print.send,
        pickup: print.pickup,
        avail: print.avail,
        workHours: print.workHours,
        notes: print.notes,
      });
    }
    for (const preserve of p.preserves ?? []) {
      upsertPreserve({
        id: preserve.id,
        provider_id: p.id,
        name: preserve.name,
        description: preserve.description,
        kinds: preserve.kinds,
        portion: preserve.portion,
        ingredients: preserve.ingredients,
        material: preserve.material,
        price: preserve.price,
        priceUnit: preserve.priceUnit,
        minOrder: preserve.minOrder,
        leadDays: preserve.leadDays,
        noticeDays: preserve.noticeDays,
        storage: preserve.storage,
        pickup: preserve.pickup,
        season: preserve.season,
        allergens: preserve.allergens,
        notes: preserve.notes,
      });
    }
    for (const carpet of p.carpets ?? []) {
      upsertCarpet({
        id: carpet.id,
        provider_id: p.id,
        name: carpet.name,
        description: carpet.description,
        kinds: carpet.kinds,
        sizes: carpet.sizes,
        minOrder: carpet.minOrder,
        cleans: carpet.cleans,
        price: carpet.price,
        leadDays: carpet.leadDays,
        pickup: carpet.pickup,
        readyAt: carpet.readyAt,
        products: carpet.products,
        noticeDays: carpet.noticeDays,
        notes: carpet.notes,
      });
    }
    for (const lesson of p.lessons ?? []) {
      upsertLesson({
        id: lesson.id,
        provider_id: p.id,
        name: lesson.name,
        description: lesson.description,
        kinds: lesson.kinds,
        levels: lesson.levels,
        subjects: lesson.subjects,
        subjectOther: lesson.subjectOther,
        durations: lesson.durations,
        price: lesson.price,
        place: lesson.place,
        weekly: lesson.weekly,
        materials: lesson.materials,
        notes: lesson.notes,
      });
    }
    for (const talk of p.talks ?? []) {
      upsertTalk({
        id: talk.id,
        provider_id: p.id,
        name: talk.name,
        description: talk.description,
        langs: talk.langs,
        langOther: talk.langOther,
        kinds: talk.kinds,
        levels: talk.levels,
        durations: talk.durations,
        price: talk.price,
        place: talk.place,
        materials: talk.materials,
        notes: talk.notes,
      });
    }
    for (const grave of p.graves ?? []) {
      upsertGrave({
        id: grave.id,
        provider_id: p.id,
        name: grave.name,
        description: grave.description,
        kinds: grave.kinds,
        cemetery: grave.cemetery,
        radiusKm: grave.radiusKm,
        price: grave.price,
        pricing: grave.pricing,
        flowers: grave.flowers,
        fees: grave.fees,
        durationMin: grave.durationMin,
        photos: grave.photos,
        avails: grave.avails,
        workHours: grave.workHours,
        notes: grave.notes,
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

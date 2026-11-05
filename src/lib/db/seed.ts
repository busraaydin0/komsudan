import type Database from "better-sqlite3";
import { PROVIDERS, SEED_REVIEWS } from "@/lib/db/seedCatalogData";
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
import { istanbulYearMonth } from "@/lib/capacity/istanbul";

export const DEMO_SERVICE_ADMIN_PHONE = "5321100099";

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
  elif: { half: 8, maxOrder: 10 },
  ayse: { half: 6, maxOrder: 10 },
  merve: { half: 4, maxOrder: 10 },
  zeynep: { half: 10, maxOrder: 10 },
  gulsen: { half: 4, maxOrder: 2 },
  selin: { half: 6, maxOrder: 10 },
  burak: { half: 5, maxOrder: 10 },
  leyla: { half: 7, maxOrder: 10 },
};

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
    });
    for (const pack of p.packages) {
      upsertPackage({
        id: `${p.id}:${pack.id}`,
        provider_id: p.id,
        name: pack.title,
        price_per_kg: pack.pricePerPiece,
        min_order_amount: 0,
        // express_available / express_surcharge_pct fiyatı etkilemez (K-008).
        express_available: p.express ? 1 : 0,
        express_surcharge_pct: p.express ? EXPRESS_BUMP : 0,
      });
    }
    ensureProviderPriceGrid(p.id);
    if (countSlots(p.id) === 0) {
      // 1 saatlik vitrin metinleri 2 saatlik takvime bölünmez; gün boyu slot gerekir.
      for (const day of [1, 2, 3, 4, 5, 6]) {
        insertSlotRow({
          id: `${p.id}:${day}:gun`,
          provider_id: p.id,
          day_of_week: day,
          start_time: "08:00",
          end_time: "20:00",
          delivery_mode: "door",
          is_active: 1,
        });
      }
    }
  }
}

/** Deterministik çamaşır pilot seed — idempotent. */
export function seedCatalog(database: Database.Database) {
  const upProvider = database.prepare(
    `INSERT INTO providers (id, payload)
     VALUES (@id, @payload)
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
      upProvider.run({
        id: p.id,
        payload: JSON.stringify({ ...p, drops: ["kapi"] }),
      });
      const cap = SEED_CAPACITY[p.id] ?? { half: 6, maxOrder: 10 };
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
  seedStaffUsers(database);
  if (process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test") {
    seedAdminDemoMonth(database);
  }
}

function seedStaffUsers(database: Database.Database) {
  const now = new Date().toISOString();
  database
    .prepare(
      `INSERT INTO users (
         id, phone, name, full_name, role, identity_verified, passkey_id,
         onboarding_completed_at, super_admin, created_at, updated_at
       ) VALUES (
         'staff-hizmet-admin', @phone, 'Hizmet Admini', 'Hizmet Admini Demo',
         'service_admin', 1, 'demo-staff-passkey', @now, 0, @now, @now
       )
       ON CONFLICT(id) DO UPDATE SET
         role = 'service_admin',
         identity_verified = 1,
         passkey_id = COALESCE(users.passkey_id, excluded.passkey_id)`,
    )
    .run({ phone: DEMO_SERVICE_ADMIN_PHONE, now });
}

/** Geliştirme: mevcut ayda elif/ayşe için örnek profil satırları. Üretimde ve testte çalışmaz. */
function seedAdminDemoMonth(database: Database.Database) {
  const exists = database.prepare(`SELECT 1 AS ok FROM orders WHERE id = 'demo-admin-elif-1'`).get();
  if (exists) return;
  const month = istanbulYearMonth();
  const at = `${month}-12T10:00:00.000+03:00`;
  const doneAt = `${month}-14T18:00:00.000+03:00`;
  const promised = `${month}-13`;
  const now = new Date().toISOString();

  for (const [id, phone] of [
    ["demo-admin-c1", "5321100081"],
    ["demo-admin-c2", "5321100082"],
  ] as const) {
    database
      .prepare(
        `INSERT INTO users (id, phone, name, full_name, role, identity_verified, passkey_id, created_at, updated_at)
         VALUES (?, ?, '', '', 'customer', 1, NULL, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .run(id, phone, now, now);
  }

  const insertOrder = database.prepare(
    `INSERT INTO orders (
       id, provider_id, package_id, express, drop_method, slot, note, total, commission,
       status, created_at, updated_at, payment_status, user_id, delivery_mode,
       scheduled_window_start, size, machine_units, price_change, promised_delivery_date, cancel_reason
     ) VALUES (
       @id, @provider_id, 'katlama', 0, 'kapi', '10:00–12:00', '', @total, @commission,
       @status, @created_at, @updated_at, @payment_status, @user_id, 'door',
       @created_at, 'kucuk', 1, 'none', @promised, @cancel_reason
     )`,
  );

  insertOrder.run({
    id: "demo-admin-elif-1",
    provider_id: "elif",
    total: 180,
    commission: 18,
    status: "completed",
    created_at: at,
    updated_at: doneAt,
    payment_status: "captured",
    user_id: "demo-admin-c1",
    promised,
    cancel_reason: null,
  });
  insertOrder.run({
    id: "demo-admin-elif-2",
    provider_id: "elif",
    total: 90,
    commission: 9,
    status: "cancelled",
    created_at: at,
    updated_at: at,
    payment_status: "voided",
    user_id: "demo-admin-c1",
    promised: null,
    cancel_reason: "customer",
  });
  insertOrder.run({
    id: "demo-admin-elif-3",
    provider_id: "elif",
    total: 120,
    commission: 12,
    status: "rejected",
    created_at: at,
    updated_at: at,
    payment_status: "voided",
    user_id: "demo-admin-c2",
    promised: null,
    cancel_reason: "expired",
  });
  insertOrder.run({
    id: "demo-admin-ayse-1",
    provider_id: "ayse",
    total: 150,
    commission: 15,
    status: "completed",
    created_at: at,
    updated_at: `${month}-13T12:00:00.000+03:00`,
    payment_status: "captured",
    user_id: "demo-admin-c2",
    promised,
    cancel_reason: null,
  });

  const insertPay = database.prepare(
    `INSERT INTO payments (id, order_id, amount, commission, status, provider_reference, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'captured', ?, ?, ?)`,
  );
  insertPay.run("demo-pay-elif-1", "demo-admin-elif-1", 180, 18, "demo-elif-1", doneAt, doneAt);
  insertPay.run("demo-pay-ayse-1", "demo-admin-ayse-1", 150, 15, "demo-ayse-1", at, at);

  database
    .prepare(
      `INSERT INTO reviews (id, order_id, provider_id, rating, body, author, created_at)
       VALUES ('demo-rev-elif-1', 'demo-admin-elif-1', 'elif', 5, 'Demo ay puanı', 'Müşteri', ?)
       ON CONFLICT(id) DO NOTHING`,
    )
    .run(at);

  database
    .prepare(
      `INSERT INTO disputes (id, order_id, opened_by, opener_role, reason, status, created_at, resolved_at)
       VALUES ('demo-disp-elif-1', 'demo-admin-elif-1', 'demo-admin-c1', 'customer', 'Demo şikayet', 'open', ?, NULL)
       ON CONFLICT(id) DO NOTHING`,
    )
    .run(at);

  database
    .prepare(
      `INSERT INTO provider_capacity_days (provider_id, date, max_units, used_units)
       VALUES ('elif', ?, 8, 4)
       ON CONFLICT(provider_id, date) DO UPDATE SET used_units = excluded.used_units`,
    )
    .run(`${month}-12`);
}

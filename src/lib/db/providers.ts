import { randomUUID } from "node:crypto";
import { db } from "./client";

export type ProfileRow = {
  user_id: string;
  full_name: string;
  bio: string | null;
  avatar_url: string | null;
  lat: number;
  lng: number;
  neighborhood: string | null;
  has_dryer: number;
  is_founder: number;
  verification_status: "pending" | "verified" | "rejected";
  status: "active" | "paused";
  commission_rate: number;
  rating_avg: number;
  rating_count: number;
  completed_orders: number;
  category_id: string | null;
  updated_at: string;
};

export type PackageRow = {
  id: string;
  provider_id: string;
  name: string;
  price_per_kg: number;
  min_order_amount: number;
  express_available: number;
  express_surcharge_pct: number;
  is_active: number;
  category_id: string | null;
};

export type DropRow = {
  id: string;
  provider_id: string;
  label: string;
  lat: number;
  lng: number;
  is_active: number;
};

export type SlotRow = {
  id: string;
  provider_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  delivery_mode: "door" | "point" | "both";
  is_active: number;
};

const PROFILE_SELECT = `
  p.user_id, u.full_name, p.bio, p.avatar_url, p.lat, p.lng, p.neighborhood,
  p.has_dryer, p.is_founder, p.verification_status, p.status, p.commission_rate,
  p.rating_avg, p.rating_count, p.completed_orders, p.category_id, p.updated_at
`;

export function upsertProviderUser(input: {
  id: string;
  phone: string;
  fullName: string;
  avatarUrl?: string | null;
}) {
  const now = new Date().toISOString();
  db()
    .prepare(
      `INSERT INTO users (id, phone, name, full_name, role, identity_verified, passkey_id, avatar_url, created_at, updated_at)
       VALUES (@id, @phone, @fullName, @fullName, 'provider', 1, NULL, @avatarUrl, @now, @now)
       ON CONFLICT(id) DO UPDATE SET
         role = 'provider',
         identity_verified = 1,
         avatar_url = CASE
           WHEN users.avatar_url IS NULL OR users.avatar_url = '' THEN excluded.avatar_url
           ELSE users.avatar_url
         END`,
    )
    .run({ ...input, avatarUrl: input.avatarUrl ?? null, now });
}

export function upsertProfile(input: {
  userId: string;
  bio: string;
  lat: number;
  lng: number;
  neighborhood: string;
  hasDryer: boolean;
  isFounder: boolean;
  ratingAvg: number;
  ratingCount: number;
  avatarUrl?: string | null;
  categoryId?: string;
}) {
  const now = new Date().toISOString();
  const categoryId = input.categoryId ?? "camasir";
  db()
    .prepare(
      `INSERT INTO provider_profiles (
         user_id, bio, avatar_url, lat, lng, neighborhood, has_dryer, is_founder,
         verification_status, status, commission_rate, rating_avg, rating_count,
         completed_orders, category_id, updated_at
       ) VALUES (
         @userId, @bio, @avatarUrl, @lat, @lng, @neighborhood, @hasDryer, @isFounder,
         'verified', 'active', 0.10, @ratingAvg, @ratingCount, 0, @categoryId, @now
       )
       ON CONFLICT(user_id) DO UPDATE SET
         bio = excluded.bio,
         category_id = excluded.category_id,
         rating_avg = excluded.rating_avg,
         rating_count = excluded.rating_count,
         is_founder = excluded.is_founder,
         avatar_url = CASE
           WHEN provider_profiles.avatar_url IS NULL OR provider_profiles.avatar_url = ''
           THEN excluded.avatar_url
           ELSE provider_profiles.avatar_url
         END`,
    )
    .run({
      ...input,
      avatarUrl: input.avatarUrl ?? null,
      hasDryer: input.hasDryer ? 1 : 0,
      isFounder: input.isFounder ? 1 : 0,
      categoryId,
      now,
    });
  db().prepare("UPDATE providers SET category_id = ? WHERE id = ?").run(categoryId, input.userId);
}

export function getProfile(userId: string): ProfileRow | undefined {
  return db()
    .prepare(
      `SELECT ${PROFILE_SELECT}
       FROM provider_profiles p JOIN users u ON u.id = p.user_id
       WHERE p.user_id = ?`,
    )
    .get(userId) as ProfileRow | undefined;
}

export function listAvatarUrls() {
  const rows = db()
    .prepare(
      `SELECT user_id, avatar_url FROM provider_profiles
       WHERE avatar_url IS NOT NULL AND avatar_url != ''`,
    )
    .all() as { user_id: string; avatar_url: string }[];
  return Object.fromEntries(rows.map((row) => [row.user_id, row.avatar_url]));
}

export function listProfilesInBox(
  box: { south: number; north: number; west: number; east: number },
  categoryIds?: string[],
) {
  const cats = categoryIds?.filter(Boolean) ?? [];
  const inList = cats.length
    ? `AND COALESCE(p.category_id, 'camasir') IN (${cats.map((_, i) => `@c${i}`).join(",")})`
    : "";
  const params: Record<string, number | string> = { ...box };
  cats.forEach((id, i) => {
    params[`c${i}`] = id;
  });
  return db()
    .prepare(
      `SELECT ${PROFILE_SELECT}
       FROM provider_profiles p JOIN users u ON u.id = p.user_id
       WHERE p.status = 'active' AND p.verification_status != 'rejected'
         AND p.lat BETWEEN @south AND @north
         AND p.lng BETWEEN @west AND @east
         ${inList}`,
    )
    .all(params) as ProfileRow[];
}

export function updateProfileFields(
  userId: string,
  patch: {
    bio?: string;
    lat?: number;
    lng?: number;
    neighborhood?: string;
    hasDryer?: boolean;
    status?: "active" | "paused";
    categoryId?: string;
  },
) {
  const current = getProfile(userId);
  if (!current) return undefined;
  const now = new Date().toISOString();
  db()
    .prepare(
      `UPDATE provider_profiles SET
         bio = @bio, lat = @lat, lng = @lng, neighborhood = @neighborhood,
         has_dryer = @hasDryer, status = @status, category_id = @categoryId, updated_at = @now
       WHERE user_id = @userId`,
    )
    .run({
      userId,
      bio: patch.bio ?? current.bio,
      lat: patch.lat ?? current.lat,
      lng: patch.lng ?? current.lng,
      neighborhood: patch.neighborhood ?? current.neighborhood,
      hasDryer: (patch.hasDryer ?? Boolean(current.has_dryer)) ? 1 : 0,
      status: patch.status ?? current.status,
      categoryId: patch.categoryId ?? current.category_id ?? "camasir",
      now,
    });
  db()
    .prepare("UPDATE providers SET category_id = ? WHERE id = ?")
    .run(patch.categoryId ?? current.category_id ?? "camasir", userId);
  return getProfile(userId);
}

export function upsertPackage(row: Omit<PackageRow, "is_active" | "category_id"> & {
  is_active?: number;
  category_id?: string | null;
}) {
  db()
    .prepare(
      `INSERT INTO service_packages (
         id, provider_id, name, price_per_kg, min_order_amount,
         express_available, express_surcharge_pct, is_active, category_id
       ) VALUES (
         @id, @provider_id, @name, @price_per_kg, @min_order_amount,
         @express_available, @express_surcharge_pct, @is_active, @category_id
       )
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         price_per_kg = excluded.price_per_kg,
         min_order_amount = excluded.min_order_amount,
         express_available = excluded.express_available,
         express_surcharge_pct = excluded.express_surcharge_pct`,
    )
    .run({ is_active: 1, category_id: "camasir", ...row });
}

export function listPackages(providerId: string, activeOnly = true): PackageRow[] {
  const sql = activeOnly
    ? `SELECT * FROM service_packages WHERE provider_id = ? AND is_active = 1`
    : `SELECT * FROM service_packages WHERE provider_id = ?`;
  return db().prepare(sql).all(providerId) as PackageRow[];
}

export function upsertDrop(row: DropRow) {
  db()
    .prepare(
      `INSERT INTO provider_drop_points (id, provider_id, label, lat, lng, is_active)
       VALUES (@id, @provider_id, @label, @lat, @lng, @is_active)
       ON CONFLICT(id) DO UPDATE SET
         label = excluded.label, lat = excluded.lat, lng = excluded.lng`,
    )
    .run(row);
}

export function listDrops(providerId: string, activeOnly = true): DropRow[] {
  const sql = activeOnly
    ? `SELECT * FROM provider_drop_points WHERE provider_id = ? AND is_active = 1`
    : `SELECT * FROM provider_drop_points WHERE provider_id = ?`;
  return db().prepare(sql).all(providerId) as DropRow[];
}

export function insertDrop(input: { providerId: string; label: string; lat: number; lng: number }): DropRow {
  const row: DropRow = {
    id: randomUUID(),
    provider_id: input.providerId,
    label: input.label,
    lat: input.lat,
    lng: input.lng,
    is_active: 1,
  };
  db()
    .prepare(
      `INSERT INTO provider_drop_points (id, provider_id, label, lat, lng, is_active)
       VALUES (@id, @provider_id, @label, @lat, @lng, @is_active)`,
    )
    .run(row);
  return row;
}

export function countSlots(providerId: string) {
  const row = db()
    .prepare("SELECT COUNT(*) AS n FROM availability_slots WHERE provider_id = ?")
    .get(providerId) as { n: number };
  return row.n;
}

export function insertSlotRow(row: SlotRow) {
  db()
    .prepare(
      `INSERT INTO availability_slots (
         id, provider_id, day_of_week, start_time, end_time, delivery_mode, is_active
       ) VALUES (
         @id, @provider_id, @day_of_week, @start_time, @end_time, @delivery_mode, @is_active
       )`,
    )
    .run(row);
}

export function listSlots(providerId: string, activeOnly = true): SlotRow[] {
  const sql = activeOnly
    ? `SELECT * FROM availability_slots WHERE provider_id = ? AND is_active = 1
       ORDER BY day_of_week, start_time`
    : `SELECT * FROM availability_slots WHERE provider_id = ? ORDER BY day_of_week, start_time`;
  return db().prepare(sql).all(providerId) as SlotRow[];
}

export function insertSlot(input: {
  providerId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  deliveryMode: "door" | "point" | "both";
}): SlotRow {
  const row: SlotRow = {
    id: randomUUID(),
    provider_id: input.providerId,
    day_of_week: input.dayOfWeek,
    start_time: input.startTime,
    end_time: input.endTime,
    delivery_mode: input.deliveryMode,
    is_active: 1,
  };
  insertSlotRow(row);
  return row;
}

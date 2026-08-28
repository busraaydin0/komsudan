import { randomUUID } from "node:crypto";
import { db } from "./client";
import type {
  PreserveKind,
  PreserveMaterial,
  PreservePickup,
  PreservePriceUnit,
  PreserveStorage,
  ProviderPreserve,
} from "@/lib/types";

export type PreserveRow = {
  id: string;
  provider_id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  kind_salca: number;
  kind_tarhana: number;
  kind_eriste: number;
  kind_manti: number;
  kind_sarma: number;
  kind_dondurucu: number;
  kind_other: number;
  portion: string | null;
  ingredients: string | null;
  material: string;
  price: number;
  price_unit: string;
  min_order: number;
  lead_days: number | null;
  notice_days: number | null;
  store_frozen: number;
  store_fresh: number;
  store_dried: number;
  store_jarred: number;
  pick_adres: number;
  pick_nokta: number;
  season: string | null;
  allergens: string | null;
  notes: string | null;
  is_active: number;
  created_at: string;
};

export type PreserveWrite = {
  name: string;
  description?: string | null;
  photoUrl?: string | null;
  kinds?: PreserveKind;
  portion?: string | null;
  ingredients?: string | null;
  material?: PreserveMaterial;
  price: number;
  priceUnit?: PreservePriceUnit;
  minOrder?: number;
  leadDays?: number | null;
  noticeDays?: number | null;
  storage?: PreserveStorage;
  pickup?: PreservePickup;
  season?: string | null;
  allergens?: string | null;
  notes?: string | null;
  isActive?: boolean;
};

function asMaterial(raw: string | null | undefined): PreserveMaterial {
  if (raw === "provider" || raw === "customer" || raw === "together") return raw;
  return "provider";
}

function asUnit(raw: string | null | undefined): PreservePriceUnit {
  if (raw === "kg" || raw === "porsiyon" || raw === "paket" || raw === "tepsi" || raw === "adet") return raw;
  return "kg";
}

function flagRows(input: PreserveWrite) {
  const k = input.kinds;
  const s = input.storage;
  const p = input.pickup;
  return {
    kind_salca: k?.salca ? 1 : 0,
    kind_tarhana: k?.tarhana ? 1 : 0,
    kind_eriste: k?.eriste ? 1 : 0,
    kind_manti: k?.manti ? 1 : 0,
    kind_sarma: k?.sarma ? 1 : 0,
    kind_dondurucu: k?.dondurucu ? 1 : 0,
    kind_other: k?.other ? 1 : 0,
    store_frozen: s?.frozen ? 1 : 0,
    store_fresh: s?.fresh ? 1 : 0,
    store_dried: s?.dried ? 1 : 0,
    store_jarred: s?.jarred ? 1 : 0,
    pick_adres: p?.adres ? 1 : 0,
    pick_nokta: p?.nokta ? 1 : 0,
  };
}

export function toPublicPreserve(row: PreserveRow): ProviderPreserve {
  return {
    id: row.id,
    name: row.name,
    description: row.description || null,
    photoUrl: row.photo_url || null,
    kinds: {
      salca: Boolean(row.kind_salca),
      tarhana: Boolean(row.kind_tarhana),
      eriste: Boolean(row.kind_eriste),
      manti: Boolean(row.kind_manti),
      sarma: Boolean(row.kind_sarma),
      dondurucu: Boolean(row.kind_dondurucu),
      other: Boolean(row.kind_other),
    },
    portion: row.portion || null,
    ingredients: row.ingredients || null,
    material: asMaterial(row.material),
    price: row.price,
    priceUnit: asUnit(row.price_unit),
    minOrder: row.min_order,
    leadDays: row.lead_days,
    noticeDays: row.notice_days,
    storage: {
      frozen: Boolean(row.store_frozen),
      fresh: Boolean(row.store_fresh),
      dried: Boolean(row.store_dried),
      jarred: Boolean(row.store_jarred),
    },
    pickup: { adres: Boolean(row.pick_adres), nokta: Boolean(row.pick_nokta) },
    season: row.season || null,
    allergens: row.allergens || null,
    notes: row.notes || null,
    isActive: Boolean(row.is_active),
  };
}

export function listPreserves(providerId: string, activeOnly = true): PreserveRow[] {
  const sql = activeOnly
    ? `SELECT * FROM provider_preserves WHERE provider_id = ? AND is_active = 1 ORDER BY created_at ASC`
    : `SELECT * FROM provider_preserves WHERE provider_id = ? ORDER BY created_at ASC`;
  return db().prepare(sql).all(providerId) as PreserveRow[];
}

export function getPreserve(id: string): PreserveRow | undefined {
  return db().prepare("SELECT * FROM provider_preserves WHERE id = ?").get(id) as PreserveRow | undefined;
}

export function countPreserves(providerId: string, activeOnly = true) {
  const sql = activeOnly
    ? `SELECT COUNT(*) AS n FROM provider_preserves WHERE provider_id = ? AND is_active = 1`
    : `SELECT COUNT(*) AS n FROM provider_preserves WHERE provider_id = ?`;
  return (db().prepare(sql).get(providerId) as { n: number }).n;
}

const PRESERVE_COLUMNS = `id, provider_id, name, description, photo_url,
         kind_salca, kind_tarhana, kind_eriste, kind_manti, kind_sarma, kind_dondurucu, kind_other,
         portion, ingredients, material, price, price_unit, min_order, lead_days, notice_days,
         store_frozen, store_fresh, store_dried, store_jarred, pick_adres, pick_nokta,
         season, allergens, notes, is_active, created_at`;

const PRESERVE_PLACEHOLDERS = `@id, @provider_id, @name, @description, @photo_url,
         @kind_salca, @kind_tarhana, @kind_eriste, @kind_manti, @kind_sarma, @kind_dondurucu, @kind_other,
         @portion, @ingredients, @material, @price, @price_unit, @min_order, @lead_days, @notice_days,
         @store_frozen, @store_fresh, @store_dried, @store_jarred, @pick_adres, @pick_nokta,
         @season, @allergens, @notes, @is_active, @created_at`;

export function upsertPreserve(row: {
  id: string;
  provider_id: string;
  name: string;
  description?: string | null;
  kinds?: PreserveKind;
  portion?: string | null;
  ingredients?: string | null;
  material?: PreserveMaterial;
  price: number;
  priceUnit?: PreservePriceUnit;
  minOrder?: number;
  leadDays?: number | null;
  noticeDays?: number | null;
  storage?: PreserveStorage;
  pickup?: PreservePickup;
  season?: string | null;
  allergens?: string | null;
  notes?: string | null;
}) {
  const now = new Date().toISOString();
  const flags = flagRows(row);
  db()
    .prepare(
      `INSERT INTO provider_preserves (
         ${PRESERVE_COLUMNS}
       ) VALUES (
         @id, @provider_id, @name, @description, NULL,
         @kind_salca, @kind_tarhana, @kind_eriste, @kind_manti, @kind_sarma, @kind_dondurucu, @kind_other,
         @portion, @ingredients, @material, @price, @price_unit, @min_order, @lead_days, @notice_days,
         @store_frozen, @store_fresh, @store_dried, @store_jarred, @pick_adres, @pick_nokta,
         @season, @allergens, @notes, 1, @now
       )
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         description = excluded.description,
         kind_salca = excluded.kind_salca,
         kind_tarhana = excluded.kind_tarhana,
         kind_eriste = excluded.kind_eriste,
         kind_manti = excluded.kind_manti,
         kind_sarma = excluded.kind_sarma,
         kind_dondurucu = excluded.kind_dondurucu,
         kind_other = excluded.kind_other,
         portion = excluded.portion,
         ingredients = excluded.ingredients,
         material = excluded.material,
         price = excluded.price,
         price_unit = excluded.price_unit,
         min_order = excluded.min_order,
         lead_days = excluded.lead_days,
         notice_days = excluded.notice_days,
         store_frozen = excluded.store_frozen,
         store_fresh = excluded.store_fresh,
         store_dried = excluded.store_dried,
         store_jarred = excluded.store_jarred,
         pick_adres = excluded.pick_adres,
         pick_nokta = excluded.pick_nokta,
         season = excluded.season,
         allergens = excluded.allergens,
         notes = excluded.notes,
         is_active = 1`,
    )
    .run({
      id: row.id,
      provider_id: row.provider_id,
      name: row.name,
      description: row.description ?? null,
      ...flags,
      portion: row.portion ?? null,
      ingredients: row.ingredients ?? null,
      material: row.material ?? "provider",
      price: row.price,
      price_unit: row.priceUnit ?? "kg",
      min_order: row.minOrder ?? 1,
      lead_days: row.leadDays ?? null,
      notice_days: row.noticeDays ?? null,
      season: row.season ?? null,
      allergens: row.allergens ?? null,
      notes: row.notes ?? null,
      now,
    });
}

export function insertPreserve(providerId: string, input: PreserveWrite): PreserveRow {
  const flags = flagRows(input);
  const row = {
    id: randomUUID(),
    provider_id: providerId,
    name: input.name,
    description: input.description ?? null,
    photo_url: input.photoUrl ?? null,
    ...flags,
    portion: input.portion ?? null,
    ingredients: input.ingredients ?? null,
    material: input.material ?? "provider",
    price: input.price,
    price_unit: input.priceUnit ?? "kg",
    min_order: input.minOrder ?? 1,
    lead_days: input.leadDays ?? null,
    notice_days: input.noticeDays ?? null,
    season: input.season ?? null,
    allergens: input.allergens ?? null,
    notes: input.notes ?? null,
    is_active: input.isActive === false ? 0 : 1,
    created_at: new Date().toISOString(),
  };
  db()
    .prepare(
      `INSERT INTO provider_preserves (
         ${PRESERVE_COLUMNS}
       ) VALUES (
         ${PRESERVE_PLACEHOLDERS}
       )`,
    )
    .run(row);
  return getPreserve(row.id)!;
}

export function updatePreserve(id: string, providerId: string, input: PreserveWrite): PreserveRow | undefined {
  const current = getPreserve(id);
  if (!current || current.provider_id !== providerId) return undefined;
  const flags = flagRows(input);
  db()
    .prepare(
      `UPDATE provider_preserves SET
         name = @name,
         description = @description,
         photo_url = @photo_url,
         kind_salca = @kind_salca,
         kind_tarhana = @kind_tarhana,
         kind_eriste = @kind_eriste,
         kind_manti = @kind_manti,
         kind_sarma = @kind_sarma,
         kind_dondurucu = @kind_dondurucu,
         kind_other = @kind_other,
         portion = @portion,
         ingredients = @ingredients,
         material = @material,
         price = @price,
         price_unit = @price_unit,
         min_order = @min_order,
         lead_days = @lead_days,
         notice_days = @notice_days,
         store_frozen = @store_frozen,
         store_fresh = @store_fresh,
         store_dried = @store_dried,
         store_jarred = @store_jarred,
         pick_adres = @pick_adres,
         pick_nokta = @pick_nokta,
         season = @season,
         allergens = @allergens,
         notes = @notes,
         is_active = @is_active
       WHERE id = @id AND provider_id = @providerId`,
    )
    .run({
      id,
      providerId,
      name: input.name,
      description: input.description ?? null,
      photo_url: input.photoUrl === undefined ? current.photo_url : input.photoUrl,
      ...flags,
      portion: input.portion ?? null,
      ingredients: input.ingredients ?? null,
      material: input.material ?? "provider",
      price: input.price,
      price_unit: input.priceUnit ?? "kg",
      min_order: input.minOrder ?? 1,
      lead_days: input.leadDays ?? null,
      notice_days: input.noticeDays ?? null,
      season: input.season ?? null,
      allergens: input.allergens ?? null,
      notes: input.notes ?? null,
      is_active: input.isActive === false ? 0 : 1,
    });
  return getPreserve(id);
}

export function setPreservePhotoUrl(id: string, providerId: string, url: string | null) {
  const result = db()
    .prepare("UPDATE provider_preserves SET photo_url = ? WHERE id = ? AND provider_id = ?")
    .run(url, id, providerId);
  return result.changes > 0;
}

export function deactivatePreserve(id: string, providerId: string) {
  const result = db()
    .prepare(
      `UPDATE provider_preserves SET is_active = 0
       WHERE id = ? AND provider_id = ? AND is_active = 1`,
    )
    .run(id, providerId);
  return result.changes > 0;
}

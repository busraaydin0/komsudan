import { randomUUID } from "node:crypto";
import { db } from "./client";
import type {
  CarpetClean,
  CarpetKind,
  CarpetPickup,
  CarpetSize,
  ProviderCarpet,
} from "@/lib/types";

export type CarpetRow = {
  id: string;
  provider_id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  kind_hali: number;
  kind_kilim: number;
  kind_yolluk: number;
  kind_other: number;
  size_kucuk: number;
  size_orta: number;
  size_buyuk: number;
  size_xl: number;
  min_order: number;
  clean_genel: number;
  clean_leke: number;
  clean_koku: number;
  clean_ozel: number;
  price: number;
  lead_days: number | null;
  pick_adres: number;
  pick_nokta: number;
  ready_at: string | null;
  products: string | null;
  notice_days: number | null;
  notes: string | null;
  is_active: number;
  created_at: string;
};

export type CarpetWrite = {
  name: string;
  description?: string | null;
  photoUrl?: string | null;
  kinds?: CarpetKind;
  sizes?: CarpetSize;
  minOrder?: number;
  cleans?: CarpetClean;
  price: number;
  leadDays?: number | null;
  pickup?: CarpetPickup;
  readyAt?: string | null;
  products?: string | null;
  noticeDays?: number | null;
  notes?: string | null;
  isActive?: boolean;
};

function flagRows(input: CarpetWrite) {
  const k = input.kinds;
  const s = input.sizes;
  const c = input.cleans;
  const p = input.pickup;
  return {
    kind_hali: k?.hali ? 1 : 0,
    kind_kilim: k?.kilim ? 1 : 0,
    kind_yolluk: k?.yolluk ? 1 : 0,
    kind_other: k?.other ? 1 : 0,
    size_kucuk: s?.kucuk ? 1 : 0,
    size_orta: s?.orta ? 1 : 0,
    size_buyuk: s?.buyuk ? 1 : 0,
    size_xl: s?.xl ? 1 : 0,
    clean_genel: c?.genel ? 1 : 0,
    clean_leke: c?.leke ? 1 : 0,
    clean_koku: c?.koku ? 1 : 0,
    clean_ozel: c?.ozel ? 1 : 0,
    pick_adres: p?.adres ? 1 : 0,
    pick_nokta: p?.nokta ? 1 : 0,
  };
}

export function toPublicCarpet(row: CarpetRow): ProviderCarpet {
  return {
    id: row.id,
    name: row.name,
    description: row.description || null,
    photoUrl: row.photo_url || null,
    kinds: {
      hali: Boolean(row.kind_hali),
      kilim: Boolean(row.kind_kilim),
      yolluk: Boolean(row.kind_yolluk),
      other: Boolean(row.kind_other),
    },
    sizes: {
      kucuk: Boolean(row.size_kucuk),
      orta: Boolean(row.size_orta),
      buyuk: Boolean(row.size_buyuk),
      xl: Boolean(row.size_xl),
    },
    minOrder: row.min_order,
    cleans: {
      genel: Boolean(row.clean_genel),
      leke: Boolean(row.clean_leke),
      koku: Boolean(row.clean_koku),
      ozel: Boolean(row.clean_ozel),
    },
    price: row.price,
    leadDays: row.lead_days,
    pickup: { adres: Boolean(row.pick_adres), nokta: Boolean(row.pick_nokta) },
    readyAt: row.ready_at || null,
    products: row.products || null,
    noticeDays: row.notice_days,
    notes: row.notes || null,
    isActive: Boolean(row.is_active),
  };
}

export function listCarpets(providerId: string, activeOnly = true): CarpetRow[] {
  const sql = activeOnly
    ? `SELECT * FROM provider_carpets WHERE provider_id = ? AND is_active = 1 ORDER BY created_at ASC`
    : `SELECT * FROM provider_carpets WHERE provider_id = ? ORDER BY created_at ASC`;
  return db().prepare(sql).all(providerId) as CarpetRow[];
}

export function getCarpet(id: string): CarpetRow | undefined {
  return db().prepare("SELECT * FROM provider_carpets WHERE id = ?").get(id) as CarpetRow | undefined;
}

export function countCarpets(providerId: string, activeOnly = true) {
  const sql = activeOnly
    ? `SELECT COUNT(*) AS n FROM provider_carpets WHERE provider_id = ? AND is_active = 1`
    : `SELECT COUNT(*) AS n FROM provider_carpets WHERE provider_id = ?`;
  return (db().prepare(sql).get(providerId) as { n: number }).n;
}

const CARPET_COLUMNS = `id, provider_id, name, description, photo_url,
         kind_hali, kind_kilim, kind_yolluk, kind_other,
         size_kucuk, size_orta, size_buyuk, size_xl, min_order,
         clean_genel, clean_leke, clean_koku, clean_ozel, price, lead_days,
         pick_adres, pick_nokta, ready_at, products, notice_days, notes, is_active, created_at`;

const CARPET_PLACEHOLDERS = `@id, @provider_id, @name, @description, @photo_url,
         @kind_hali, @kind_kilim, @kind_yolluk, @kind_other,
         @size_kucuk, @size_orta, @size_buyuk, @size_xl, @min_order,
         @clean_genel, @clean_leke, @clean_koku, @clean_ozel, @price, @lead_days,
         @pick_adres, @pick_nokta, @ready_at, @products, @notice_days, @notes, @is_active, @created_at`;

export function upsertCarpet(row: {
  id: string;
  provider_id: string;
  name: string;
  description?: string | null;
  kinds?: CarpetKind;
  sizes?: CarpetSize;
  minOrder?: number;
  cleans?: CarpetClean;
  price: number;
  leadDays?: number | null;
  pickup?: CarpetPickup;
  readyAt?: string | null;
  products?: string | null;
  noticeDays?: number | null;
  notes?: string | null;
}) {
  const now = new Date().toISOString();
  const flags = flagRows(row);
  db()
    .prepare(
      `INSERT INTO provider_carpets (
         ${CARPET_COLUMNS}
       ) VALUES (
         @id, @provider_id, @name, @description, NULL,
         @kind_hali, @kind_kilim, @kind_yolluk, @kind_other,
         @size_kucuk, @size_orta, @size_buyuk, @size_xl, @min_order,
         @clean_genel, @clean_leke, @clean_koku, @clean_ozel, @price, @lead_days,
         @pick_adres, @pick_nokta, @ready_at, @products, @notice_days, @notes, 1, @now
       )
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         description = excluded.description,
         kind_hali = excluded.kind_hali,
         kind_kilim = excluded.kind_kilim,
         kind_yolluk = excluded.kind_yolluk,
         kind_other = excluded.kind_other,
         size_kucuk = excluded.size_kucuk,
         size_orta = excluded.size_orta,
         size_buyuk = excluded.size_buyuk,
         size_xl = excluded.size_xl,
         min_order = excluded.min_order,
         clean_genel = excluded.clean_genel,
         clean_leke = excluded.clean_leke,
         clean_koku = excluded.clean_koku,
         clean_ozel = excluded.clean_ozel,
         price = excluded.price,
         lead_days = excluded.lead_days,
         pick_adres = excluded.pick_adres,
         pick_nokta = excluded.pick_nokta,
         ready_at = excluded.ready_at,
         products = excluded.products,
         notice_days = excluded.notice_days,
         notes = excluded.notes,
         is_active = 1`,
    )
    .run({
      id: row.id,
      provider_id: row.provider_id,
      name: row.name,
      description: row.description ?? null,
      ...flags,
      min_order: row.minOrder ?? 1,
      price: row.price,
      lead_days: row.leadDays ?? null,
      ready_at: row.readyAt ?? null,
      products: row.products ?? null,
      notice_days: row.noticeDays ?? null,
      notes: row.notes ?? null,
      now,
    });
}

export function insertCarpet(providerId: string, input: CarpetWrite): CarpetRow {
  const flags = flagRows(input);
  const row = {
    id: randomUUID(),
    provider_id: providerId,
    name: input.name,
    description: input.description ?? null,
    photo_url: input.photoUrl ?? null,
    ...flags,
    min_order: input.minOrder ?? 1,
    price: input.price,
    lead_days: input.leadDays ?? null,
    ready_at: input.readyAt ?? null,
    products: input.products ?? null,
    notice_days: input.noticeDays ?? null,
    notes: input.notes ?? null,
    is_active: input.isActive === false ? 0 : 1,
    created_at: new Date().toISOString(),
  };
  db()
    .prepare(
      `INSERT INTO provider_carpets (
         ${CARPET_COLUMNS}
       ) VALUES (
         ${CARPET_PLACEHOLDERS}
       )`,
    )
    .run(row);
  return getCarpet(row.id)!;
}

export function updateCarpet(id: string, providerId: string, input: CarpetWrite): CarpetRow | undefined {
  const current = getCarpet(id);
  if (!current || current.provider_id !== providerId) return undefined;
  const flags = flagRows(input);
  db()
    .prepare(
      `UPDATE provider_carpets SET
         name = @name,
         description = @description,
         photo_url = @photo_url,
         kind_hali = @kind_hali,
         kind_kilim = @kind_kilim,
         kind_yolluk = @kind_yolluk,
         kind_other = @kind_other,
         size_kucuk = @size_kucuk,
         size_orta = @size_orta,
         size_buyuk = @size_buyuk,
         size_xl = @size_xl,
         min_order = @min_order,
         clean_genel = @clean_genel,
         clean_leke = @clean_leke,
         clean_koku = @clean_koku,
         clean_ozel = @clean_ozel,
         price = @price,
         lead_days = @lead_days,
         pick_adres = @pick_adres,
         pick_nokta = @pick_nokta,
         ready_at = @ready_at,
         products = @products,
         notice_days = @notice_days,
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
      min_order: input.minOrder ?? 1,
      price: input.price,
      lead_days: input.leadDays ?? null,
      ready_at: input.readyAt ?? null,
      products: input.products ?? null,
      notice_days: input.noticeDays ?? null,
      notes: input.notes ?? null,
      is_active: input.isActive === false ? 0 : 1,
    });
  return getCarpet(id);
}

export function setCarpetPhotoUrl(id: string, providerId: string, url: string | null) {
  const result = db()
    .prepare("UPDATE provider_carpets SET photo_url = ? WHERE id = ? AND provider_id = ?")
    .run(url, id, providerId);
  return result.changes > 0;
}

export function deactivateCarpet(id: string, providerId: string) {
  const result = db()
    .prepare(
      `UPDATE provider_carpets SET is_active = 0
       WHERE id = ? AND provider_id = ? AND is_active = 1`,
    )
    .run(id, providerId);
  return result.changes > 0;
}

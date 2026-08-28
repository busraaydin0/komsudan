import { randomUUID } from "node:crypto";
import { db } from "./client";
import type {
  PrintAvail,
  PrintColor,
  PrintFile,
  PrintPaper,
  PrintPickup,
  PrintSend,
  PrintSides,
  ProviderPrint,
} from "@/lib/types";

export type PrintRow = {
  id: string;
  provider_id: string;
  name: string;
  photo_url: string | null;
  color_bw: number;
  color_renkli: number;
  paper_a4: number;
  side_tek: number;
  side_cift: number;
  file_pdf: number;
  file_word: number;
  file_image: number;
  file_other: number;
  price: number;
  min_pages: number;
  duration_min: number | null;
  send_app: number;
  send_email: number;
  send_other: number;
  pick_adres: number;
  pick_nokta: number;
  avail: string;
  work_hours: string | null;
  notes: string | null;
  is_active: number;
  created_at: string;
};

export type PrintWrite = {
  name: string;
  photoUrl?: string | null;
  colors?: PrintColor;
  paper?: PrintPaper;
  sides?: PrintSides;
  files?: PrintFile;
  price: number;
  minPages?: number;
  durationMin?: number | null;
  send?: PrintSend;
  pickup?: PrintPickup;
  avail?: PrintAvail;
  workHours?: string | null;
  notes?: string | null;
  isActive?: boolean;
};

function asAvail(raw: string | null | undefined): PrintAvail {
  if (raw === "hemen" || raw === "saat" || raw === "randevu") return raw;
  return "hemen";
}

function flagRows(input: PrintWrite) {
  const c = input.colors;
  const p = input.paper;
  const s = input.sides;
  const f = input.files;
  const g = input.send;
  const k = input.pickup;
  return {
    color_bw: c?.bw ? 1 : 0,
    color_renkli: c?.color ? 1 : 0,
    paper_a4: p?.a4 ? 1 : 0,
    side_tek: s?.tek ? 1 : 0,
    side_cift: s?.cift ? 1 : 0,
    file_pdf: f?.pdf ? 1 : 0,
    file_word: f?.word ? 1 : 0,
    file_image: f?.image ? 1 : 0,
    file_other: f?.other ? 1 : 0,
    send_app: g?.app ? 1 : 0,
    send_email: g?.email ? 1 : 0,
    send_other: g?.other ? 1 : 0,
    pick_adres: k?.adres ? 1 : 0,
    pick_nokta: k?.nokta ? 1 : 0,
  };
}

export function toPublicPrint(row: PrintRow): ProviderPrint {
  return {
    id: row.id,
    name: row.name,
    photoUrl: row.photo_url || null,
    colors: { bw: Boolean(row.color_bw), color: Boolean(row.color_renkli) },
    paper: { a4: Boolean(row.paper_a4) },
    sides: { tek: Boolean(row.side_tek), cift: Boolean(row.side_cift) },
    files: {
      pdf: Boolean(row.file_pdf),
      word: Boolean(row.file_word),
      image: Boolean(row.file_image),
      other: Boolean(row.file_other),
    },
    price: row.price,
    minPages: row.min_pages,
    durationMin: row.duration_min,
    send: {
      app: Boolean(row.send_app),
      email: Boolean(row.send_email),
      other: Boolean(row.send_other),
    },
    pickup: { adres: Boolean(row.pick_adres), nokta: Boolean(row.pick_nokta) },
    avail: asAvail(row.avail),
    workHours: row.work_hours || null,
    notes: row.notes || null,
    isActive: Boolean(row.is_active),
  };
}

export function listPrints(providerId: string, activeOnly = true): PrintRow[] {
  const sql = activeOnly
    ? `SELECT * FROM provider_prints WHERE provider_id = ? AND is_active = 1 ORDER BY created_at ASC`
    : `SELECT * FROM provider_prints WHERE provider_id = ? ORDER BY created_at ASC`;
  return db().prepare(sql).all(providerId) as PrintRow[];
}

export function getPrint(id: string): PrintRow | undefined {
  return db().prepare("SELECT * FROM provider_prints WHERE id = ?").get(id) as PrintRow | undefined;
}

export function countPrints(providerId: string, activeOnly = true) {
  const sql = activeOnly
    ? `SELECT COUNT(*) AS n FROM provider_prints WHERE provider_id = ? AND is_active = 1`
    : `SELECT COUNT(*) AS n FROM provider_prints WHERE provider_id = ?`;
  return (db().prepare(sql).get(providerId) as { n: number }).n;
}

const PRINT_COLUMNS = `id, provider_id, name, photo_url,
         color_bw, color_renkli, paper_a4, side_tek, side_cift,
         file_pdf, file_word, file_image, file_other, price, min_pages, duration_min,
         send_app, send_email, send_other, pick_adres, pick_nokta,
         avail, work_hours, notes, is_active, created_at`;

const PRINT_PLACEHOLDERS = `@id, @provider_id, @name, @photo_url,
         @color_bw, @color_renkli, @paper_a4, @side_tek, @side_cift,
         @file_pdf, @file_word, @file_image, @file_other, @price, @min_pages, @duration_min,
         @send_app, @send_email, @send_other, @pick_adres, @pick_nokta,
         @avail, @work_hours, @notes, @is_active, @created_at`;

export function upsertPrint(row: {
  id: string;
  provider_id: string;
  name: string;
  colors?: PrintColor;
  paper?: PrintPaper;
  sides?: PrintSides;
  files?: PrintFile;
  price: number;
  minPages?: number;
  durationMin?: number | null;
  send?: PrintSend;
  pickup?: PrintPickup;
  avail?: PrintAvail;
  workHours?: string | null;
  notes?: string | null;
}) {
  const now = new Date().toISOString();
  const flags = flagRows(row);
  db()
    .prepare(
      `INSERT INTO provider_prints (
         ${PRINT_COLUMNS}
       ) VALUES (
         @id, @provider_id, @name, NULL,
         @color_bw, @color_renkli, @paper_a4, @side_tek, @side_cift,
         @file_pdf, @file_word, @file_image, @file_other, @price, @min_pages, @duration_min,
         @send_app, @send_email, @send_other, @pick_adres, @pick_nokta,
         @avail, @work_hours, @notes, 1, @now
       )
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         color_bw = excluded.color_bw,
         color_renkli = excluded.color_renkli,
         paper_a4 = excluded.paper_a4,
         side_tek = excluded.side_tek,
         side_cift = excluded.side_cift,
         file_pdf = excluded.file_pdf,
         file_word = excluded.file_word,
         file_image = excluded.file_image,
         file_other = excluded.file_other,
         price = excluded.price,
         min_pages = excluded.min_pages,
         duration_min = excluded.duration_min,
         send_app = excluded.send_app,
         send_email = excluded.send_email,
         send_other = excluded.send_other,
         pick_adres = excluded.pick_adres,
         pick_nokta = excluded.pick_nokta,
         avail = excluded.avail,
         work_hours = excluded.work_hours,
         notes = excluded.notes,
         is_active = 1`,
    )
    .run({
      id: row.id,
      provider_id: row.provider_id,
      name: row.name,
      ...flags,
      price: row.price,
      min_pages: row.minPages ?? 1,
      duration_min: row.durationMin ?? null,
      avail: row.avail ?? "hemen",
      work_hours: row.workHours ?? null,
      notes: row.notes ?? null,
      now,
    });
}

export function insertPrint(providerId: string, input: PrintWrite): PrintRow {
  const flags = flagRows(input);
  const row = {
    id: randomUUID(),
    provider_id: providerId,
    name: input.name,
    photo_url: input.photoUrl ?? null,
    ...flags,
    price: input.price,
    min_pages: input.minPages ?? 1,
    duration_min: input.durationMin ?? null,
    avail: input.avail ?? "hemen",
    work_hours: input.workHours ?? null,
    notes: input.notes ?? null,
    is_active: input.isActive === false ? 0 : 1,
    created_at: new Date().toISOString(),
  };
  db()
    .prepare(
      `INSERT INTO provider_prints (
         ${PRINT_COLUMNS}
       ) VALUES (
         ${PRINT_PLACEHOLDERS}
       )`,
    )
    .run(row);
  return getPrint(row.id)!;
}

export function updatePrint(id: string, providerId: string, input: PrintWrite): PrintRow | undefined {
  const current = getPrint(id);
  if (!current || current.provider_id !== providerId) return undefined;
  const flags = flagRows(input);
  db()
    .prepare(
      `UPDATE provider_prints SET
         name = @name,
         photo_url = @photo_url,
         color_bw = @color_bw,
         color_renkli = @color_renkli,
         paper_a4 = @paper_a4,
         side_tek = @side_tek,
         side_cift = @side_cift,
         file_pdf = @file_pdf,
         file_word = @file_word,
         file_image = @file_image,
         file_other = @file_other,
         price = @price,
         min_pages = @min_pages,
         duration_min = @duration_min,
         send_app = @send_app,
         send_email = @send_email,
         send_other = @send_other,
         pick_adres = @pick_adres,
         pick_nokta = @pick_nokta,
         avail = @avail,
         work_hours = @work_hours,
         notes = @notes,
         is_active = @is_active
       WHERE id = @id AND provider_id = @providerId`,
    )
    .run({
      id,
      providerId,
      name: input.name,
      photo_url: input.photoUrl === undefined ? current.photo_url : input.photoUrl,
      ...flags,
      price: input.price,
      min_pages: input.minPages ?? 1,
      duration_min: input.durationMin ?? null,
      avail: input.avail ?? "hemen",
      work_hours: input.workHours ?? null,
      notes: input.notes ?? null,
      is_active: input.isActive === false ? 0 : 1,
    });
  return getPrint(id);
}

export function setPrintPhotoUrl(id: string, providerId: string, url: string | null) {
  const result = db()
    .prepare("UPDATE provider_prints SET photo_url = ? WHERE id = ? AND provider_id = ?")
    .run(url, id, providerId);
  return result.changes > 0;
}

export function deactivatePrint(id: string, providerId: string) {
  const result = db()
    .prepare(
      `UPDATE provider_prints SET is_active = 0
       WHERE id = ? AND provider_id = ? AND is_active = 1`,
    )
    .run(id, providerId);
  return result.changes > 0;
}

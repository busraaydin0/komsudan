import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { canAddPhotos } from "@/lib/status";
import type { OrderStatus, WorkPhoto } from "@/lib/types";
import { db, uploadsDir } from "./db";
import { ApiError } from "./rules";

export const PHOTO_MAX = 4;
export const PHOTO_BYTES = 2.5 * 1024 * 1024;

type PhotoRow = {
  id: string;
  order_id: string;
  provider_id: string;
  mime: string;
  ext: string;
  created_at: string;
};

function toPhoto(row: PhotoRow): WorkPhoto {
  return { id: row.id, url: `/api/photos/${row.id}`, createdAt: row.created_at };
}

function sniff(buf: Buffer): { mime: string; ext: string } | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return { mime: "image/png", ext: "png" };
  }
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { mime: "image/webp", ext: "webp" };
  }
  return null;
}

export function photosForOrder(orderId: string): WorkPhoto[] {
  const rows = db()
    .prepare("SELECT * FROM order_photos WHERE order_id = ? ORDER BY created_at ASC")
    .all(orderId) as PhotoRow[];
  return rows.map(toPhoto);
}

export function photosForProvider(providerId: string, limit = 8): WorkPhoto[] {
  const rows = db()
    .prepare(
      `SELECT * FROM order_photos
       WHERE provider_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
    )
    .all(providerId, limit) as PhotoRow[];
  return rows.map(toPhoto);
}

export function addPhoto(orderId: string, buf: Buffer): WorkPhoto {
  const order = db()
    .prepare("SELECT id, provider_id, status FROM orders WHERE id = ?")
    .get(orderId) as { id: string; provider_id: string; status: string } | undefined;
  if (!order) throw new ApiError(404, "Sipariş yok.");
  if (!canAddPhotos(order.status as OrderStatus)) {
    throw new ApiError(409, "Bu aşamada fotoğraf eklenmez.");
  }

  const kind = sniff(buf);
  if (!kind) throw new ApiError(400, "Yalnızca JPEG, PNG veya WebP.");
  if (buf.length > PHOTO_BYTES) throw new ApiError(400, "Fotoğraf 2,5 MB’ı geçemesin.");

  const count = (
    db().prepare("SELECT COUNT(*) AS n FROM order_photos WHERE order_id = ?").get(orderId) as {
      n: number;
    }
  ).n;
  if (count >= PHOTO_MAX) throw new ApiError(409, `En fazla ${PHOTO_MAX} fotoğraf.`);

  const id = randomUUID().slice(0, 12);
  const now = new Date().toISOString();
  const file = path.join(uploadsDir(), `${id}.${kind.ext}`);
  fs.writeFileSync(file, buf);
  db()
    .prepare(
      `INSERT INTO order_photos (id, order_id, provider_id, mime, ext, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(id, orderId, order.provider_id, kind.mime, kind.ext, now);
  return toPhoto({
    id,
    order_id: orderId,
    provider_id: order.provider_id,
    mime: kind.mime,
    ext: kind.ext,
    created_at: now,
  });
}

export function readPhoto(id: string): { buf: Buffer; mime: string } | undefined {
  const row = db().prepare("SELECT * FROM order_photos WHERE id = ?").get(id) as
    | PhotoRow
    | undefined;
  if (!row) return undefined;
  const file = path.join(uploadsDir(), `${row.id}.${row.ext}`);
  if (!fs.existsSync(file)) return undefined;
  return { buf: fs.readFileSync(file), mime: row.mime };
}

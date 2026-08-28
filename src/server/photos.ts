import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { canAddPhotos } from "@/lib/status";
import type { OrderPhotoKind, OrderStatus, WorkPhoto } from "@/lib/types";
import { db, uploadsDir } from "./db";
import { ApiError } from "./rules";
import { setUserAvatar } from "@/lib/db/auth";
import { countOrderPhotos, insertOrderPhoto, listOrderPhotoRows } from "@/lib/db/orderPhotos";
import { getProduct, setProductPhotoUrl } from "@/lib/db/products";
import { getService, setServicePhotoUrl } from "@/lib/db/services";
import { getRepair, setRepairPhotoUrl } from "@/lib/db/repairs";
import { getTech, setTechPhotoUrl } from "@/lib/db/tech";
import { getWash, setWashPhotoUrl } from "@/lib/db/washes";
import { getCourier, setCourierPhotoUrl } from "@/lib/db/couriers";
import { getGarden, setGardenPhotoUrl } from "@/lib/db/gardens";
import { getCargo, setCargoPhotoUrl } from "@/lib/db/cargos";
import { getPrint, setPrintPhotoUrl } from "@/lib/db/prints";

export const PHOTO_MAX = 4;
export const PORTFOLIO_MAX = 16;
export const PHOTO_BYTES = 2.5 * 1024 * 1024;

type OrderPhotoRow = {
  id: string;
  provider_id: string;
  mime: string;
  ext: string;
  created_at: string;
};

type GalleryRow = {
  id: string;
  provider_id: string;
  order_id: string | null;
  review_id: string | null;
  kind: string;
  mime: string;
  ext: string;
  created_at: string;
};

function toPhoto(id: string, createdAt: string, kind?: string): WorkPhoto {
  return { id, url: `/api/photos/${id}`, createdAt, kind };
}

function sniff(buf: Buffer): { mime: string; ext: string } | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
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

function writeFile(buf: Buffer) {
  const kind = sniff(buf);
  if (!kind) throw new ApiError(400, "Yalnızca JPEG, PNG veya WebP.");
  if (buf.length > PHOTO_BYTES) throw new ApiError(400, "Fotoğraf 2,5 MB’ı geçemesin.");
  const id = randomUUID().slice(0, 12);
  fs.writeFileSync(path.join(uploadsDir(), `${id}.${kind.ext}`), buf);
  return { id, ...kind, now: new Date().toISOString() };
}

function unlinkPhotoFile(id: string, ext: string) {
  const file = path.join(uploadsDir(), `${id}.${ext}`);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

export function storeImage(buf: Buffer) {
  return writeFile(buf);
}

export async function parsePhotoUpload(req: Request) {
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();
    const f = form.get("file");
    if (!(f instanceof File) || f.size === 0) throw new ApiError(400, "Fotoğraf seç.", "VALIDATION_ERROR");
    const kindRaw = String(form.get("kind") ?? "").trim();
    return { buf: Buffer.from(await f.arrayBuffer()), kind: kindRaw || undefined };
  }
  const buf = Buffer.from(await req.arrayBuffer());
  if (!buf.length) throw new ApiError(400, "Fotoğraf seç.", "VALIDATION_ERROR");
  return { buf, kind: undefined as string | undefined };
}

export async function bufferFromUpload(req: Request) {
  return (await parsePhotoUpload(req)).buf;
}

export function photosForOrder(orderId: string): WorkPhoto[] {
  const orderRows = listOrderPhotoRows(orderId);
  const extra = db()
    .prepare(
      "SELECT * FROM gallery_photos WHERE order_id = ? AND kind = 'order' ORDER BY created_at ASC",
    )
    .all(orderId) as GalleryRow[];
  return [
    ...orderRows.map((r) => toPhoto(r.id, r.created_at, r.kind)),
    ...extra.map((r) => toPhoto(r.id, r.created_at, r.kind)),
  ];
}

export function photosForReview(reviewId: string): WorkPhoto[] {
  const rows = db()
    .prepare("SELECT * FROM gallery_photos WHERE review_id = ? ORDER BY created_at ASC")
    .all(reviewId) as GalleryRow[];
  return rows.map((r) => toPhoto(r.id, r.created_at));
}

export function workPhotosForProvider(providerId: string, limit = 12): WorkPhoto[] {
  const portfolio = db()
    .prepare(
      `SELECT * FROM gallery_photos WHERE provider_id = ? AND kind = 'portfolio'
       ORDER BY created_at DESC`,
    )
    .all(providerId) as GalleryRow[];
  const fromOrders = db()
    .prepare(
      `SELECT * FROM order_photos WHERE provider_id = ? ORDER BY created_at DESC LIMIT ?`,
    )
    .all(providerId, limit) as OrderPhotoRow[];
  const seen = new Set<string>();
  const out: WorkPhoto[] = [];
  for (const row of [...portfolio, ...fromOrders.map((r) => ({ ...r, kind: "order" }))]) {
    if (seen.has(row.id) || out.length >= limit) continue;
    seen.add(row.id);
    out.push(toPhoto(row.id, row.created_at));
  }
  return out;
}

export function addPhoto(orderId: string, buf: Buffer, kind: OrderPhotoKind = "dropoff"): WorkPhoto {
  const order = db()
    .prepare("SELECT id, provider_id, status FROM orders WHERE id = ?")
    .get(orderId) as { id: string; provider_id: string; status: string } | undefined;
  if (!order) throw new ApiError(404, "Sipariş yok.");
  if (!canAddPhotos(order.status as OrderStatus)) {
    throw new ApiError(409, "Bu aşamada fotoğraf eklenmez.");
  }
  const extra = (
    db()
      .prepare("SELECT COUNT(*) AS n FROM gallery_photos WHERE order_id = ? AND kind = 'order'")
      .get(orderId) as { n: number }
  ).n;
  if (countOrderPhotos(orderId) + extra >= PHOTO_MAX) {
    throw new ApiError(409, `En fazla ${PHOTO_MAX} fotoğraf.`);
  }
  const file = writeFile(buf);
  insertOrderPhoto({
    id: file.id,
    order_id: orderId,
    provider_id: order.provider_id,
    mime: file.mime,
    ext: file.ext,
    created_at: file.now,
    kind,
  });
  return toPhoto(file.id, file.now, kind);
}

export function addPortfolioPhoto(ownerId: string, buf: Buffer): WorkPhoto {
  const exists = db().prepare("SELECT id FROM users WHERE id = ?").get(ownerId);
  if (!exists) throw new ApiError(404, "Hesap bulunamadı.");
  const n = (
    db()
      .prepare("SELECT COUNT(*) AS n FROM gallery_photos WHERE provider_id = ? AND kind = 'portfolio'")
      .get(ownerId) as { n: number }
  ).n;
  if (n >= PORTFOLIO_MAX) throw new ApiError(409, `En fazla ${PORTFOLIO_MAX} iş fotoğrafı.`);
  const file = writeFile(buf);
  db()
    .prepare(
      `INSERT INTO gallery_photos (id, provider_id, order_id, review_id, kind, mime, ext, created_at)
       VALUES (?, ?, NULL, NULL, 'portfolio', ?, ?, ?)`,
    )
    .run(file.id, ownerId, file.mime, file.ext, file.now);
  return toPhoto(file.id, file.now);
}

export function portfolioForUser(userId: string, limit = 16): WorkPhoto[] {
  const rows = db()
    .prepare(
      `SELECT * FROM gallery_photos WHERE provider_id = ? AND kind = 'portfolio'
       ORDER BY created_at DESC LIMIT ?`,
    )
    .all(userId, limit) as GalleryRow[];
  return rows.map((r) => toPhoto(r.id, r.created_at));
}

export function deletePortfolioForUser(userId: string) {
  const rows = db()
    .prepare(
      `SELECT id, ext FROM gallery_photos WHERE provider_id = ? AND kind IN ('portfolio', 'avatar')`,
    )
    .all(userId) as { id: string; ext: string }[];
  for (const row of rows) unlinkPhotoFile(row.id, row.ext);
  db()
    .prepare(`DELETE FROM gallery_photos WHERE provider_id = ? AND kind IN ('portfolio', 'avatar')`)
    .run(userId);
}

export function deletePortfolioPhoto(userId: string, photoId: string) {
  const row = db()
    .prepare(
      `SELECT id, ext FROM gallery_photos WHERE id = ? AND provider_id = ? AND kind = 'portfolio'`,
    )
    .get(photoId, userId) as { id: string; ext: string } | undefined;
  if (!row) throw new ApiError(404, "Fotoğraf yok.", "NOT_FOUND");
  unlinkPhotoFile(row.id, row.ext);
  db().prepare("DELETE FROM gallery_photos WHERE id = ?").run(row.id);
}

export function setAvatarPhoto(userId: string, buf: Buffer) {
  const exists = db().prepare("SELECT id FROM users WHERE id = ?").get(userId);
  if (!exists) throw new ApiError(404, "Hesap bulunamadı.");
  const old = db()
    .prepare(`SELECT id, ext FROM gallery_photos WHERE provider_id = ? AND kind = 'avatar'`)
    .all(userId) as { id: string; ext: string }[];
  for (const row of old) unlinkPhotoFile(row.id, row.ext);
  db().prepare(`DELETE FROM gallery_photos WHERE provider_id = ? AND kind = 'avatar'`).run(userId);
  const file = writeFile(buf);
  db()
    .prepare(
      `INSERT INTO gallery_photos (id, provider_id, order_id, review_id, kind, mime, ext, created_at)
       VALUES (?, ?, NULL, NULL, 'avatar', ?, ?, ?)`,
    )
    .run(file.id, userId, file.mime, file.ext, file.now);
  const url = `/api/photos/${file.id}`;
  setUserAvatar(userId, url);
  return url;
}

export function setProductPhoto(userId: string, productId: string, buf: Buffer): string {
  const product = getProduct(productId);
  if (!product || product.provider_id !== userId) {
    throw new ApiError(404, "Ürün bulunamadı.");
  }
  const file = writeFile(buf);
  db()
    .prepare(
      `INSERT INTO gallery_photos (id, provider_id, order_id, review_id, kind, mime, ext, created_at)
       VALUES (?, ?, NULL, NULL, 'product', ?, ?, ?)`,
    )
    .run(file.id, userId, file.mime, file.ext, file.now);
  const url = `/api/photos/${file.id}`;
  setProductPhotoUrl(productId, userId, url);
  return url;
}

export function setServicePhoto(userId: string, serviceId: string, buf: Buffer): string {
  const service = getService(serviceId);
  if (!service || service.provider_id !== userId) {
    throw new ApiError(404, "Hizmet bulunamadı.");
  }
  const file = writeFile(buf);
  db()
    .prepare(
      `INSERT INTO gallery_photos (id, provider_id, order_id, review_id, kind, mime, ext, created_at)
       VALUES (?, ?, NULL, NULL, 'service', ?, ?, ?)`,
    )
    .run(file.id, userId, file.mime, file.ext, file.now);
  const url = `/api/photos/${file.id}`;
  setServicePhotoUrl(serviceId, userId, url);
  return url;
}

export function setRepairPhoto(userId: string, repairId: string, buf: Buffer): string {
  const repair = getRepair(repairId);
  if (!repair || repair.provider_id !== userId) {
    throw new ApiError(404, "Hizmet bulunamadı.");
  }
  const file = writeFile(buf);
  db()
    .prepare(
      `INSERT INTO gallery_photos (id, provider_id, order_id, review_id, kind, mime, ext, created_at)
       VALUES (?, ?, NULL, NULL, 'repair', ?, ?, ?)`,
    )
    .run(file.id, userId, file.mime, file.ext, file.now);
  const url = `/api/photos/${file.id}`;
  setRepairPhotoUrl(repairId, userId, url);
  return url;
}

export function setTechPhoto(userId: string, techId: string, buf: Buffer): string {
  const tech = getTech(techId);
  if (!tech || tech.provider_id !== userId) {
    throw new ApiError(404, "Hizmet bulunamadı.");
  }
  const file = writeFile(buf);
  db()
    .prepare(
      `INSERT INTO gallery_photos (id, provider_id, order_id, review_id, kind, mime, ext, created_at)
       VALUES (?, ?, NULL, NULL, 'tech', ?, ?, ?)`,
    )
    .run(file.id, userId, file.mime, file.ext, file.now);
  const url = `/api/photos/${file.id}`;
  setTechPhotoUrl(techId, userId, url);
  return url;
}

export function setWashPhoto(userId: string, washId: string, buf: Buffer): string {
  const wash = getWash(washId);
  if (!wash || wash.provider_id !== userId) {
    throw new ApiError(404, "Hizmet bulunamadı.");
  }
  const file = writeFile(buf);
  db()
    .prepare(
      `INSERT INTO gallery_photos (id, provider_id, order_id, review_id, kind, mime, ext, created_at)
       VALUES (?, ?, NULL, NULL, 'wash', ?, ?, ?)`,
    )
    .run(file.id, userId, file.mime, file.ext, file.now);
  const url = `/api/photos/${file.id}`;
  setWashPhotoUrl(washId, userId, url);
  return url;
}

export function setCourierPhoto(userId: string, courierId: string, buf: Buffer): string {
  const courier = getCourier(courierId);
  if (!courier || courier.provider_id !== userId) {
    throw new ApiError(404, "Hizmet bulunamadı.");
  }
  const file = writeFile(buf);
  db()
    .prepare(
      `INSERT INTO gallery_photos (id, provider_id, order_id, review_id, kind, mime, ext, created_at)
       VALUES (?, ?, NULL, NULL, 'courier', ?, ?, ?)`,
    )
    .run(file.id, userId, file.mime, file.ext, file.now);
  const url = `/api/photos/${file.id}`;
  setCourierPhotoUrl(courierId, userId, url);
  return url;
}

export function setGardenPhoto(userId: string, gardenId: string, buf: Buffer): string {
  const garden = getGarden(gardenId);
  if (!garden || garden.provider_id !== userId) {
    throw new ApiError(404, "Hizmet bulunamadı.");
  }
  const file = writeFile(buf);
  db()
    .prepare(
      `INSERT INTO gallery_photos (id, provider_id, order_id, review_id, kind, mime, ext, created_at)
       VALUES (?, ?, NULL, NULL, 'garden', ?, ?, ?)`,
    )
    .run(file.id, userId, file.mime, file.ext, file.now);
  const url = `/api/photos/${file.id}`;
  setGardenPhotoUrl(gardenId, userId, url);
  return url;
}

export function setCargoPhoto(userId: string, cargoId: string, buf: Buffer): string {
  const cargo = getCargo(cargoId);
  if (!cargo || cargo.provider_id !== userId) {
    throw new ApiError(404, "Hizmet bulunamadı.");
  }
  const file = writeFile(buf);
  db()
    .prepare(
      `INSERT INTO gallery_photos (id, provider_id, order_id, review_id, kind, mime, ext, created_at)
       VALUES (?, ?, NULL, NULL, 'cargo', ?, ?, ?)`,
    )
    .run(file.id, userId, file.mime, file.ext, file.now);
  const url = `/api/photos/${file.id}`;
  setCargoPhotoUrl(cargoId, userId, url);
  return url;
}

export function setPrintPhoto(userId: string, printId: string, buf: Buffer): string {
  const print = getPrint(printId);
  if (!print || print.provider_id !== userId) {
    throw new ApiError(404, "Hizmet bulunamadı.");
  }
  const file = writeFile(buf);
  db()
    .prepare(
      `INSERT INTO gallery_photos (id, provider_id, order_id, review_id, kind, mime, ext, created_at)
       VALUES (?, ?, NULL, NULL, 'print', ?, ?, ?)`,
    )
    .run(file.id, userId, file.mime, file.ext, file.now);
  const url = `/api/photos/${file.id}`;
  setPrintPhotoUrl(printId, userId, url);
  return url;
}

export function addReviewPhoto(reviewId: string, buf: Buffer): WorkPhoto {
  const review = db()
    .prepare("SELECT id, provider_id FROM reviews WHERE id = ?")
    .get(reviewId) as { id: string; provider_id: string } | undefined;
  if (!review) throw new ApiError(404, "Yorum yok.");
  const n = photosForReview(reviewId).length;
  if (n >= PHOTO_MAX) throw new ApiError(409, `Yoruma en fazla ${PHOTO_MAX} fotoğraf.`);
  const file = writeFile(buf);
  db()
    .prepare(
      `INSERT INTO gallery_photos (id, provider_id, order_id, review_id, kind, mime, ext, created_at)
       VALUES (?, ?, NULL, ?, 'review', ?, ?, ?)`,
    )
    .run(file.id, review.provider_id, reviewId, file.mime, file.ext, file.now);
  return toPhoto(file.id, file.now);
}

export function readPhoto(id: string): { buf: Buffer; mime: string } | undefined {
  const order = db().prepare("SELECT * FROM order_photos WHERE id = ?").get(id) as
    | OrderPhotoRow
    | undefined;
  const gallery = order
    ? null
    : (db().prepare("SELECT * FROM gallery_photos WHERE id = ?").get(id) as GalleryRow | undefined);
  const row = order ?? gallery;
  if (!row) return undefined;
  const file = path.join(uploadsDir(), `${row.id}.${row.ext}`);
  if (!fs.existsSync(file)) return undefined;
  return { buf: fs.readFileSync(file), mime: row.mime };
}

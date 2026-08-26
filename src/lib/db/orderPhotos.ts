import { db } from "./client";

export type OrderPhotoRow = {
  id: string;
  order_id: string;
  provider_id: string;
  mime: string;
  ext: string;
  created_at: string;
  kind: string;
};

export function listOrderPhotoRows(orderId: string): OrderPhotoRow[] {
  return db()
    .prepare("SELECT * FROM order_photos WHERE order_id = ? ORDER BY created_at ASC")
    .all(orderId) as OrderPhotoRow[];
}

export function countOrderPhotos(orderId: string) {
  const row = db()
    .prepare("SELECT COUNT(*) AS n FROM order_photos WHERE order_id = ?")
    .get(orderId) as { n: number };
  return row.n;
}

export function insertOrderPhoto(row: OrderPhotoRow) {
  db()
    .prepare(
      `INSERT INTO order_photos (id, order_id, provider_id, mime, ext, created_at, kind)
       VALUES (@id, @order_id, @provider_id, @mime, @ext, @created_at, @kind)`,
    )
    .run(row);
}

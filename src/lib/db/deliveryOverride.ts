import { randomUUID } from "node:crypto";
import { db } from "./client";

export type DeliveryOverrideRow = {
  id: string;
  order_id: string;
  provider_id: string;
  photo_id: string;
  lat: number | null;
  lng: number | null;
  note: string;
  status: "pending" | "approved" | "rejected";
  admin_reason: string | null;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
};

export function insertDeliveryOverride(input: {
  orderId: string;
  providerId: string;
  photoId: string;
  lat?: number;
  lng?: number;
  note: string;
  at: string;
}): DeliveryOverrideRow {
  const id = `ov-${randomUUID().slice(0, 8)}`;
  db()
    .prepare(
      `INSERT INTO delivery_override_requests (
        id, order_id, provider_id, photo_id, lat, lng, note, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    )
    .run(
      id,
      input.orderId,
      input.providerId,
      input.photoId,
      input.lat ?? null,
      input.lng ?? null,
      input.note.slice(0, 500),
      input.at,
    );
  return getDeliveryOverrideByOrder(input.orderId)!;
}

export function getDeliveryOverrideByOrder(orderId: string): DeliveryOverrideRow | undefined {
  return db()
    .prepare(`SELECT * FROM delivery_override_requests WHERE order_id = ?`)
    .get(orderId) as DeliveryOverrideRow | undefined;
}

export function resolveDeliveryOverride(
  id: string,
  status: "approved" | "rejected",
  adminId: string,
  reason: string,
  at: string,
) {
  db()
    .prepare(
      `UPDATE delivery_override_requests
       SET status = ?, admin_reason = ?, resolved_at = ?, resolved_by = ?
       WHERE id = ?`,
    )
    .run(status, reason.slice(0, 500), at, adminId, id);
}

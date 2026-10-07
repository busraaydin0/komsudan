import { randomUUID } from "node:crypto";
import { db } from "./client";

export type AppointmentKind = "pickup" | "delivery";

export type AppointmentRow = {
  id: string;
  order_id: string;
  kind: AppointmentKind;
  date: string;
  window_start: string;
  window_end: string;
  created_at: string;
};

export function listAppointmentsForOrder(orderId: string): AppointmentRow[] {
  return db()
    .prepare(`SELECT * FROM appointments WHERE order_id = ? ORDER BY kind`)
    .all(orderId) as AppointmentRow[];
}

export function getAppointment(orderId: string, kind: AppointmentKind): AppointmentRow | undefined {
  return db()
    .prepare(`SELECT * FROM appointments WHERE order_id = ? AND kind = ?`)
    .get(orderId, kind) as AppointmentRow | undefined;
}

export function insertAppointment(input: {
  orderId: string;
  kind: AppointmentKind;
  date: string;
  windowStart: string;
  windowEnd: string;
  at: string;
}): AppointmentRow {
  const id = `apt-${randomUUID().slice(0, 8)}`;
  db()
    .prepare(
      `INSERT INTO appointments (id, order_id, kind, date, window_start, window_end, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, input.orderId, input.kind, input.date, input.windowStart, input.windowEnd, input.at);
  return getAppointment(input.orderId, input.kind)!;
}

import { randomUUID } from "node:crypto";
import { db } from "./client";

export type AppointmentRow = {
  id: string;
  order_id: string;
  date: string;
  window_start: string;
  window_end: string;
  created_at: string;
};

export function getAppointmentForOrder(orderId: string): AppointmentRow | undefined {
  return db()
    .prepare("SELECT * FROM appointments WHERE order_id = ?")
    .get(orderId) as AppointmentRow | undefined;
}

export function insertAppointment(input: {
  orderId: string;
  date: string;
  windowStart: string;
  windowEnd: string;
  at: string;
}): AppointmentRow {
  const id = `apt-${randomUUID().slice(0, 8)}`;
  db()
    .prepare(
      `INSERT INTO appointments (id, order_id, date, window_start, window_end, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(id, input.orderId, input.date, input.windowStart, input.windowEnd, input.at);
  return getAppointmentForOrder(input.orderId)!;
}

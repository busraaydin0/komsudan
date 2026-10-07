import { db } from "./client";

export type HandoffKind = "pickup" | "return";

export type HandoffCodeRow = {
  order_id: string;
  kind: HandoffKind;
  code: string;
  attempts: number;
  locked: number;
  expires_at: string | null;
  used_at: string | null;
  entered_by: string | null;
  override_reason: string | null;
};

export function getHandoffCode(orderId: string, kind: HandoffKind): HandoffCodeRow | undefined {
  return db()
    .prepare(`SELECT * FROM handoff_codes WHERE order_id = ? AND kind = ?`)
    .get(orderId, kind) as HandoffCodeRow | undefined;
}

export function upsertHandoffCode(row: {
  orderId: string;
  kind: HandoffKind;
  code: string;
  expiresAt?: string | null;
}) {
  db()
    .prepare(
      `INSERT INTO handoff_codes (order_id, kind, code, attempts, locked, expires_at, used_at, entered_by, override_reason)
       VALUES (@orderId, @kind, @code, 0, 0, @expiresAt, NULL, NULL, NULL)
       ON CONFLICT(order_id, kind) DO UPDATE SET
         code = excluded.code,
         attempts = 0,
         locked = 0,
         expires_at = excluded.expires_at,
         used_at = NULL,
         entered_by = NULL,
         override_reason = NULL`,
    )
    .run({
      orderId: row.orderId,
      kind: row.kind,
      code: row.code,
      expiresAt: row.expiresAt ?? null,
    });
}

export function bumpHandoffAttempt(orderId: string, kind: HandoffKind, attempts: number, locked: boolean) {
  db()
    .prepare(`UPDATE handoff_codes SET attempts = ?, locked = ? WHERE order_id = ? AND kind = ?`)
    .run(attempts, locked ? 1 : 0, orderId, kind);
}

export function markHandoffUsed(orderId: string, kind: HandoffKind, enteredBy: string, at: string) {
  db()
    .prepare(
      `UPDATE handoff_codes SET used_at = ?, entered_by = ?, locked = 0 WHERE order_id = ? AND kind = ?`,
    )
    .run(at, enteredBy, orderId, kind);
}

export function rotateHandoffCode(orderId: string, kind: HandoffKind, code: string) {
  db()
    .prepare(
      `UPDATE handoff_codes SET code = ?, attempts = 0, locked = 0, used_at = NULL, entered_by = NULL WHERE order_id = ? AND kind = ?`,
    )
    .run(code, orderId, kind);
}

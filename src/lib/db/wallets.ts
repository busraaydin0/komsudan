import { randomUUID } from "node:crypto";
import { db } from "./client";

export type WalletRow = {
  user_id: string;
  balance: number;
  reserved: number;
  pending: number;
  updated_at: string;
};

export type LedgerRow = {
  id: string;
  user_id: string;
  amount: number;
  kind: string;
  method: string | null;
  order_id: string | null;
  created_at: string;
};

export type PendingEarningRow = {
  id: string;
  user_id: string;
  order_id: string;
  amount: number;
  available_at: string;
  released_at: string | null;
  created_at: string;
};

function asWallet(row: WalletRow | undefined): WalletRow | undefined {
  if (!row) return undefined;
  return {
    ...row,
    balance: row.balance ?? 0,
    reserved: row.reserved ?? 0,
    pending: row.pending ?? 0,
  };
}

export function getWalletRow(userId: string): WalletRow | undefined {
  return asWallet(db().prepare("SELECT * FROM wallets WHERE user_id = ?").get(userId) as WalletRow | undefined);
}

export function ensureWalletRow(userId: string, at: string): WalletRow {
  const existing = getWalletRow(userId);
  if (existing) return existing;
  const row: WalletRow = { user_id: userId, balance: 0, reserved: 0, pending: 0, updated_at: at };
  db()
    .prepare(
      `INSERT INTO wallets (user_id, balance, reserved, pending, updated_at)
       VALUES (@user_id, @balance, @reserved, @pending, @updated_at)`,
    )
    .run(row);
  return row;
}

export function addBalance(userId: string, delta: number, at: string) {
  if (delta === 0) return;
  const result = db()
    .prepare(
      `UPDATE wallets SET balance = balance + ?, updated_at = ?
       WHERE user_id = ? AND balance + ? >= 0`,
    )
    .run(delta, at, userId, delta);
  if (result.changes !== 1) {
    throw new Error("WALLET_NEGATIVE");
  }
}

/** 1 = düşüldü, 0 = yetersiz (değişiklik yok). */
export function tryDebit(userId: string, amount: number, at: string): 0 | 1 {
  const result = db()
    .prepare("UPDATE wallets SET balance = balance - ?, updated_at = ? WHERE user_id = ? AND balance >= ?")
    .run(amount, at, userId, amount);
  return result.changes === 1 ? 1 : 0;
}

/** balance → reserved. 1 = oldu, 0 = yetersiz. */
export function holdFromBalance(userId: string, amount: number, at: string): 0 | 1 {
  if (amount <= 0) return 1;
  const result = db()
    .prepare(
      `UPDATE wallets
       SET balance = balance - ?, reserved = reserved + ?, updated_at = ?
       WHERE user_id = ? AND balance >= ? AND reserved >= 0 AND pending >= 0`,
    )
    .run(amount, amount, at, userId, amount);
  return result.changes === 1 ? 1 : 0;
}

/** reserved → balance. 1 = oldu, 0 = rezerv yetersiz. */
export function releaseToBalance(userId: string, amount: number, at: string): 0 | 1 {
  if (amount <= 0) return 1;
  const result = db()
    .prepare(
      `UPDATE wallets
       SET reserved = reserved - ?, balance = balance + ?, updated_at = ?
       WHERE user_id = ? AND reserved >= ? AND pending >= 0`,
    )
    .run(amount, amount, at, userId, amount);
  return result.changes === 1 ? 1 : 0;
}

/** reserved düşer (harcandı). 1 = oldu. */
export function consumeReserved(userId: string, amount: number, at: string): 0 | 1 {
  if (amount <= 0) return 1;
  const result = db()
    .prepare(
      `UPDATE wallets SET reserved = reserved - ?, updated_at = ?
       WHERE user_id = ? AND reserved >= ? AND balance >= 0 AND pending >= 0`,
    )
    .run(amount, at, userId, amount);
  return result.changes === 1 ? 1 : 0;
}

/** pending += net. */
export function addPending(userId: string, amount: number, at: string): 0 | 1 {
  if (amount <= 0) return 1;
  const result = db()
    .prepare(
      `UPDATE wallets SET pending = pending + ?, updated_at = ?
       WHERE user_id = ? AND pending >= 0 AND reserved >= 0 AND balance >= 0`,
    )
    .run(amount, at, userId);
  return result.changes === 1 ? 1 : 0;
}

export function insertPendingEarning(input: {
  userId: string;
  orderId: string;
  amount: number;
  availableAt: string;
  at: string;
}): PendingEarningRow {
  const row: PendingEarningRow = {
    id: `wpe-${randomUUID().slice(0, 10)}`,
    user_id: input.userId,
    order_id: input.orderId,
    amount: input.amount,
    available_at: input.availableAt,
    released_at: null,
    created_at: input.at,
  };
  db()
    .prepare(
      `INSERT INTO wallet_pending_earnings (
         id, user_id, order_id, amount, available_at, released_at, created_at
       ) VALUES (
         @id, @user_id, @order_id, @amount, @available_at, @released_at, @created_at
       )`,
    )
    .run(row);
  return row;
}

export function getPendingEarningForOrder(orderId: string): PendingEarningRow | undefined {
  return db()
    .prepare("SELECT * FROM wallet_pending_earnings WHERE order_id = ?")
    .get(orderId) as PendingEarningRow | undefined;
}

export function listOpenPendingEarnings(userId: string): PendingEarningRow[] {
  return db()
    .prepare(
      `SELECT * FROM wallet_pending_earnings
       WHERE user_id = ? AND released_at IS NULL
       ORDER BY available_at ASC`,
    )
    .all(userId) as PendingEarningRow[];
}

export function nextPendingAvailableAt(userId: string): string | null {
  const row = db()
    .prepare(
      `SELECT available_at AS at FROM wallet_pending_earnings
       WHERE user_id = ? AND released_at IS NULL
       ORDER BY available_at ASC LIMIT 1`,
    )
    .get(userId) as { at: string } | undefined;
  return row?.at ?? null;
}

/** Vadesi gelen bekleyenleri pending → balance. Ledger satırlarını döner. */
export function releaseMaturedEarnings(userId: string, nowIso: string): LedgerRow[] {
  const due = db()
    .prepare(
      `SELECT * FROM wallet_pending_earnings
       WHERE user_id = ? AND released_at IS NULL AND available_at <= ?
       ORDER BY available_at ASC`,
    )
    .all(userId, nowIso) as PendingEarningRow[];
  const written: LedgerRow[] = [];
  for (const row of due) {
    const moved = db()
      .prepare(
        `UPDATE wallets
         SET pending = pending - ?, balance = balance + ?, updated_at = ?
         WHERE user_id = ? AND pending >= ? AND reserved >= 0 AND balance >= 0`,
      )
      .run(row.amount, row.amount, nowIso, userId, row.amount);
    if (moved.changes !== 1) continue;
    db()
      .prepare("UPDATE wallet_pending_earnings SET released_at = ? WHERE id = ?")
      .run(nowIso, row.id);
    written.push(
      insertLedger({
        userId,
        amount: row.amount,
        kind: "earn_release",
        orderId: row.order_id,
        at: nowIso,
      }),
    );
  }
  return written;
}

export function insertLedger(input: {
  userId: string;
  amount: number;
  kind: string;
  method?: string | null;
  orderId?: string | null;
  at: string;
}): LedgerRow {
  const row: LedgerRow = {
    id: `wl-${randomUUID().slice(0, 10)}`,
    user_id: input.userId,
    amount: input.amount,
    kind: input.kind,
    method: input.method ?? null,
    order_id: input.orderId ?? null,
    created_at: input.at,
  };
  db()
    .prepare(
      `INSERT INTO wallet_ledger (id, user_id, amount, kind, method, order_id, created_at)
       VALUES (@id, @user_id, @amount, @kind, @method, @order_id, @created_at)`,
    )
    .run(row);
  return row;
}

function absKindSum(orderId: string, kind: string): number {
  const row = db()
    .prepare(
      `SELECT COALESCE(SUM(ABS(amount)), 0) AS n
       FROM wallet_ledger WHERE order_id = ? AND kind = ?`,
    )
    .get(orderId, kind) as { n: number };
  return row.n;
}

export function remainingReservedForOrder(orderId: string): number {
  const held = absKindSum(orderId, "hold");
  const released = absKindSum(orderId, "release");
  const captured = absKindSum(orderId, "capture");
  const left = held - released - captured;
  return left > 0 ? left : 0;
}

export function hasHoldForOrder(orderId: string): boolean {
  const row = db()
    .prepare("SELECT id FROM wallet_ledger WHERE order_id = ? AND kind = 'hold' LIMIT 1")
    .get(orderId) as { id: string } | undefined;
  return Boolean(row);
}

export function hasEarnForOrder(orderId: string): boolean {
  const row = db()
    .prepare(
      `SELECT id FROM wallet_ledger
       WHERE order_id = ? AND kind IN ('earn', 'earn_pending') LIMIT 1`,
    )
    .get(orderId) as { id: string } | undefined;
  return Boolean(row);
}

export function hasReleaseForOrder(orderId: string): boolean {
  if (!hasHoldForOrder(orderId)) return false;
  if (hasCaptureForOrder(orderId)) return false;
  return remainingReservedForOrder(orderId) === 0;
}

export function hasCaptureForOrder(orderId: string): boolean {
  const row = db()
    .prepare("SELECT id FROM wallet_ledger WHERE order_id = ? AND kind = 'capture' LIMIT 1")
    .get(orderId) as { id: string } | undefined;
  return Boolean(row);
}

export function listRecentLedger(userId: string, limit = 12): LedgerRow[] {
  return db()
    .prepare("SELECT * FROM wallet_ledger WHERE user_id = ? ORDER BY created_at DESC LIMIT ?")
    .all(userId, limit) as LedgerRow[];
}

import { randomUUID } from "node:crypto";
import { db } from "./client";

export type WalletRow = {
  user_id: string;
  balance: number;
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

export function getWalletRow(userId: string): WalletRow | undefined {
  return db().prepare("SELECT * FROM wallets WHERE user_id = ?").get(userId) as WalletRow | undefined;
}

export function ensureWalletRow(userId: string, at: string): WalletRow {
  const existing = getWalletRow(userId);
  if (existing) return existing;
  const row: WalletRow = { user_id: userId, balance: 0, updated_at: at };
  db()
    .prepare("INSERT INTO wallets (user_id, balance, updated_at) VALUES (@user_id, @balance, @updated_at)")
    .run(row);
  return row;
}

export function addBalance(userId: string, delta: number, at: string) {
  db()
    .prepare("UPDATE wallets SET balance = balance + ?, updated_at = ? WHERE user_id = ?")
    .run(delta, at, userId);
}

/** 1 = düşüldü, 0 = yetersiz (değişiklik yok). */
export function tryDebit(userId: string, amount: number, at: string): 0 | 1 {
  const result = db()
    .prepare("UPDATE wallets SET balance = balance - ?, updated_at = ? WHERE user_id = ? AND balance >= ?")
    .run(amount, at, userId, amount);
  return result.changes === 1 ? 1 : 0;
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

export function hasHoldForOrder(orderId: string): boolean {
  const row = db()
    .prepare("SELECT id FROM wallet_ledger WHERE order_id = ? AND kind = 'hold' LIMIT 1")
    .get(orderId) as { id: string } | undefined;
  return Boolean(row);
}

export function hasReleaseForOrder(orderId: string): boolean {
  const row = db()
    .prepare("SELECT id FROM wallet_ledger WHERE order_id = ? AND kind = 'release' LIMIT 1")
    .get(orderId) as { id: string } | undefined;
  return Boolean(row);
}

export function listRecentLedger(userId: string, limit = 12): LedgerRow[] {
  return db()
    .prepare("SELECT * FROM wallet_ledger WHERE user_id = ? ORDER BY created_at DESC LIMIT ?")
    .all(userId, limit) as LedgerRow[];
}

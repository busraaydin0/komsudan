import { ApiError } from "@/lib/errors";
import { assertWalletWriteAllowed } from "@/lib/auth/staff";
import { db } from "@/lib/db/client";
import {
  addBalance,
  addPending,
  consumeReserved,
  ensureWalletRow,
  getPendingEarningForOrder,
  getWalletRow,
  hasCaptureForOrder,
  hasEarnForOrder,
  hasHoldForOrder,
  hasReleaseForOrder,
  holdFromBalance,
  insertLedger,
  insertPendingEarning,
  listRecentLedger,
  nextPendingAvailableAt,
  releaseMaturedEarnings as releaseMaturedRows,
  releaseToBalance,
  remainingReservedForOrder,
  tryDebit,
} from "@/lib/db/wallets";
import {
  INSUFFICIENT_BALANCE_MESSAGE,
  INSUFFICIENT_PAYOUT_MESSAGE,
  PAYOUT_METHODS,
  pendingEarningWaitMs,
  TOPUP_METHODS,
  type PayoutMethodId,
  type TopupMethodId,
} from "@/lib/walletMethods";

export type WalletPublic = {
  balance: number;
  reserved: number;
  pending: number;
  total: number;
  nextReleaseAt: string | null;
  canPay: 0 | 1;
  canWithdraw: 0 | 1;
  methods: typeof TOPUP_METHODS;
  payoutMethods: typeof PAYOUT_METHODS;
};

function nowIso(at?: string) {
  return at ?? new Date().toISOString();
}

export function canPay(balance: number, amount: number): 0 | 1 {
  if (amount <= 0) return 1;
  return balance >= amount ? 1 : 0;
}

export function releaseMaturedEarnings(userId: string, at?: string) {
  const when = nowIso(at);
  ensureWalletRow(userId, when);
  return db().transaction(() => releaseMaturedRows(userId, when))();
}

function snapshot(userId: string, amount: number): WalletPublic {
  const live = getWalletRow(userId)!;
  const reserved = live.reserved ?? 0;
  const pending = live.pending ?? 0;
  const balance = live.balance ?? 0;
  const gate = canPay(balance, amount);
  return {
    balance,
    reserved,
    pending,
    total: balance + reserved + pending,
    nextReleaseAt: nextPendingAvailableAt(userId),
    canPay: gate,
    canWithdraw: gate,
    methods: TOPUP_METHODS,
    payoutMethods: PAYOUT_METHODS,
  };
}

export function getWallet(userId: string, amount = 0, at?: string): WalletPublic {
  const when = nowIso(at);
  ensureWalletRow(userId, when);
  releaseMaturedEarnings(userId, when);
  return snapshot(userId, amount);
}

export function listWalletActivity(userId: string) {
  return listRecentLedger(userId).map((row) => ({
    id: row.id,
    amount: row.amount,
    kind: row.kind,
    method: row.method,
    orderId: row.order_id,
    createdAt: row.created_at,
  }));
}

export function topupWallet(userId: string, method: TopupMethodId, amount: number, at?: string) {
  assertWalletWriteAllowed(userId);
  const when = nowIso(at);
  ensureWalletRow(userId, when);
  db().transaction(() => {
    addBalance(userId, amount, when);
    insertLedger({ userId, amount, kind: "topup", method, at: when });
  })();
  return getWallet(userId, 0, when);
}

/** Sipariş öncesi: 0 ise sipariş yok. 1 ise bakiyeden rezerve. */
export function holdForOrder(userId: string, orderId: string, amount: number, at?: string) {
  if (amount <= 0) return;
  const when = nowIso(at);
  ensureWalletRow(userId, when);
  releaseMaturedEarnings(userId, when);
  db().transaction(() => {
    const gate = holdFromBalance(userId, amount, when);
    if (gate === 0) {
      throw new ApiError(402, INSUFFICIENT_BALANCE_MESSAGE, "INSUFFICIENT_BALANCE");
    }
    insertLedger({ userId, amount: -amount, kind: "hold", orderId, at: when });
  })();
}

export function releaseHold(userId: string, orderId: string, amount: number, at?: string) {
  if (amount <= 0) return;
  if (!hasHoldForOrder(orderId) || hasReleaseForOrder(orderId)) return;
  const when = nowIso(at);
  ensureWalletRow(userId, when);
  const remaining = remainingReservedForOrder(orderId);
  const take = Math.min(amount, remaining);
  if (take <= 0) return;
  db().transaction(() => {
    if (releaseToBalance(userId, take, when) === 0) return;
    insertLedger({ userId, amount: take, kind: "release", orderId, at: when });
  })();
}

/**
 * Teslimde müşteri rezervi harcanır; bakiyeye dönmez.
 * Hold yoksa 0 (kart/simüle — rezerv oynatılmaz).
 * Hold varken remaining !== amount ise hata: kısmi tahsil sessizce geçilmez.
 */
export function captureHold(userId: string, orderId: string, amount: number, at?: string): number {
  if (amount <= 0) return 0;
  if (hasCaptureForOrder(orderId)) return amount;
  if (!hasHoldForOrder(orderId)) return 0;
  const when = nowIso(at);
  ensureWalletRow(userId, when);
  const remaining = remainingReservedForOrder(orderId);
  if (remaining !== amount) {
    throw new ApiError(
      409,
      "Rezerv tutarı ödeme ile uyuşmuyor. Tahsil edilmedi.",
      "HOLD_CAPTURE_MISMATCH",
    );
  }
  db().transaction(() => {
    if (consumeReserved(userId, amount, when) === 0) {
      throw new ApiError(
        409,
        "Rezerv tutarı ödeme ile uyuşmuyor. Tahsil edilmedi.",
        "HOLD_CAPTURE_MISMATCH",
      );
    }
    insertLedger({ userId, amount: -amount, kind: "capture", orderId, at: when });
  })();
  return amount;
}

/** Kapıda tutar değişince rezervi yeni tutara çek. Eksikte INSUFFICIENT_BALANCE. */
export function adjustHoldForOrder(userId: string, orderId: string, nextAmount: number, at?: string) {
  if (!hasHoldForOrder(orderId) || hasCaptureForOrder(orderId)) return;
  const when = nowIso(at);
  const remaining = remainingReservedForOrder(orderId);
  const delta = nextAmount - remaining;
  if (delta === 0) return;
  if (delta > 0) holdForOrder(userId, orderId, delta, when);
  else releaseHold(userId, orderId, -delta, when);
}

/** Teslim tahsilinde komisyon düşülmüş net, hizmet verenin bekleyenine. */
export function creditOnCapture(providerId: string, orderId: string, net: number, at?: string) {
  if (net <= 0) return;
  if (hasEarnForOrder(orderId) || getPendingEarningForOrder(orderId)) return;
  const when = nowIso(at);
  ensureWalletRow(providerId, when);
  const availableAt = new Date(Date.parse(when) + pendingEarningWaitMs()).toISOString();
  db().transaction(() => {
    if (hasEarnForOrder(orderId) || getPendingEarningForOrder(orderId)) return;
    if (addPending(providerId, net, when) === 0) return;
    insertPendingEarning({
      userId: providerId,
      orderId,
      amount: net,
      availableAt,
      at: when,
    });
    insertLedger({ userId: providerId, amount: net, kind: "earn_pending", orderId, at: when });
  })();
}

export function withdrawWallet(userId: string, method: PayoutMethodId, amount: number, at?: string) {
  assertWalletWriteAllowed(userId);
  const when = nowIso(at);
  ensureWalletRow(userId, when);
  releaseMaturedEarnings(userId, when);
  const ok = db().transaction(() => {
    const gate = tryDebit(userId, amount, when);
    if (gate === 0) return false;
    insertLedger({ userId, amount: -amount, kind: "payout", method, at: when });
    return true;
  })();
  if (!ok) {
    throw new ApiError(402, INSUFFICIENT_PAYOUT_MESSAGE, "INSUFFICIENT_PAYOUT");
  }
  return getWallet(userId, 0, when);
}

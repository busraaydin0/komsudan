import { ApiError } from "@/server/rules";
import {
  addBalance,
  ensureWalletRow,
  getWalletRow,
  hasEarnForOrder,
  hasHoldForOrder,
  hasReleaseForOrder,
  insertLedger,
  listRecentLedger,
  tryDebit,
} from "@/lib/db/wallets";
import {
  INSUFFICIENT_BALANCE_MESSAGE,
  INSUFFICIENT_PAYOUT_MESSAGE,
  PAYOUT_METHODS,
  TOPUP_METHODS,
  type PayoutMethodId,
  type TopupMethodId,
} from "@/lib/walletMethods";

export type WalletPublic = {
  balance: number;
  canPay: 0 | 1;
  canWithdraw: 0 | 1;
  methods: typeof TOPUP_METHODS;
  payoutMethods: typeof PAYOUT_METHODS;
};

export function canPay(balance: number, amount: number): 0 | 1 {
  if (amount <= 0) return 1;
  return balance >= amount ? 1 : 0;
}

export function getWallet(userId: string, amount = 0): WalletPublic {
  const at = new Date().toISOString();
  const row = ensureWalletRow(userId, at);
  const live = getWalletRow(userId) ?? row;
  const gate = canPay(live.balance, amount);
  return {
    balance: live.balance,
    canPay: gate,
    canWithdraw: gate,
    methods: TOPUP_METHODS,
    payoutMethods: PAYOUT_METHODS,
  };
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

export function topupWallet(userId: string, method: TopupMethodId, amount: number) {
  const at = new Date().toISOString();
  ensureWalletRow(userId, at);
  addBalance(userId, amount, at);
  insertLedger({ userId, amount, kind: "topup", method, at });
  return getWallet(userId);
}

/** Sipariş öncesi: 0 ise sipariş yok. 1 ise bakiyeden düşer. */
export function holdForOrder(userId: string, orderId: string, amount: number) {
  if (amount <= 0) return;
  const at = new Date().toISOString();
  ensureWalletRow(userId, at);
  const gate = tryDebit(userId, amount, at);
  if (gate === 0) {
    throw new ApiError(402, INSUFFICIENT_BALANCE_MESSAGE, "INSUFFICIENT_BALANCE");
  }
  insertLedger({ userId, amount: -amount, kind: "hold", orderId, at });
}

export function releaseHold(userId: string, orderId: string, amount: number) {
  if (amount <= 0) return;
  if (!hasHoldForOrder(orderId) || hasReleaseForOrder(orderId)) return;
  const at = new Date().toISOString();
  ensureWalletRow(userId, at);
  addBalance(userId, amount, at);
  insertLedger({ userId, amount, kind: "release", orderId, at });
}

/** Teslim tahsilinde komisyon düşülmüş net, hizmet verenin bakiyesine. */
export function creditOnCapture(providerId: string, orderId: string, net: number) {
  if (net <= 0) return;
  if (hasEarnForOrder(orderId)) return;
  const at = new Date().toISOString();
  ensureWalletRow(providerId, at);
  addBalance(providerId, net, at);
  insertLedger({ userId: providerId, amount: net, kind: "earn", orderId, at });
}

export function withdrawWallet(userId: string, method: PayoutMethodId, amount: number) {
  const at = new Date().toISOString();
  ensureWalletRow(userId, at);
  const gate = tryDebit(userId, amount, at);
  if (gate === 0) {
    throw new ApiError(402, INSUFFICIENT_PAYOUT_MESSAGE, "INSUFFICIENT_PAYOUT");
  }
  insertLedger({ userId, amount: -amount, kind: "payout", method, at });
  return getWallet(userId);
}

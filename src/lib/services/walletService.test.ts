import { afterEach, describe, expect, it } from "vitest";
import { insertOrderRow } from "@/lib/db/orders";
import { getWalletRow } from "@/lib/db/wallets";
import { ApiError } from "@/lib/errors";
import { PENDING_EARNING_WAIT_MS, pendingEarningWaitMs } from "@/lib/walletMethods";
import { requestOtp, verifyOtp } from "./authService";
import {
  canPay,
  captureHold,
  creditOnCapture,
  getWallet,
  holdForOrder,
  releaseHold,
  topupWallet,
  withdrawWallet,
} from "./walletService";

function stubOrder(id: string) {
  const now = new Date().toISOString();
  insertOrderRow({
    id,
    provider_id: "elif",
    package_id: "yikama",
    express: 0,
    drop_method: "kapi",
    slot: "Bugün 10:00–11:00",
    note: "",
    total: 100,
    commission: 10,
    status: "pending",
    created_at: now,
    updated_at: now,
    user_id: null,
    delivery_mode: "door",
    scheduled_window_start: now,
    size: "orta",
    machine_units: 2,
  });
}

async function userFrom(phone: string) {
  const sent = requestOtp(phone);
  return (await verifyOtp(phone, sent.demoCode!)).user.id;
}

function laterThan(at: string) {
  return new Date(Date.parse(at) + PENDING_EARNING_WAIT_MS + 1000).toISOString();
}

describe("bakiye 0/1", () => {
  it("yetersiz bakiyede canPay 0, yeterliyse 1", () => {
    expect(canPay(0, 180)).toBe(0);
    expect(canPay(179, 180)).toBe(0);
    expect(canPay(180, 180)).toBe(1);
    expect(canPay(200, 180)).toBe(1);
  });

  it("hold yetersizse sipariş düşmez ve hata verir", async () => {
    const userId = await userFrom("5550000881");
    expect(getWallet(userId, 100).canPay).toBe(0);
    try {
      holdForOrder(userId, "k-test-hold-0", 100);
      expect.fail("hold geçmemeliydi");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).code).toBe("INSUFFICIENT_BALANCE");
    }
    expect(getWallet(userId).balance).toBe(0);
    expect(getWallet(userId).reserved).toBe(0);
    topupWallet(userId, "kart", 250);
    expect(getWallet(userId, 100).canPay).toBe(1);
    stubOrder("k-test-hold-1");
    holdForOrder(userId, "k-test-hold-1", 100);
    expect(getWallet(userId).balance).toBe(150);
    expect(getWallet(userId).reserved).toBe(100);
    expect(getWallet(userId).total).toBe(250);
  });

  it("tahsil net bekleyene yazar; 24 sa sonra çekilir", async () => {
    const userId = await userFrom("5550000882");
    stubOrder("k-earn-1");
    const at = "2026-10-29T12:00:00.000Z";
    creditOnCapture(userId, "k-earn-1", 90, at);
    creditOnCapture(userId, "k-earn-1", 90, at);
    const now = getWallet(userId, 0, at);
    expect(now.balance).toBe(0);
    expect(now.pending).toBe(90);
    try {
      withdrawWallet(userId, "iban", 90, at);
      expect.fail("çekim geçmemeliydi");
    } catch (e) {
      expect((e as ApiError).code).toBe("INSUFFICIENT_PAYOUT");
    }
    expect(getWallet(userId, 0, at).balance).toBe(0);
    const ripe = getWallet(userId, 0, laterThan(at));
    expect(ripe.balance).toBe(90);
    expect(ripe.pending).toBe(0);
    const next = withdrawWallet(userId, "papara", 90, laterThan(at));
    expect(next.balance).toBe(0);
    expect(getWallet(userId, 1, laterThan(at)).canWithdraw).toBe(0);
  });
});

describe("cüzdan kademeleri", () => {
  it("hold: balance→reserved; toplam değişmez", async () => {
    const userId = await userFrom("5550000883");
    topupWallet(userId, "kart", 200);
    stubOrder("k-tier-hold");
    const before = getWallet(userId).total;
    holdForOrder(userId, "k-tier-hold", 80);
    const w = getWallet(userId);
    expect(w.balance).toBe(120);
    expect(w.reserved).toBe(80);
    expect(w.pending).toBe(0);
    expect(w.total).toBe(before);
  });

  it("iptal/void: reserved→balance geri döner", async () => {
    const userId = await userFrom("5550000884");
    topupWallet(userId, "kart", 200);
    stubOrder("k-tier-void");
    holdForOrder(userId, "k-tier-void", 80);
    releaseHold(userId, "k-tier-void", 80);
    const w = getWallet(userId);
    expect(w.balance).toBe(200);
    expect(w.reserved).toBe(0);
    expect(w.total).toBe(200);
    releaseHold(userId, "k-tier-void", 80);
    expect(getWallet(userId).balance).toBe(200);
  });

  it("teslim: müşteri reserved düşer; veren pending = net, balance değişmez", async () => {
    const customerId = await userFrom("5550000885");
    const providerId = await userFrom("5550000886");
    topupWallet(customerId, "kart", 200);
    stubOrder("k-tier-cap");
    holdForOrder(customerId, "k-tier-cap", 100);
    captureHold(customerId, "k-tier-cap", 100);
    creditOnCapture(providerId, "k-tier-cap", 90);
    const c = getWallet(customerId);
    expect(c.balance).toBe(100);
    expect(c.reserved).toBe(0);
    expect(c.total).toBe(100);
    const p = getWallet(providerId);
    expect(p.balance).toBe(0);
    expect(p.pending).toBe(90);
    expect(p.total).toBe(90);
  });

  it("aynı sipariş iki kez capture/earn: ikinci kez etki yok", async () => {
    const customerId = await userFrom("5550000887");
    const providerId = await userFrom("5550000888");
    topupWallet(customerId, "kart", 200);
    stubOrder("k-tier-idemp");
    holdForOrder(customerId, "k-tier-idemp", 100);
    captureHold(customerId, "k-tier-idemp", 100);
    captureHold(customerId, "k-tier-idemp", 100);
    creditOnCapture(providerId, "k-tier-idemp", 90);
    creditOnCapture(providerId, "k-tier-idemp", 90);
    expect(getWallet(customerId).reserved).toBe(0);
    expect(getWallet(customerId).balance).toBe(100);
    expect(getWallet(providerId).pending).toBe(90);
    expect(getWallet(providerId).balance).toBe(0);
  });

  it("negatif kademe oluşmaz; yetersiz bakiyede hold hata verir", async () => {
    const userId = await userFrom("5550000889");
    topupWallet(userId, "kart", 40);
    stubOrder("k-tier-neg");
    expect(() => holdForOrder(userId, "k-tier-neg", 100)).toThrow(ApiError);
    const w = getWallet(userId);
    expect(w.balance).toBe(40);
    expect(w.reserved).toBe(0);
    expect(w.pending).toBe(0);
    const row = getWalletRow(userId)!;
    expect(row.balance).toBeGreaterThanOrEqual(0);
    expect(row.reserved).toBeGreaterThanOrEqual(0);
    expect(row.pending).toBeGreaterThanOrEqual(0);
  });

  it("topup/payout dışında hold-release toplamı korunur", async () => {
    const userId = await userFrom("5550000890");
    topupWallet(userId, "kart", 300);
    const afterTopup = getWallet(userId).total;
    expect(afterTopup).toBe(300);
    stubOrder("k-tier-cons");
    holdForOrder(userId, "k-tier-cons", 120);
    expect(getWallet(userId).total).toBe(300);
    releaseHold(userId, "k-tier-cons", 120);
    expect(getWallet(userId).total).toBe(300);
    stubOrder("k-tier-cons2");
    holdForOrder(userId, "k-tier-cons2", 50);
    expect(getWallet(userId).total).toBe(300);
  });
});

describe("demo bekleyen süre", () => {
  const prevWait = process.env.WALLET_PENDING_WAIT_MS;
  const prevEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (prevWait === undefined) delete process.env.WALLET_PENDING_WAIT_MS;
    else process.env.WALLET_PENDING_WAIT_MS = prevWait;
    process.env.NODE_ENV = prevEnv;
  });

  it("WALLET_PENDING_WAIT_MS saniye; production'da yok sayılır", () => {
    process.env.NODE_ENV = "test";
    process.env.WALLET_PENDING_WAIT_MS = "60";
    expect(pendingEarningWaitMs()).toBe(60_000);
    process.env.NODE_ENV = "production";
    expect(pendingEarningWaitMs()).toBe(PENDING_EARNING_WAIT_MS);
  });

  it("60 sn sonra pending→balance", async () => {
    process.env.NODE_ENV = "test";
    process.env.WALLET_PENDING_WAIT_MS = "60";
    const userId = await userFrom("5550000891");
    stubOrder("k-demo-wait");
    const at = "2026-10-29T12:00:00.000Z";
    creditOnCapture(userId, "k-demo-wait", 90, at);
    expect(getWallet(userId, 0, at).pending).toBe(90);
    const soon = new Date(Date.parse(at) + 30_000).toISOString();
    expect(getWallet(userId, 0, soon).pending).toBe(90);
    const ripe = new Date(Date.parse(at) + 61_000).toISOString();
    const w = getWallet(userId, 0, ripe);
    expect(w.pending).toBe(0);
    expect(w.balance).toBe(90);
  });
});

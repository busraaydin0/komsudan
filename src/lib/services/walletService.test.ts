import { describe, expect, it } from "vitest";
import { ApiError } from "@/server/rules";
import { requestOtp, verifyOtp } from "./authService";
import { canPay, creditOnCapture, getWallet, holdForOrder, topupWallet, withdrawWallet } from "./walletService";

describe("bakiye 0/1", () => {
  it("yetersiz bakiyede canPay 0, yeterliyse 1", () => {
    expect(canPay(0, 180)).toBe(0);
    expect(canPay(179, 180)).toBe(0);
    expect(canPay(180, 180)).toBe(1);
    expect(canPay(200, 180)).toBe(1);
  });

  it("hold yetersizse sipariş düşmez ve hata verir", async () => {
    const phone = "5550000881";
    const sent = requestOtp(phone);
    const session = await verifyOtp(phone, sent.demoCode!);
    const userId = session.user.id;
    expect(getWallet(userId, 100).canPay).toBe(0);
    try {
      holdForOrder(userId, "k-test-hold-0", 100);
      expect.fail("hold geçmemeliydi");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).code).toBe("INSUFFICIENT_BALANCE");
    }
    expect(getWallet(userId).balance).toBe(0);
    topupWallet(userId, "kart", 250);
    expect(getWallet(userId, 100).canPay).toBe(1);
    holdForOrder(userId, "k-test-hold-1", 100);
    expect(getWallet(userId).balance).toBe(150);
  });

  it("tahsil net bakiyeye yazar; çekim 0/1", async () => {
    const phone = "5550000882";
    const sent = requestOtp(phone);
    const session = await verifyOtp(phone, sent.demoCode!);
    const userId = session.user.id;
    creditOnCapture(userId, "k-earn-1", 90);
    creditOnCapture(userId, "k-earn-1", 90);
    expect(getWallet(userId).balance).toBe(90);
    try {
      withdrawWallet(userId, "iban", 100);
      expect.fail("çekim geçmemeliydi");
    } catch (e) {
      expect((e as ApiError).code).toBe("INSUFFICIENT_PAYOUT");
    }
    expect(getWallet(userId).balance).toBe(90);
    const next = withdrawWallet(userId, "papara", 90);
    expect(next.balance).toBe(0);
    expect(getWallet(userId, 1).canWithdraw).toBe(0);
  });
});

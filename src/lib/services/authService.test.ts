import { describe, expect, it } from "vitest";
import { ApiError } from "@/server/rules";
import { requestOtp, verifyOtp } from "./authService";

describe("OTP request/verify", () => {
  it("geçersiz numarayı reddeder", () => {
    expect(() => requestOtp("123")).toThrow(ApiError);
  });

  it("kod üretir ve doğru kodla oturum açar", async () => {
    const phone = "5550000101";
    const sent = requestOtp(phone);
    expect(sent.phone).toBe("5550000101");
    expect(sent.demoCode).toMatch(/^\d{6}$/);
    const session = await verifyOtp(phone, sent.demoCode!);
    expect(session.user.phone).toBe("5550000101");
    expect(session.accessToken).toBeTruthy();
    expect(session.refreshToken).toBeTruthy();
  });

  it("yanlış kodu reddeder", async () => {
    const phone = "5550000102";
    const sent = requestOtp(phone);
    const wrong = sent.demoCode === "000000" ? "111111" : "000000";
    await expect(verifyOtp(phone, wrong)).rejects.toMatchObject({ code: "INVALID_OTP" });
  });

  it("aynı numaraya dakikada ikinci kodu keser", () => {
    const phone = "5550000103";
    requestOtp(phone);
    expect(() => requestOtp(phone)).toThrow(ApiError);
    try {
      requestOtp(phone);
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).code).toBe("OTP_RATE_LIMIT");
    }
  });
});

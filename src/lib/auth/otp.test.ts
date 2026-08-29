import { describe, expect, it } from "vitest";
import { hashOtp, OTP_MAX_ATTEMPTS, OTP_PER_HOUR, OTP_PER_MINUTE, OTP_TTL_MS } from "./otp";

describe("OTP sabitleri", () => {
  it("SMS bomba limitini korur", () => {
    expect(OTP_PER_MINUTE).toBe(1);
    expect(OTP_PER_HOUR).toBe(5);
    expect(OTP_MAX_ATTEMPTS).toBe(5);
    expect(OTP_TTL_MS).toBe(5 * 60 * 1000);
  });

  it("aynı telefon+kod her zaman aynı hash’i üretir", () => {
    expect(hashOtp("5321100099", "123456")).toBe(hashOtp("5321100099", "123456"));
    expect(hashOtp("5321100099", "123456")).not.toBe(hashOtp("5321100099", "000000"));
    expect(hashOtp("5321100099", "123456")).not.toBe(hashOtp("5321100098", "123456"));
  });
});

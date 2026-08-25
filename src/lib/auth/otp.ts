import { createHash } from "node:crypto";

export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_PER_MINUTE = 1;
export const OTP_PER_HOUR = 5;

export function hashOtp(phone: string, code: string) {
  return createHash("sha256").update(`${phone}:${code}`).digest("hex");
}

export function echoOtp() {
  return process.env.NODE_ENV !== "production" || process.env.OTP_ECHO === "1";
}

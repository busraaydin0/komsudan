import { randomBytes, randomInt } from "node:crypto";
import { ApiError } from "@/server/rules";
import { db } from "@/lib/db/client";
import { getProfile } from "@/lib/db/providers";
import {
  attachOrphanOrders,
  bumpOtpAttempts,
  countOtpSince,
  consumeOtp,
  deleteOtpsForPhone,
  deleteRefreshTokens,
  deleteSession,
  deleteUserRow,
  deleteUserSessions,
  findRefresh,
  getUserById,
  getUserByPhone,
  getUserBySession,
  insertOtp,
  insertRefresh,
  insertSession,
  insertUser,
  latestOtp,
  markIdentityVerified,
  anonymizeReviewsForUser,
  revokeRefresh,
  revokeUserRefresh,
  setPasskey,
  unlinkUserOrders,
  updateUserName,
  type UserRow,
} from "@/lib/db/auth";
import { deleteNotificationsForUser } from "@/lib/db/notifications";
import { echoOtp, hashOtp, OTP_MAX_ATTEMPTS, OTP_PER_HOUR, OTP_PER_MINUTE, OTP_TTL_MS } from "@/lib/auth/otp";
import { ACCESS_TTL_SEC, REFRESH_TTL_SEC, signAccess } from "@/lib/auth/jwt";
import { toAuthUser, type AuthUser } from "@/lib/auth/types";
import { normalizePhone } from "@/lib/phone";
import { logger } from "@/lib/logger";

export { normalizePhone };

const SESSION_DAYS = 30;

function assertName(raw: string) {
  const trimmed = raw.trim().slice(0, 80);
  if (trimmed.length < 2) throw new ApiError(400, "Ad soyad en az iki harf.", "VALIDATION_ERROR");
  return trimmed;
}

export function requestOtp(rawPhone: string) {
  let phone: string;
  try {
    phone = normalizePhone(rawPhone);
  } catch (e) {
    throw new ApiError(400, e instanceof Error ? e.message : "Geçersiz telefon.", "VALIDATION_ERROR");
  }
  const now = Date.now();
  if (countOtpSince(phone, new Date(now - 60_000).toISOString()) >= OTP_PER_MINUTE) {
    logger.warn({ phone }, "OTP dakika limiti.");
    throw new ApiError(429, "Aynı numaraya dakikada bir kod.", "OTP_RATE_LIMIT");
  }
  if (countOtpSince(phone, new Date(now - 3_600_000).toISOString()) >= OTP_PER_HOUR) {
    logger.warn({ phone }, "OTP saatlik limiti.");
    throw new ApiError(429, "Bu numara için saatlik kod limiti doldu.", "OTP_RATE_LIMIT");
  }
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const expiresAt = new Date(now + OTP_TTL_MS).toISOString();
  insertOtp(phone, hashOtp(phone, code), expiresAt);
  return {
    phone,
    expiresAt,
    sms: `Komşudan giriş kodu: ${code} (SMS simülasyonu, gerçek SMS yok.)`,
    demoCode: echoOtp() ? code : undefined,
  };
}

async function issueTokens(row: UserRow, withSession: boolean) {
  const user = toAuthUser(row);
  const accessToken = await signAccess(user.id, user.role);
  const refreshToken = randomBytes(32).toString("hex");
  const refreshExp = new Date(Date.now() + REFRESH_TTL_SEC * 1000).toISOString();
  insertRefresh(user.id, refreshToken, refreshExp);
  let sessionToken: string | undefined;
  if (withSession) {
    sessionToken = randomBytes(24).toString("hex");
    const sessionExp = new Date(Date.now() + SESSION_DAYS * 86400 * 1000).toISOString();
    insertSession(sessionToken, user.id, sessionExp);
  }
  return {
    user,
    accessToken,
    refreshToken,
    sessionToken,
    accessExpiresIn: ACCESS_TTL_SEC,
  };
}

export async function verifyOtp(rawPhone: string, rawCode: string) {
  let phone: string;
  try {
    phone = normalizePhone(rawPhone);
  } catch (e) {
    throw new ApiError(400, e instanceof Error ? e.message : "Geçersiz telefon.", "VALIDATION_ERROR");
  }
  const digits = rawCode.replace(/\D/g, "");
  const otp = latestOtp(phone);
  if (!otp || otp.expires_at < new Date().toISOString()) {
    throw new ApiError(400, "Kodun süresi doldu. Yeniden gönder.", "OTP_EXPIRED");
  }
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    throw new ApiError(429, "Çok fazla deneme. Yeni kod iste.", "OTP_RATE_LIMIT");
  }
  if (otp.code_hash !== hashOtp(phone, digits)) {
    bumpOtpAttempts(otp.id);
    throw new ApiError(400, "SMS kodu uyuşmadı.", "INVALID_OTP");
  }
  consumeOtp(otp.id);

  let row = getUserByPhone(phone);
  if (!row) {
    row = insertUser(phone);
    attachOrphanOrders(row.id);
  }
  return issueTokens(row, true);
}

export async function rotateRefresh(rawToken: string) {
  const row = findRefresh(rawToken);
  const now = new Date().toISOString();
  if (!row || row.revoked_at || row.expires_at < now) {
    throw new ApiError(401, "Oturum yenilenemedi. Yeniden giriş yap.", "INVALID_REFRESH");
  }
  revokeRefresh(row.id);
  const user = getUserById(row.user_id);
  if (!user) throw new ApiError(401, "Oturum yenilenemedi. Yeniden giriş yap.", "INVALID_REFRESH");
  return issueTokens(user, false);
}

export async function logoutUser(input: { sessionToken?: string; refreshToken?: string; userId?: string }) {
  if (input.sessionToken) deleteSession(input.sessionToken);
  if (input.refreshToken) {
    const row = findRefresh(input.refreshToken);
    if (row) revokeRefresh(row.id);
  }
  if (input.userId) {
    revokeUserRefresh(input.userId);
    deleteUserSessions(input.userId);
  }
}

export function loadUser(id: string): AuthUser | null {
  const row = getUserById(id);
  return row ? toAuthUser(row) : null;
}

export function loadUserBySession(token: string): AuthUser | null {
  const row = getUserBySession(token);
  return row ? toAuthUser(row) : null;
}

export function updateProfile(user: AuthUser, name: string): AuthUser {
  return toAuthUser(updateUserName(user.id, assertName(name)));
}

export function verifyIdentity(user: AuthUser, name: string): AuthUser {
  return toAuthUser(markIdentityVerified(user.id, assertName(name)));
}

export function enablePasskey(user: AuthUser, credentialId: string): AuthUser {
  if (!user.identityVerified) throw new ApiError(403, "Önce kimliği doğrula.", "FORBIDDEN");
  const id = credentialId.trim().slice(0, 512);
  if (id.length < 8) throw new ApiError(400, "Cihaz kilidi alınamadı.", "VALIDATION_ERROR");
  return toAuthUser(setPasskey(user.id, id));
}

export function assertPasskey(user: AuthUser, credentialId: string): AuthUser {
  const row = getUserById(user.id);
  if (!row?.passkey_id) throw new ApiError(400, "Bu hesapta cihaz kilidi yok.", "VALIDATION_ERROR");
  if (row.passkey_id !== credentialId.trim()) {
    throw new ApiError(400, "Yüz veya parmak izi bu hesaba ait değil.", "VALIDATION_ERROR");
  }
  return user;
}

export function assertDeletable(user: AuthUser) {
  if (user.role === "provider" || user.role === "admin" || getProfile(user.id)) {
    throw new ApiError(409, "Pilot hizmet veren hesabı silinmez.", "ACCOUNT_LOCKED");
  }
}

export function deleteAccount(user: AuthUser) {
  assertDeletable(user);
  db().transaction(() => {
    anonymizeReviewsForUser(user.id);
    unlinkUserOrders(user.id);
    deleteNotificationsForUser(user.id);
    db()
      .prepare(`DELETE FROM gallery_photos WHERE provider_id = ? AND kind = 'portfolio'`)
      .run(user.id);
    deleteUserSessions(user.id);
    deleteRefreshTokens(user.id);
    deleteOtpsForPhone(user.phone);
    deleteUserRow(user.id);
  })();
}

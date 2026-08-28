import { createHash, randomUUID } from "node:crypto";
import { db } from "./client";

export type UserRole = "customer" | "provider" | "admin";

export type UserRow = {
  id: string;
  phone: string;
  name: string;
  full_name: string;
  role: UserRole;
  identity_verified: number;
  passkey_id: string | null;
  avatar_url: string | null;
  preferred_category_ids: string | null;
  preferred_intent: string | null;
  onboarding_completed_at: string | null;
  home_lat: number | null;
  home_lng: number | null;
  home_neighborhood: string | null;
  created_at: string;
  updated_at: string;
};

export type OtpRow = {
  id: string;
  phone: string;
  code_hash: string;
  attempts: number;
  expires_at: string;
  created_at: string;
};

export type RefreshRow = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
};

const USER_COLS =
  "id, phone, name, full_name, role, identity_verified, passkey_id, avatar_url, preferred_category_ids, preferred_intent, onboarding_completed_at, home_lat, home_lng, home_neighborhood, created_at, updated_at";
const USER_SELECT = USER_COLS;
const USER_SELECT_U = USER_COLS.split(", ")
  .map((c) => `u.${c}`)
  .join(", ");

export function hashToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function getUserById(id: string): UserRow | undefined {
  return db().prepare(`SELECT ${USER_SELECT} FROM users WHERE id = ?`).get(id) as UserRow | undefined;
}

export function getUserByPhone(phone: string): UserRow | undefined {
  return db().prepare(`SELECT ${USER_SELECT} FROM users WHERE phone = ?`).get(phone) as
    | UserRow
    | undefined;
}

export function insertUser(phone: string, role: UserRole = "customer"): UserRow {
  const now = new Date().toISOString();
  const id = `u-${randomUUID().slice(0, 8)}`;
  db()
    .prepare(
      `INSERT INTO users (id, phone, name, full_name, role, identity_verified, passkey_id, created_at, updated_at)
       VALUES (?, ?, '', '', ?, 0, NULL, ?, ?)`,
    )
    .run(id, phone, role, now, now);
  return getUserById(id)!;
}

export function updateUserName(id: string, name: string) {
  const now = new Date().toISOString();
  db()
    .prepare("UPDATE users SET name = ?, full_name = ?, updated_at = ? WHERE id = ?")
    .run(name, name, now, id);
  return getUserById(id)!;
}

export function markIdentityVerified(id: string, name: string) {
  const now = new Date().toISOString();
  db()
    .prepare(
      "UPDATE users SET name = ?, full_name = ?, identity_verified = 1, updated_at = ? WHERE id = ?",
    )
    .run(name, name, now, id);
  return getUserById(id)!;
}

export function setPasskey(id: string, credentialId: string) {
  const now = new Date().toISOString();
  db().prepare("UPDATE users SET passkey_id = ?, updated_at = ? WHERE id = ?").run(credentialId, now, id);
  return getUserById(id)!;
}

export function setUserRole(id: string, role: UserRole) {
  if (role === "admin") return getUserById(id)!;
  const now = new Date().toISOString();
  db()
    .prepare("UPDATE users SET role = ?, updated_at = ? WHERE id = ? AND role != 'admin'")
    .run(role, now, id);
  return getUserById(id)!;
}

export function setUserAvatar(id: string, url: string | null) {
  const now = new Date().toISOString();
  db().prepare("UPDATE users SET avatar_url = ?, updated_at = ? WHERE id = ?").run(url, now, id);
  db().prepare("UPDATE provider_profiles SET avatar_url = ?, updated_at = ? WHERE user_id = ?").run(url, now, id);
  return getUserById(id)!;
}

export function updateUserPreferences(
  id: string,
  patch: {
    preferredCategoryIds: string[] | null;
    preferredIntent: string | null;
    onboardingCompletedAt: string | null;
    homeLat: number | null;
    homeLng: number | null;
    homeNeighborhood: string | null;
  },
) {
  const now = new Date().toISOString();
  db()
    .prepare(
      `UPDATE users SET
         preferred_category_ids = ?,
         preferred_intent = ?,
         onboarding_completed_at = ?,
         home_lat = ?,
         home_lng = ?,
         home_neighborhood = ?,
         updated_at = ?
       WHERE id = ?`,
    )
    .run(
      patch.preferredCategoryIds ? JSON.stringify(patch.preferredCategoryIds) : null,
      patch.preferredIntent,
      patch.onboardingCompletedAt,
      patch.homeLat,
      patch.homeLng,
      patch.homeNeighborhood,
      now,
      id,
    );
  return getUserById(id)!;
}

export function attachOrphanOrders(userId: string) {
  db().prepare("UPDATE orders SET user_id = ? WHERE user_id IS NULL").run(userId);
}

export function deliveredCount(userId: string) {
  const row = db()
    .prepare("SELECT COUNT(*) AS n FROM orders WHERE user_id = ? AND status = 'teslim_edildi'")
    .get(userId) as { n: number };
  return row.n;
}

export function countOtpSince(phone: string, sinceIso: string) {
  const row = db()
    .prepare("SELECT COUNT(*) AS n FROM otp_codes WHERE phone = ? AND created_at >= ?")
    .get(phone, sinceIso) as { n: number };
  return row.n;
}

export function insertOtp(phone: string, codeHash: string, expiresAt: string): OtpRow {
  const id = randomUUID();
  const created = new Date().toISOString();
  db()
    .prepare(
      `INSERT INTO otp_codes (id, phone, code_hash, attempts, expires_at, created_at)
       VALUES (?, ?, ?, 0, ?, ?)`,
    )
    .run(id, phone, codeHash, expiresAt, created);
  return {
    id,
    phone,
    code_hash: codeHash,
    attempts: 0,
    expires_at: expiresAt,
    created_at: created,
  };
}

export function latestOtp(phone: string): OtpRow | undefined {
  return db()
    .prepare(
      `SELECT id, phone, code_hash, attempts, expires_at, created_at
       FROM otp_codes WHERE phone = ? AND consumed_at IS NULL
       ORDER BY created_at DESC LIMIT 1`,
    )
    .get(phone) as OtpRow | undefined;
}

export function consumeOtp(id: string) {
  db().prepare("UPDATE otp_codes SET consumed_at = ? WHERE id = ?").run(new Date().toISOString(), id);
}

export function bumpOtpAttempts(id: string) {
  db().prepare("UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?").run(id);
}

export function insertRefresh(userId: string, rawToken: string, expiresAt: string) {
  const id = randomUUID();
  db()
    .prepare(
      `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, revoked_at, created_at)
       VALUES (?, ?, ?, ?, NULL, ?)`,
    )
    .run(id, userId, hashToken(rawToken), expiresAt, new Date().toISOString());
  return id;
}

export function findRefresh(rawToken: string): RefreshRow | undefined {
  return db()
    .prepare(
      `SELECT id, user_id, token_hash, expires_at, revoked_at, created_at
       FROM refresh_tokens WHERE token_hash = ?`,
    )
    .get(hashToken(rawToken)) as RefreshRow | undefined;
}

export function revokeRefresh(id: string) {
  db()
    .prepare("UPDATE refresh_tokens SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL")
    .run(new Date().toISOString(), id);
}

export function revokeUserRefresh(userId: string) {
  db()
    .prepare("UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL")
    .run(new Date().toISOString(), userId);
}

export function insertSession(token: string, userId: string, expiresAt: string) {
  db()
    .prepare("INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)")
    .run(token, userId, new Date().toISOString(), expiresAt);
}

export function getUserBySession(token: string): UserRow | undefined {
  return db()
    .prepare(
      `SELECT ${USER_SELECT_U}
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > ?`,
    )
    .get(token, new Date().toISOString()) as UserRow | undefined;
}

export function deleteSession(token: string) {
  db().prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

export function deleteUserSessions(userId: string) {
  db().prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
}

export function deleteRefreshTokens(userId: string) {
  db().prepare("DELETE FROM refresh_tokens WHERE user_id = ?").run(userId);
}

export function deleteOtpsForPhone(phone: string) {
  db().prepare("DELETE FROM otp_codes WHERE phone = ?").run(phone);
  const tables = db().prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'otps'").get() as
    | { name: string }
    | undefined;
  if (tables) db().prepare("DELETE FROM otps WHERE phone = ?").run(phone);
}

export function anonymizeReviewsForUser(userId: string) {
  db()
    .prepare(
      `UPDATE reviews SET author = 'Silinmiş hesap'
       WHERE order_id IN (SELECT id FROM orders WHERE user_id = ?)`,
    )
    .run(userId);
}

export function unlinkUserOrders(userId: string) {
  db().prepare("UPDATE orders SET user_id = NULL WHERE user_id = ?").run(userId);
}

export function deleteUserRow(userId: string) {
  db().prepare("DELETE FROM users WHERE id = ?").run(userId);
}

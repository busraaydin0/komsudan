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

const USER_SELECT = `id, phone, name, full_name, role, identity_verified, passkey_id, created_at, updated_at`;

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
      `SELECT u.id, u.phone, u.name, u.full_name, u.role, u.identity_verified, u.passkey_id, u.created_at, u.updated_at
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

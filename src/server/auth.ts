import { createHash, randomBytes, randomInt, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import type { Account } from "@/lib/types";
import { db } from "./db";
import { ApiError } from "./rules";

export const SESSION_COOKIE = "komsu_sid";
const OTP_MS = 5 * 60 * 1000;
const SESSION_DAYS = 30;

type UserRow = {
  id: string;
  phone: string;
  name: string;
  identity_verified: number;
  passkey_id: string | null;
  created_at: string;
  updated_at: string;
};

export function normalizePhone(raw: string) {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("90") && d.length === 12) d = d.slice(2);
  if (d.startsWith("0") && d.length === 11) d = d.slice(1);
  if (d.length !== 10 || !d.startsWith("5")) {
    throw new ApiError(400, "Cep telefonu 5XX XXX XX XX olmalı.");
  }
  return d;
}

function hashOtp(phone: string, code: string) {
  return createHash("sha256").update(`${phone}:${code}`).digest("hex");
}

function toAccount(row: UserRow): Account {
  return {
    id: row.id,
    phone: row.phone,
    name: row.name,
    identityVerified: Boolean(row.identity_verified),
    passkeyEnabled: Boolean(row.passkey_id),
  };
}

export function getUser(id: string): UserRow | undefined {
  return db().prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
}

export function getUserByPhone(phone: string): UserRow | undefined {
  return db().prepare("SELECT * FROM users WHERE phone = ?").get(phone) as UserRow | undefined;
}

export async function readSession(): Promise<Account | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = db()
    .prepare(
      `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > ?`,
    )
    .get(token, new Date().toISOString()) as UserRow | undefined;
  return row ? toAccount(row) : null;
}

export async function requireAccount(): Promise<Account> {
  const a = await readSession();
  if (!a) throw new ApiError(401, "Giriş gerekli.");
  return a;
}

export async function requireReadyAccount(): Promise<Account> {
  const a = await requireAccount();
  if (!a.name.trim() || !a.identityVerified || !a.passkeyEnabled) {
    throw new ApiError(403, "Kimlik ve cihaz kilidi tamamlanmadan sipariş yok.");
  }
  return a;
}

export function issueOtp(phone: string) {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const now = new Date();
  db()
    .prepare(
      `INSERT INTO otps (phone, code_hash, expires_at)
       VALUES (@phone, @code_hash, @expires_at)
       ON CONFLICT(phone) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at`,
    )
    .run({
      phone,
      code_hash: hashOtp(phone, code),
      expires_at: new Date(now.getTime() + OTP_MS).toISOString(),
    });
  return code;
}

function attachOrphanOrders(userId: string) {
  db().prepare("UPDATE orders SET user_id = ? WHERE user_id IS NULL").run(userId);
}

export async function verifyOtp(phone: string, code: string): Promise<Account> {
  const digits = code.replace(/\D/g, "");
  const otp = db().prepare("SELECT code_hash, expires_at FROM otps WHERE phone = ?").get(phone) as
    | { code_hash: string; expires_at: string }
    | undefined;
  if (!otp || otp.expires_at < new Date().toISOString()) {
    throw new ApiError(400, "Kodun süresi doldu. Yeniden gönder.");
  }
  if (otp.code_hash !== hashOtp(phone, digits)) {
    throw new ApiError(400, "SMS kodu uyuşmadı.");
  }
  db().prepare("DELETE FROM otps WHERE phone = ?").run(phone);

  const now = new Date().toISOString();
  let user = getUserByPhone(phone);
  if (!user) {
    const id = `u-${randomUUID().slice(0, 8)}`;
    db()
      .prepare(
        `INSERT INTO users (id, phone, name, identity_verified, passkey_id, created_at, updated_at)
         VALUES (?, ?, '', 0, NULL, ?, ?)`,
      )
      .run(id, phone, now, now);
    user = getUser(id)!;
    attachOrphanOrders(id);
  }

  const token = randomBytes(24).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 86400 * 1000).toISOString();
  db()
    .prepare("INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)")
    .run(token, user.id, now, expires);

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
  return toAccount(user);
}

export async function updateProfile(name: string): Promise<Account> {
  const a = await requireAccount();
  const trimmed = name.trim().slice(0, 80);
  if (trimmed.length < 2) throw new ApiError(400, "Ad soyad en az iki harf.");
  const now = new Date().toISOString();
  db().prepare("UPDATE users SET name = ?, updated_at = ? WHERE id = ?").run(trimmed, now, a.id);
  return toAccount(getUser(a.id)!);
}

export async function verifyIdentity(name: string): Promise<Account> {
  const a = await requireAccount();
  const trimmed = name.trim().slice(0, 80);
  if (trimmed.length < 2) throw new ApiError(400, "Ad soyad en az iki harf.");
  const now = new Date().toISOString();
  db()
    .prepare("UPDATE users SET name = ?, identity_verified = 1, updated_at = ? WHERE id = ?")
    .run(trimmed, now, a.id);
  return toAccount(getUser(a.id)!);
}

export async function enablePasskey(credentialId: string): Promise<Account> {
  const a = await requireAccount();
  if (!a.identityVerified) throw new ApiError(403, "Önce kimliği doğrula.");
  const id = credentialId.trim().slice(0, 512);
  if (id.length < 8) throw new ApiError(400, "Cihaz kilidi alınamadı.");
  const now = new Date().toISOString();
  db().prepare("UPDATE users SET passkey_id = ?, updated_at = ? WHERE id = ?").run(id, now, a.id);
  return toAccount(getUser(a.id)!);
}

export async function assertPasskey(credentialId: string): Promise<Account> {
  const a = await requireAccount();
  const row = getUser(a.id);
  if (!row?.passkey_id) throw new ApiError(400, "Bu hesapta cihaz kilidi yok.");
  if (row.passkey_id !== credentialId.trim()) {
    throw new ApiError(400, "Yüz veya parmak izi bu hesaba ait değil.");
  }
  return a;
}

export async function logout() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) db().prepare("DELETE FROM sessions WHERE token = ?").run(token);
  store.delete(SESSION_COOKIE);
}

export function deliveredCount(userId: string) {
  const row = db()
    .prepare("SELECT COUNT(*) AS n FROM orders WHERE user_id = ? AND status = 'teslim_edildi'")
    .get(userId) as { n: number };
  return row.n;
}

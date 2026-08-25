import { SignJWT, jwtVerify } from "jose";

export const ACCESS_TTL_SEC = 15 * 60;
export const REFRESH_TTL_SEC = 30 * 86400;

export type AccessPayload = {
  sub: string;
  role: string;
};

function secretKey() {
  const raw = process.env.JWT_SECRET;
  if (raw && raw.length >= 32) return new TextEncoder().encode(raw);
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET en az 32 karakter olmalı.");
  }
  return new TextEncoder().encode("komsudan-dev-jwt-secret-change-me-32b");
}

export async function signAccess(userId: string, role: string) {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_SEC}s`)
    .sign(secretKey());
}

export async function verifyAccess(token: string): Promise<AccessPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.sub !== "string" || typeof payload.role !== "string") return null;
    return { sub: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}

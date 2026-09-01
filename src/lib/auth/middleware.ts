import { ApiError } from "@/server/rules";
import { verifyAccess } from "./jwt";
import { ACCESS_COOKIE, REFRESH_COOKIE, SESSION_COOKIE, readCookie } from "./cookies";
import { loadUser, loadUserBySession } from "@/lib/services/authService";
import { getProfile } from "@/lib/db/providers";
import type { AuthUser } from "./types";
import type { UserRole } from "@/lib/db/auth";

export async function getAuth(request?: Request): Promise<AuthUser | null> {
  const header = request?.headers.get("authorization");
  if (header?.startsWith("Bearer ")) {
    const payload = await verifyAccess(header.slice(7).trim());
    if (payload) return loadUser(payload.sub);
  }
  const access = await readCookie(ACCESS_COOKIE);
  if (access) {
    const payload = await verifyAccess(access);
    if (payload) return loadUser(payload.sub);
  }
  const session = await readCookie(SESSION_COOKIE);
  if (session) return loadUserBySession(session);
  return null;
}

export async function requireAuth(request?: Request, role?: UserRole): Promise<AuthUser> {
  const user = await getAuth(request);
  if (!user) throw new ApiError(401, "Giriş gerekli.", "UNAUTHORIZED");
  if (role && user.role !== role && user.role !== "admin") {
    if (role === "provider" && getProfile(user.id)) return user;
    throw new ApiError(403, "Bu işlem için yetkin yok.", "FORBIDDEN");
  }
  return user;
}

export async function readRefreshToken(request?: Request) {
  const header = request?.headers.get("authorization");
  if (header?.startsWith("Bearer ")) return header.slice(7).trim();
  return (await readCookie(REFRESH_COOKIE)) ?? "";
}

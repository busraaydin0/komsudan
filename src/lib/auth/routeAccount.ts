import { ApiError } from "@/lib/errors";
import { REFRESH_COOKIE, SESSION_COOKIE, clearAuthCookies, readCookie } from "@/lib/auth/cookies";
import { getAuth, requireAuth } from "@/lib/auth/middleware";
import { toAccount } from "@/lib/auth/types";
import type { Account } from "@/lib/types";
import * as authService from "@/lib/services/authService";
import { deletePortfolioForUser } from "@/lib/services/photoService";

export async function readSession(): Promise<Account | null> {
  const user = await getAuth();
  return user ? toAccount(user) : null;
}

export async function requireAccount(): Promise<Account> {
  return toAccount(await requireAuth());
}

export async function requireReadyAccount(request?: Request): Promise<Account> {
  const user = await requireAuth(request);
  if (!user.name.trim() || !user.identityVerified || !user.passkeyEnabled) {
    throw new ApiError(403, "Kimlik ve cihaz kilidi tamamlanmadan sipariş yok.", "FORBIDDEN");
  }
  return toAccount(user);
}

export async function updateProfile(name: string): Promise<Account> {
  const user = await requireAuth();
  return toAccount(authService.updateProfile(user, name));
}

export async function verifyIdentity(name: string): Promise<Account> {
  const user = await requireAuth();
  return toAccount(authService.verifyIdentity(user, name));
}

export async function enablePasskey(credentialId: string): Promise<Account> {
  const user = await requireAuth();
  return toAccount(authService.enablePasskey(user, credentialId));
}

export async function assertPasskey(credentialId: string): Promise<Account> {
  const user = await requireAuth();
  return toAccount(authService.assertPasskey(user, credentialId));
}

export async function logout() {
  const sessionToken = await readCookie(SESSION_COOKIE);
  const refreshToken = await readCookie(REFRESH_COOKIE);
  const user = await getAuth();
  await authService.logoutUser({
    sessionToken,
    refreshToken,
    userId: user?.id,
  });
  await clearAuthCookies();
}

export async function deleteMyAccount() {
  const user = await requireAuth();
  authService.assertDeletable(user);
  deletePortfolioForUser(user.id);
  authService.deleteAccount(user);
  await clearAuthCookies();
}

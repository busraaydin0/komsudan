import { cookies } from "next/headers";
import { ACCESS_TTL_SEC, REFRESH_TTL_SEC } from "./jwt";

export const SESSION_COOKIE = "komsu_sid";
export const ACCESS_COOKIE = "komsu_at";
export const REFRESH_COOKIE = "komsu_rt";
const SESSION_DAYS = 30;

function base() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
  };
}

export async function setAuthCookies(input: {
  accessToken: string;
  refreshToken: string;
  sessionToken?: string;
}) {
  const store = await cookies();
  store.set(ACCESS_COOKIE, input.accessToken, { ...base(), maxAge: ACCESS_TTL_SEC });
  store.set(REFRESH_COOKIE, input.refreshToken, { ...base(), maxAge: REFRESH_TTL_SEC });
  if (input.sessionToken) {
    store.set(SESSION_COOKIE, input.sessionToken, { ...base(), maxAge: SESSION_DAYS * 86400 });
  }
}

export async function clearAuthCookies() {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
  store.delete(SESSION_COOKIE);
}

export async function readCookie(name: string) {
  return (await cookies()).get(name)?.value;
}

import { cookies, headers } from "next/headers";
import { cookieSecure } from "./cookieSecure";
import { ACCESS_TTL_SEC, REFRESH_TTL_SEC } from "./jwt";

export const SESSION_COOKIE = "komsu_sid";
export const ACCESS_COOKIE = "komsu_at";
export const REFRESH_COOKIE = "komsu_rt";
const SESSION_DAYS = 30;

async function base() {
  let proto: string | null = null;
  try {
    proto = (await headers()).get("x-forwarded-proto");
  } catch {
    proto = null;
  }
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: cookieSecure({ proto }),
  };
}

export async function setAuthCookies(input: {
  accessToken: string;
  refreshToken: string;
  sessionToken?: string;
}) {
  const store = await cookies();
  const flags = await base();
  store.set(ACCESS_COOKIE, input.accessToken, { ...flags, maxAge: ACCESS_TTL_SEC });
  store.set(REFRESH_COOKIE, input.refreshToken, { ...flags, maxAge: REFRESH_TTL_SEC });
  if (input.sessionToken) {
    store.set(SESSION_COOKIE, input.sessionToken, { ...flags, maxAge: SESSION_DAYS * 86400 });
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

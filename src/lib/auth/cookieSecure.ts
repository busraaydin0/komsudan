/** Secure yalnız production + HTTPS. HTTP (localhost / LAN / next start) çerezi düşürmesin. */
export function cookieSecure(input?: { proto?: string | null }) {
  const forced = process.env.COOKIE_SECURE?.trim().toLowerCase();
  if (forced === "1" || forced === "true") return true;
  if (forced === "0" || forced === "false") return false;
  if (process.env.NODE_ENV !== "production") return false;
  const proto = (input?.proto ?? "").split(",")[0]?.trim().toLowerCase();
  return proto === "https";
}

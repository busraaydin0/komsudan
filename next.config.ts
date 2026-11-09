import type { NextConfig } from "next";

/** Yalnız `next dev`. Production derlemesine yazılmaz. */
function allowedDevOrigins(): string[] {
  const extra = (process.env.DEV_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return ["*.trycloudflare.com", ...extra];
}

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "pino", "thread-stream"],
};

if (process.env.NODE_ENV !== "production") {
  nextConfig.allowedDevOrigins = allowedDevOrigins();
}

export default nextConfig;

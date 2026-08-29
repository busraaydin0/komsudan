import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "pino", "thread-stream"],
};

export default nextConfig;

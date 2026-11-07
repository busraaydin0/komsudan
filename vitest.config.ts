import path from "node:path";
import { defineConfig } from "vitest/config";

const demoReset = process.env.KOMSU_DEMO_RESET === "1";
const adminCreate = process.env.KOMSU_ADMIN_CREATE === "1";
const fileDb = demoReset || adminCreate;

export default defineConfig({
  test: {
    environment: "node",
    include: demoReset
      ? ["src/lib/db/demoReset.cli.ts"]
      : adminCreate
        ? ["src/lib/db/adminCreate.cli.ts"]
        : ["src/**/*.test.ts"],
    env: {
      KOMSU_DB_PATH: fileDb ? path.resolve(__dirname, "data/komsudan.db") : ":memory:",
      NODE_ENV: adminCreate
        ? process.env.NODE_ENV || "development"
        : demoReset
          ? "development"
          : "test",
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});


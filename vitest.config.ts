import path from "node:path";
import { defineConfig } from "vitest/config";

const demoReset = process.env.KOMSU_DEMO_RESET === "1";

export default defineConfig({
  test: {
    environment: "node",
    include: demoReset ? ["src/lib/db/demoReset.cli.ts"] : ["src/**/*.test.ts"],
    env: {
      KOMSU_DB_PATH: demoReset ? path.resolve(__dirname, "data/komsudan.db") : ":memory:",
      NODE_ENV: demoReset ? "development" : "test",
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});


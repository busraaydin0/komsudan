import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

if (process.env.NODE_ENV === "production") {
  console.error("demo:reset production ortamında çalışmaz.");
  process.exit(1);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const dbPath = path.join(dataDir, "komsudan.db");
const backups = path.join(dataDir, "backups");
fs.mkdirSync(backups, { recursive: true });

async function main() {
  if (fs.existsSync(dbPath)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dest = path.join(backups, `komsudan-${stamp}.db`);
    const src = new Database(dbPath, { readonly: true, fileMustExist: true });
    await src.backup(dest);
    src.close();
    console.log("Yedek:", dest);
  }

  for (const suffix of ["", "-wal", "-shm"]) {
    const p = `${dbPath}${suffix}`;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }

  const result = spawnSync("npx", ["vitest", "run", "src/lib/db/demoReset.cli.ts"], {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      KOMSU_DEMO_RESET: "1",
      NODE_ENV: "development",
    },
  });
  process.exit(result.status ?? 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

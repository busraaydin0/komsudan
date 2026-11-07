import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const phone = process.argv[2];
const role = process.argv[3];

if (!phone || !role) {
  console.error("Kullanım: npm run admin:create -- <telefon> <service_admin|super_admin>");
  process.exit(1);
}

const result = spawnSync("npx", ["vitest", "run", "src/lib/db/adminCreate.cli.ts"], {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    KOMSU_ADMIN_CREATE: "1",
    ADMIN_CREATE_PHONE: phone,
    ADMIN_CREATE_ROLE: role,
  },
});
process.exit(result.status ?? 1);

import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";

function addColumn(db: Database.Database, table: string, name: string, ddl: string) {
  const cols = new Set(
    (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name),
  );
  if (!cols.has(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}

function ensureColumns(db: Database.Database) {
  addColumn(db, "orders", "pickup_code", "pickup_code TEXT");
  addColumn(db, "orders", "code_attempts", "code_attempts INTEGER NOT NULL DEFAULT 0");
  addColumn(db, "orders", "paid_at", "paid_at TEXT");
  addColumn(db, "orders", "payment_status", "payment_status TEXT NOT NULL DEFAULT 'authorized'");
  addColumn(db, "orders", "user_id", "user_id TEXT");
  addColumn(db, "users", "role", "role TEXT NOT NULL DEFAULT 'customer'");
  addColumn(db, "users", "full_name", "full_name TEXT NOT NULL DEFAULT ''");
  addColumn(db, "otp_codes", "consumed_at", "consumed_at TEXT");
  db.exec(`
    UPDATE users SET full_name = name WHERE (full_name = '' OR full_name IS NULL) AND name != '';
    UPDATE orders SET payment_status = 'captured'
      WHERE status = 'teslim_edildi' AND payment_status = 'authorized';
    UPDATE orders SET payment_status = 'voided'
      WHERE status = 'iptal' AND payment_status = 'authorized';
    UPDATE orders SET paid_at = updated_at
      WHERE payment_status = 'captured' AND paid_at IS NULL;
  `);
}

export function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `);
  const dir = path.join(process.cwd(), "db", "migrations");
  const files = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()
    : [];
  const applied = new Set(
    (db.prepare("SELECT id FROM _migrations").all() as { id: string }[]).map((r) => r.id),
  );
  const insert = db.prepare("INSERT INTO _migrations (id, applied_at) VALUES (?, ?)");
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    db.exec(sql);
    insert.run(file, new Date().toISOString());
  }
  ensureColumns(db);
}

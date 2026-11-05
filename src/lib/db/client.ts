import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { migrate } from "./migrate";
import { seedCatalog } from "./seed";

const g = globalThis as typeof globalThis & {
  __komsuDb?: Database.Database;
  __komsuSeeding?: boolean;
  __komsuDbReady?: boolean;
};

export function uploadsDir() {
  const dir = path.join(process.cwd(), "data", "uploads");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function applyPragmas(database: Database.Database) {
  database.pragma("journal_mode = WAL");
  database.pragma("busy_timeout = 5000");
  database.pragma("foreign_keys = ON");
  database.pragma("synchronous = NORMAL");
  database.pragma("cache_size = -8000");
  database.pragma("temp_store = MEMORY");
}

function bootstrapOnce(database: Database.Database) {
  if (g.__komsuDbReady) return;
  migrate(database);
  g.__komsuSeeding = true;
  try {
    seedCatalog(database);
  } finally {
    g.__komsuSeeding = false;
  }
  g.__komsuDbReady = true;
}

function open() {
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  uploadsDir();
  const file = process.env.KOMSU_DB_PATH ?? path.join(dir, "komsudan.db");
  const database = new Database(file);
  applyPragmas(database);
  g.__komsuDb = database;
  bootstrapOnce(database);
  return database;
}

export function db() {
  if (!g.__komsuDb) return open();
  return g.__komsuDb;
}

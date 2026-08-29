import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { migrate } from "./migrate";
import { seedCatalog } from "./seed";

const g = globalThis as typeof globalThis & {
  __komsuDb?: Database.Database;
  __komsuSeeding?: boolean;
};

export function uploadsDir() {
  const dir = path.join(process.cwd(), "data", "uploads");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function prepare(database: Database.Database) {
  migrate(database);
  g.__komsuSeeding = true;
  try {
    seedCatalog(database);
  } finally {
    g.__komsuSeeding = false;
  }
}

function open() {
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  uploadsDir();
  const file = process.env.KOMSU_DB_PATH ?? path.join(dir, "komsudan.db");
  const database = new Database(file);
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  g.__komsuDb = database;
  prepare(database);
  return database;
}

export function db() {
  if (!g.__komsuDb) return open();
  if (!g.__komsuSeeding) prepare(g.__komsuDb);
  return g.__komsuDb;
}

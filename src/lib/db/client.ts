import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { migrate } from "./migrate";
import { seedCatalog } from "./seed";

const g = globalThis as typeof globalThis & { __komsuDb?: Database.Database };

export function uploadsDir() {
  const dir = path.join(process.cwd(), "data", "uploads");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function open() {
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  uploadsDir();
  const database = new Database(path.join(dir, "komsudan.db"));
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  migrate(database);
  seedCatalog(database);
  return database;
}

export function db() {
  if (!g.__komsuDb) g.__komsuDb = open();
  else {
    migrate(g.__komsuDb);
    seedCatalog(g.__komsuDb);
  }
  return g.__komsuDb;
}

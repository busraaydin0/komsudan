import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { DROP_POINTS, PROVIDERS, SEED_REVIEWS } from "@/lib/data";
import type { DropPoint, Provider } from "@/lib/types";

const g = globalThis as typeof globalThis & { __komsuDb?: Database.Database };

export function uploadsDir() {
  const dir = path.join(process.cwd(), "data", "uploads");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const SCHEMA = `
    CREATE TABLE IF NOT EXISTS providers (
      id TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      remaining INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS drop_points (
      id TEXT PRIMARY KEY,
      payload TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL,
      package_id TEXT NOT NULL,
      pieces INTEGER NOT NULL,
      express INTEGER NOT NULL,
      drop_method TEXT NOT NULL,
      drop_point_id TEXT,
      slot TEXT NOT NULL,
      note TEXT NOT NULL,
      total INTEGER NOT NULL,
      commission INTEGER NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (provider_id) REFERENCES providers(id)
    );
    CREATE TABLE IF NOT EXISTS order_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      from_status TEXT,
      to_status TEXT NOT NULL,
      at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );
    CREATE TABLE IF NOT EXISTS order_photos (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      mime TEXT NOT NULL,
      ext TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      order_id TEXT UNIQUE,
      provider_id TEXT NOT NULL,
      rating INTEGER NOT NULL,
      body TEXT NOT NULL,
      author TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (provider_id) REFERENCES providers(id)
    );
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      phone TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      identity_verified INTEGER NOT NULL DEFAULT 0,
      passkey_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS otps (
      phone TEXT PRIMARY KEY,
      code_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
`;

function open() {
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  uploadsDir();
  const db = new Database(path.join(dir, "komsudan.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  seed(db);
  return db;
}

function migrate(db: Database.Database) {
  db.exec(SCHEMA);
  const cols = new Set(
    (db.prepare("PRAGMA table_info(orders)").all() as { name: string }[]).map((c) => c.name),
  );
  if (!cols.has("pickup_code")) db.exec("ALTER TABLE orders ADD COLUMN pickup_code TEXT");
  if (!cols.has("code_attempts")) {
    db.exec("ALTER TABLE orders ADD COLUMN code_attempts INTEGER NOT NULL DEFAULT 0");
  }
  if (!cols.has("paid_at")) db.exec("ALTER TABLE orders ADD COLUMN paid_at TEXT");
  if (!cols.has("payment_status")) {
    db.exec("ALTER TABLE orders ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'authorized'");
  }
  if (!cols.has("user_id")) db.exec("ALTER TABLE orders ADD COLUMN user_id TEXT");
  db.exec(`
    UPDATE orders SET payment_status = 'captured'
    WHERE status = 'teslim_edildi' AND payment_status = 'authorized';
    UPDATE orders SET payment_status = 'voided'
    WHERE status = 'iptal' AND payment_status = 'authorized';
    UPDATE orders SET paid_at = updated_at
    WHERE payment_status = 'captured' AND paid_at IS NULL;
  `);
}

function seed(db: Database.Database) {
  const upProvider = db.prepare(
    `INSERT INTO providers (id, payload, remaining)
     VALUES (@id, @payload, @remaining)
     ON CONFLICT(id) DO UPDATE SET payload = excluded.payload`,
  );
  const upDrop = db.prepare(
    `INSERT INTO drop_points (id, payload) VALUES (@id, @payload)
     ON CONFLICT(id) DO UPDATE SET payload = excluded.payload`,
  );
  const tx = db.transaction(() => {
    for (const p of PROVIDERS) {
      const { remaining, ...rest } = p;
      upProvider.run({
        id: p.id,
        payload: JSON.stringify({ ...rest, remaining }),
        remaining,
      });
    }
    for (const d of DROP_POINTS) {
      upDrop.run({ id: d.id, payload: JSON.stringify(d) });
    }
    const upReview = db.prepare(
      `INSERT INTO reviews (id, order_id, provider_id, rating, body, author, created_at)
       VALUES (@id, @order_id, @provider_id, @rating, @body, @author, @created_at)
       ON CONFLICT(id) DO UPDATE SET
         body = excluded.body,
         rating = excluded.rating,
         author = excluded.author`,
    );
    for (const r of SEED_REVIEWS) {
      upReview.run({
        id: r.id,
        order_id: r.orderId,
        provider_id: r.providerId,
        rating: r.rating,
        body: r.body,
        author: r.author,
        created_at: r.createdAt,
      });
    }
  });
  tx();
}

export function db() {
  if (!g.__komsuDb) g.__komsuDb = open();
  else migrate(g.__komsuDb);
  return g.__komsuDb;
}

export function toProvider(row: { id: string; payload: string; remaining: number }): Provider {
  const p = JSON.parse(row.payload) as Provider;
  return {
    ...p,
    remaining: row.remaining,
    workPhotos: p.workPhotos ?? [],
    recentReviews: p.recentReviews ?? [],
  };
}

export function toDrop(row: { payload: string }): DropPoint {
  return JSON.parse(row.payload) as DropPoint;
}

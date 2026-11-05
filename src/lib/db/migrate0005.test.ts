import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { migrate } from "./migrate";

const TABLES = [
  "users",
  "orders",
  "payments",
  "wallets",
  "wallet_ledger",
  "reviews",
  "messages",
] as const;

let dir = "";
let file = "";

function applyUpTo(db: Database.Database, last: string) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `);
  const migDir = path.join(process.cwd(), "db", "migrations");
  const files = fs.readdirSync(migDir).filter((f) => f.endsWith(".sql")).sort();
  const insert = db.prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)");
  for (const name of files) {
    db.exec(fs.readFileSync(path.join(migDir, name), "utf8"));
    insert.run(name, new Date().toISOString());
    if (name === last) break;
  }
}

function counts(db: Database.Database) {
  const out: Record<string, number> = {};
  for (const t of TABLES) {
    out[t] = (db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n;
  }
  return out;
}

function seedFixture(db: Database.Database) {
  const now = "2026-03-01T10:00:00.000Z";
  db.exec(`
    INSERT INTO users (id, phone, name, full_name, role, identity_verified, passkey_id, super_admin, created_at, updated_at)
    VALUES
      ('u-fix-c', '5550001001', 'Ayşe', 'Ayşe Demo', 'customer', 1, 'pk-ayse', 0, '${now}', '${now}'),
      ('u-fix-p', '5550001002', 'Elif', 'Elif Demo', 'provider', 1, 'pk-elif', 0, '${now}', '${now}');
    INSERT INTO sessions (token, user_id, created_at, expires_at)
    VALUES ('sess-fix', 'u-fix-c', '${now}', '2099-01-01T00:00:00.000Z');
    INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, revoked_at, created_at)
    VALUES ('rt-fix', 'u-fix-c', 'hash-fix', '2099-01-01T00:00:00.000Z', NULL, '${now}');
    INSERT INTO providers (id, payload) VALUES ('u-fix-p', '{}');
    INSERT INTO orders (
      id, provider_id, package_id, express, drop_method, slot, note, total, commission,
      status, created_at, updated_at, payment_status, user_id, delivery_mode,
      scheduled_window_start, size, machine_units, price_change
    ) VALUES (
      'ord-fix-1', 'u-fix-p', 'katlama', 0, 'kapi', '10:00–12:00', '', 100, 10,
      'completed', '${now}', '${now}', 'captured', 'u-fix-c', 'door',
      '${now}', 'kucuk', 1, 'none'
    );
    INSERT INTO payments (id, order_id, amount, commission, status, provider_reference, created_at, updated_at)
    VALUES ('pay-fix-1', 'ord-fix-1', 100, 10, 'captured', 'ref-fix', '${now}', '${now}');
    INSERT INTO wallets (user_id, balance, reserved, pending, updated_at)
    VALUES ('u-fix-c', 50, 0, 0, '${now}');
    INSERT INTO wallet_ledger (id, user_id, amount, kind, method, order_id, created_at)
    VALUES ('led-fix-1', 'u-fix-c', 50, 'topup', 'kart', NULL, '${now}');
    INSERT INTO reviews (id, order_id, provider_id, rating, body, author, created_at)
    VALUES ('rev-fix-1', 'ord-fix-1', 'u-fix-p', 5, 'Temiz iş', 'Ayşe', '${now}');
    INSERT INTO conversations (id, order_id, status, created_at, updated_at, closed_at)
    VALUES ('con-fix-1', 'ord-fix-1', 'open', '${now}', '${now}', NULL);
    INSERT INTO messages (id, conversation_id, sender_id, body, client_message_id, moderation_status, created_at)
    VALUES ('msg-fix-1', 'con-fix-1', 'u-fix-c', 'Merhaba', 'c-1', 'ok', '${now}');
  `);
}

afterEach(() => {
  if (dir && fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
});

describe("0005 users rebuild (eski şema fixture)", () => {
  it("satırlar, passkey ve oturum FK duruyor", () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "komsu-0005-"));
    file = path.join(dir, "old.db");
    const d = new Database(file);
    d.pragma("foreign_keys = ON");
    applyUpTo(d, "0004_wallet_tiers.sql");
    seedFixture(d);

    const before = counts(d);
    const passkeys = d
      .prepare(`SELECT id, passkey_id FROM users WHERE passkey_id IS NOT NULL ORDER BY id`)
      .all() as { id: string; passkey_id: string }[];
    const sessBefore = (
      d.prepare(`SELECT COUNT(*) AS n FROM sessions s JOIN users u ON u.id = s.user_id`).get() as { n: number }
    ).n;
    const refreshBefore = (
      d
        .prepare(`SELECT COUNT(*) AS n FROM refresh_tokens t JOIN users u ON u.id = t.user_id`)
        .get() as { n: number }
    ).n;
    expect(d.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    expect(before.users).toBe(2);
    expect(before.orders).toBe(1);
    expect(before.messages).toBe(1);
    expect(passkeys).toEqual([
      { id: "u-fix-c", passkey_id: "pk-ayse" },
      { id: "u-fix-p", passkey_id: "pk-elif" },
    ]);

    migrate(d);

    const after = counts(d);
    expect(after).toEqual(before);
    expect(d.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    expect(
      d.prepare(`SELECT id, passkey_id FROM users WHERE passkey_id IS NOT NULL ORDER BY id`).all(),
    ).toEqual(passkeys);
    expect(
      (d.prepare(`SELECT COUNT(*) AS n FROM sessions s JOIN users u ON u.id = s.user_id`).get() as { n: number }).n,
    ).toBe(sessBefore);
    expect(
      (d.prepare(`SELECT COUNT(*) AS n FROM refresh_tokens t JOIN users u ON u.id = t.user_id`).get() as { n: number })
        .n,
    ).toBe(refreshBefore);
    const sql = (d.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='users'`).get() as { sql: string })
      .sql;
    expect(sql).toContain("service_admin");
    expect(
      (d.prepare(`SELECT COUNT(*) AS n FROM schema_migrations WHERE id = '0005_service_admin.sql'`).get() as { n: number })
        .n,
    ).toBe(1);
    d.close();
  });
});

import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { migrate } from "./migrate";

function dbWithLegacyCategoryArtifacts() {
  const d = new Database(":memory:");
  d.pragma("foreign_keys = ON");
  const schema = fs.readFileSync(
    path.join(process.cwd(), "db/migrations/0001_schema.sql"),
    "utf8",
  );
  d.exec(schema);
  d.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `);
  d.prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)").run(
    "0001_schema.sql",
    new Date().toISOString(),
  );
  d.prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)").run(
    "0002_larger_order_sizes.sql",
    new Date().toISOString(),
  );

  d.exec(`
    CREATE TABLE service_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );
    INSERT INTO service_categories (id, name) VALUES ('davet', 'Davet');
    CREATE TABLE provider_products (id TEXT PRIMARY KEY, provider_id TEXT NOT NULL, name TEXT NOT NULL);
    INSERT INTO provider_products (id, provider_id, name) VALUES ('p1', 'elif', 'Kısır');

    INSERT INTO providers (id, payload) VALUES ('elif', '{"id":"elif","categoryId":"davet"}');
    INSERT INTO users (id, phone, name, full_name, role, preferred_category_ids, created_at, updated_at)
      VALUES ('u1', '5329990001', 'Test', 'Test', 'customer', '["davet","camasir"]', datetime('now'), datetime('now'));
    INSERT INTO orders (
      id, provider_id, user_id, package_id, express, drop_method, slot, note, total, commission,
      status, created_at, updated_at, machine_units
    ) VALUES (
      'ord-davet', 'elif', 'u1', 'davet', 0, 'kapi', '09:00–10:00', '', 100, 10,
      'pending', datetime('now'), datetime('now'), 1
    );
    INSERT INTO orders (
      id, provider_id, user_id, package_id, express, drop_method, slot, note, total, commission,
      status, created_at, updated_at, machine_units
    ) VALUES (
      'ord-yikama', 'elif', 'u1', 'yikama', 0, 'kapi', '09:00–10:00', '', 100, 10,
      'pending', datetime('now'), datetime('now'), 1
    );
  `);

  migrate(d);
  return d;
}

describe("0003 laundry legacy category cleanup", () => {
  it("eski kategori tablolarını ve çamaşır dışı siparişleri siler", () => {
    const d = dbWithLegacyCategoryArtifacts();

    const tables = (d
      .prepare(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('service_categories', 'provider_products')`,
      )
      .all() as { name: string }[]).map((r) => r.name);
    expect(tables).toEqual([]);

    const prefs = d.prepare("SELECT preferred_category_ids FROM users WHERE id = 'u1'").get() as {
      preferred_category_ids: string;
    };
    expect(prefs.preferred_category_ids).toBe('["camasir"]');

    const payload = JSON.parse(
      (d.prepare("SELECT payload FROM providers WHERE id = 'elif'").get() as { payload: string }).payload,
    ) as { categoryId?: string };
    expect(payload.categoryId).toBe("camasir");

    const legacyOrder = d.prepare("SELECT id FROM orders WHERE id = 'ord-davet'").get();
    expect(legacyOrder).toBeUndefined();
    const laundryOrder = d.prepare("SELECT id FROM orders WHERE id = 'ord-yikama'").get();
    expect(laundryOrder).toBeDefined();

    const applied = (d.prepare("SELECT id FROM schema_migrations ORDER BY id").all() as { id: string }[]).map(
      (r) => r.id,
    );
    expect(applied).toContain("0003_laundry_legacy_category_cleanup.sql");
  });
});

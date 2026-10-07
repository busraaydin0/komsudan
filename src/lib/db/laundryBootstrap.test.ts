import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { migrate } from "./migrate";
import { seedCatalog } from "./seed";

function freshDb() {
  const d = new Database(":memory:");
  d.pragma("foreign_keys = ON");
  migrate(d);
  seedCatalog(d);
  return d;
}

describe("çamaşır DB ayağa kalkışı", () => {
  it("boş DB: tek migration, seed, çekirdek tablolar", () => {
    const d = freshDb();

    const migrations = d
      .prepare("SELECT id FROM schema_migrations ORDER BY id")
      .all() as { id: string }[];
    expect(migrations.map((r) => r.id)).toEqual(["0001_schema.sql"]);

    const providers = d.prepare("SELECT id FROM providers ORDER BY id").all() as { id: string }[];
    expect(providers.map((p) => p.id)).toEqual([
      "ayse",
      "burak",
      "elif",
      "gulsen",
      "leyla",
      "merve",
      "selin",
      "zeynep",
    ]);

    const tables = d
      .prepare(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
         ORDER BY name`,
      )
      .all() as { name: string }[];
    expect(tables.map((t) => t.name)).toContain("appointments");
    expect(tables.map((t) => t.name)).toContain("handoff_codes");
    expect(tables.map((t) => t.name)).not.toContain("order_events");
    expect(tables.map((t) => t.name)).not.toContain("drop_points");
    expect(tables.map((t) => t.name)).not.toContain("service_categories");
  });
});

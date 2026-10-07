import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type Database from "better-sqlite3";
import type { AuthUser } from "@/lib/auth/types";

function chunkSizesKb(root: string) {
  const dir = path.join(root, ".next/static/chunks");
  if (!fs.existsSync(dir)) return { top: [], maplibreChunkKb: null };
  const rows = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".js"))
    .map((f) => {
      const full = path.join(dir, f);
      const buf = fs.readFileSync(full);
      const kb = Math.round(buf.length / 1024);
      const hasMap = buf.includes("maplibre") || buf.includes("MapLibre");
      return { file: f, kb, hasMap };
    })
    .sort((a, b) => b.kb - a.kb);
  const mapRow = rows.find((r) => r.hasMap);
  return { top: rows.slice(0, 8), maplibreChunkKb: mapRow?.kb ?? null, maplibreFile: mapRow?.file ?? null };
}

function routeHandlerSizesKb(root: string) {
  const pick = [
    ["catalog", "app/api/catalog/route.js"],
    ["orders", "app/api/orders/route.js"],
    ["providers", "app/api/providers/route.js"],
  ] as const;
  const out: Record<string, number> = {};
  for (const [key, rel] of pick) {
    const full = path.join(root, ".next/server", rel);
    if (fs.existsSync(full)) out[key] = Math.round(fs.statSync(full).size / 1024);
  }
  return out;
}

function pageRootMainKb(root: string) {
  const manifest = path.join(root, ".next/build-manifest.json");
  if (!fs.existsSync(manifest)) return null;
  const bm = JSON.parse(fs.readFileSync(manifest, "utf8")) as {
    rootMainFiles?: string[];
    polyfillFiles?: string[];
  };
  const chunks = new Set([...(bm.rootMainFiles ?? []), ...(bm.polyfillFiles ?? [])]);
  let total = 0;
  for (const rel of chunks) {
    const full = path.join(root, ".next", rel);
    if (fs.existsSync(full)) total += fs.statSync(full).size;
  }
  return Math.round(total / 1024);
}

function attachQueryCounter(database: Database.Database) {
  let prepareCalls = 0;
  let execCalls = 0;
  const origPrepare = database.prepare.bind(database);
  const origExec = database.exec.bind(database);
  database.prepare = (...args) => {
    prepareCalls++;
    return origPrepare(...args);
  };
  database.exec = (...args) => {
    execCalls++;
    return origExec(...args);
  };
  return {
    snapshot() {
      const n = prepareCalls + execCalls;
      prepareCalls = 0;
      execCalls = 0;
      return n;
    },
  };
}

describe("performans ölçümü (rapor)", () => {
  it("build + DB metriklerini yazar", async () => {
    const root = path.join(process.cwd());
    const build = {
      pageRootMainKb: pageRootMainKb(root),
      ...chunkSizesKb(root),
      routeHandlersKb: routeHandlerSizesKb(root),
    };

    const tmp = path.join(os.tmpdir(), `komsu-perf-${Date.now()}.db`);
    process.env.KOMSU_DB_PATH = tmp;

    const g = globalThis as typeof globalThis & {
      __komsuDb?: Database.Database;
      __komsuDbReady?: boolean;
    };
    delete g.__komsuDb;
    delete g.__komsuDbReady;

    const { db } = await import("@/lib/db/client");
    const { providersLive } = await import("@/lib/services/catalogService");
    const { listOrdersFor, createOrder } = await import("@/lib/services/orderService");

    const database = db();
    const counter = attachQueryCounter(database);

    const authUser: AuthUser = {
      id: "perf-customer",
      phone: "5550000999",
      role: "customer",
      preferredCategoryIds: ["camasir"],
      preferredIntent: "seek",
      onboardingCompletedAt: new Date().toISOString(),
      homeLat: null,
      homeLng: null,
      homeNeighborhood: null,
      avatarUrl: null,
      name: "Perf",
      fullName: "Perf User",
      identityVerified: false,
      passkeyEnabled: false,
    };

    counter.snapshot();

    const tCat0 = performance.now();
    const providers = providersLive();
    const catalogMs = Math.round((performance.now() - tCat0) * 100) / 100;
    const catalogQueries = counter.snapshot();

    const tOrd0 = performance.now();
    const orders = listOrdersFor(authUser);
    const ordersMs = Math.round((performance.now() - tOrd0) * 100) / 100;
    const ordersQueries = counter.snapshot();

    let createMs = 0;
    let createQueries = 0;
    let createOk = false;
    const p0 = providers[0];
    if (p0) {
      counter.snapshot();
      const tCr0 = performance.now();
      try {
        createOrder(
          {
            providerId: p0.id,
            drop: "kapi",
            note: "perf",
            packageId: "tam",
            size: "orta",
            addons: [],
            pickup: { date: "2026-10-15", windowStart: "10:00", windowEnd: "12:00" },
            delivery: { date: "2026-10-16", windowStart: "10:00", windowEnd: "12:00" },
          },
          authUser.id,
        );
        createOk = true;
      } catch {
        createOk = false;
      }
      createMs = Math.round((performance.now() - tCr0) * 100) / 100;
      createQueries = counter.snapshot();
    }

    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }

    const report = {
      build,
      db: {
        catalogList: { ms: catalogMs, prepareCalls: catalogQueries, providers: providers.length },
        orderList: { ms: ordersMs, prepareCalls: ordersQueries, orders: orders.length },
        createOrder: { ms: createMs, prepareCalls: createQueries, ok: createOk },
      },
    };

    const outPath = path.join(root, "data", "perf-report.json");
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

    expect(build.pageRootMainKb).toBeGreaterThan(0);
  });
});

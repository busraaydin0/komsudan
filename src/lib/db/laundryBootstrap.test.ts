import { describe, expect, it } from "vitest";
import { db } from "./client";

describe("çamaşır DB ayağa kalkışı", () => {
  it("migrate + seed yalnız camasir ve çamaşır sağlayıcıları yazar", () => {
    const d = db();
    const cats = d.prepare("SELECT id FROM service_categories ORDER BY id").all() as { id: string }[];
    expect(cats.map((r) => r.id)).toEqual(["camasir"]);

    const files = d
      .prepare("SELECT id FROM _migrations WHERE id LIKE '%.sql' ORDER BY id")
      .all() as { id: string }[];
    expect(files.map((r) => r.id)).toEqual([
      "0001_pilot.sql",
      "0002_auth.sql",
      "0003_providers.sql",
      "0004_orders.sql",
      "0005_order_history.sql",
      "0006_notifications.sql",
      "0007_payments.sql",
      "0008_categories.sql",
      "0009_onboarding.sql",
      "0011_appointments.sql",
      "0012_disputes.sql",
      "0013_review_dimensions.sql",
      "0014_order_messages.sql",
      "0015_wallets.sql",
      "0016_drop_points_v03.sql",
      "0017_order_size_model.sql",
      "0018_capacity_calendar.sql",
      "0019_appointments_p11.sql",
      "0020_handoff_codes.sql",
    ]);

    const providers = d.prepare("SELECT id, category_id FROM providers ORDER BY id").all() as {
      id: string;
      category_id: string;
    }[];
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
    expect(providers.every((p) => p.category_id === "camasir")).toBe(true);
    expect(providers.some((p) => p.id === "fatma" || p.id === "okan")).toBe(false);

    const extras = d
      .prepare(
        `SELECT name FROM sqlite_master WHERE type = 'table'
         AND name IN (
           'provider_products','provider_services','provider_repairs','provider_tech',
           'provider_couriers','provider_gardens','provider_cargos','provider_prints',
           'provider_preserves','provider_carpets','provider_lessons','provider_talks','provider_graves'
         )`,
      )
      .all();
    expect(extras).toEqual([]);

    const kept = d
      .prepare(
        `SELECT name FROM sqlite_master WHERE type = 'table'
         AND name IN ('appointments','availability_slots','wallets','drop_points','provider_drop_points')
         ORDER BY name`,
      )
      .all() as { name: string }[];
    expect(kept.map((r) => r.name)).toEqual([
      "appointments",
      "availability_slots",
      "wallets",
    ]);
  });
});

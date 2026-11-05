import { describe, expect, it } from "vitest";
import { db } from "./client";
import { DEMO_CUSTOMER_PHONE, DEMO_PHONES, seedDemoScenario } from "./seedDemo";
import { DEMO_SERVICE_ADMIN_PHONE } from "./seed";

describe("demo reset", () => {
  it("temiz demo DB kurar", () => {
    if (process.env.NODE_ENV === "production") {
      throw new Error("demo:reset production'da yok");
    }
    db();
    seedDemoScenario();
    const user = db()
      .prepare("SELECT phone, role FROM users WHERE phone = ?")
      .get(DEMO_CUSTOMER_PHONE) as { phone: string; role: string } | undefined;
    const admin = db()
      .prepare("SELECT phone FROM users WHERE phone = ?")
      .get(DEMO_SERVICE_ADMIN_PHONE) as { phone: string } | undefined;
    expect(user?.role).toBe("customer");
    expect(admin?.phone).toBe(DEMO_SERVICE_ADMIN_PHONE);
    expect(DEMO_PHONES.customer).toBe(DEMO_CUSTOMER_PHONE);
    expect(
      (db().prepare(`SELECT COUNT(*) AS n FROM orders WHERE id LIKE 'demo-live-%'`).get() as { n: number }).n,
    ).toBeGreaterThanOrEqual(7);
    console.log("Demo telefonlar:", DEMO_PHONES.customer, DEMO_PHONES.elif, DEMO_PHONES.serviceAdmin);
  });
});

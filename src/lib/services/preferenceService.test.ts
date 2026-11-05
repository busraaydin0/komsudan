import { describe, expect, it } from "vitest";
import { requestOtp, verifyOtp } from "./authService";
import { savePreferences } from "./preferenceService";

async function customer(phone: string) {
  const sent = requestOtp(phone);
  const session = await verifyOtp(phone, sent.demoCode!);
  return session.user;
}

describe("savePreferences (çamaşır pilot)", () => {
  it("çamaşır dışı id tercihten düşer; camasir kalır", async () => {
    const user = await customer("5550000891");
    const next = savePreferences(user, {
      intent: "seek",
      categoryIds: ["camasir", "legacy-id"],
      completed: true,
    });
    expect(next.preferredCategoryIds).toEqual(["camasir"]);
  });

  it("yalnızca camasir yazar; gönderilen id listesi yok sayılır", async () => {
    const user = await customer("5550000892");
    const next = savePreferences(user, { categoryIds: ["unknown"] });
    expect(next.preferredCategoryIds).toEqual(["camasir"]);
  });
});

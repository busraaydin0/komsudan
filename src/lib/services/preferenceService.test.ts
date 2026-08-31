import { describe, expect, it } from "vitest";
import { ApiError } from "@/server/rules";
import { requestOtp, verifyOtp } from "./authService";
import { savePreferences } from "./preferenceService";

async function customer(phone: string) {
  const sent = requestOtp(phone);
  const session = await verifyOtp(phone, sent.demoCode!);
  return session.user;
}

describe("savePreferences kategori eşlemesi", () => {
  it("silinen musluk id’sini Tamir’e çevirir, çamaşırı korur", async () => {
    const user = await customer("5550000891");
    const next = savePreferences(user, {
      intent: "seek",
      categoryIds: ["camasir", "musluk"],
      completed: true,
    });
    expect(next.preferredCategoryIds).toEqual(["camasir", "tamir"]);
  });

  it("bilinmeyen id tek başına gelince reddeder", async () => {
    const user = await customer("5550000892");
    expect(() => savePreferences(user, { categoryIds: ["foto"] })).toThrow(ApiError);
  });
});

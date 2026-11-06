import { afterEach, describe, expect, it, vi } from "vitest";
import { requireJwtSecret, signAccess, verifyAccess } from "./jwt";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("JWT_SECRET", () => {
  it("yoksa veya kısaysa durur; rastgele üretmez", () => {
    vi.stubEnv("JWT_SECRET", "");
    expect(() => requireJwtSecret()).toThrow(/JWT_SECRET/);
    vi.stubEnv("JWT_SECRET", "too-short");
    expect(() => requireJwtSecret()).toThrow(/32/);
  });

  it("tanımlı secret ile imza doğrulanır", async () => {
    vi.stubEnv("JWT_SECRET", "test-jwt-secret-must-be-at-least-32-chars");
    const token = await signAccess("user-1", "customer");
    await expect(verifyAccess(token)).resolves.toMatchObject({ sub: "user-1", role: "customer" });
  });
});

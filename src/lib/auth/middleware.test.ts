import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors";

vi.mock("@/lib/auth/cookies", () => ({
  readCookie: vi.fn(async () => null),
  ACCESS_COOKIE: "komsu_at",
  REFRESH_COOKIE: "komsu_rt",
  SESSION_COOKIE: "komsu_sid",
}));

import { requireAuth } from "./middleware";

describe("requireAuth", () => {
  it("oturum yoksa 401 döner", async () => {
    await expect(requireAuth(new Request("http://localhost/api/me"))).rejects.toBeInstanceOf(ApiError);
    await expect(requireAuth(new Request("http://localhost/api/me"))).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHORIZED",
    });
  });
});

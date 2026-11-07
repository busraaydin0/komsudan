import { afterEach, describe, expect, it, vi } from "vitest";
import { cookieSecure } from "./cookieSecure";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("cookieSecure", () => {
  it("development HTTP'de Secure değil", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("COOKIE_SECURE", "");
    expect(cookieSecure({ proto: "http" })).toBe(false);
    expect(cookieSecure({ proto: "https" })).toBe(false);
  });

  it("production HTTP'de Secure değil (LAN / localhost)", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("COOKIE_SECURE", "");
    expect(cookieSecure({ proto: "http" })).toBe(false);
    expect(cookieSecure({ proto: "http,http" })).toBe(false);
    expect(cookieSecure({})).toBe(false);
  });

  it("production HTTPS'te Secure", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("COOKIE_SECURE", "");
    expect(cookieSecure({ proto: "https" })).toBe(true);
    expect(cookieSecure({ proto: "https,http" })).toBe(true);
  });

  it("COOKIE_SECURE=0 production HTTPS'i bile kapatır", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("COOKIE_SECURE", "0");
    expect(cookieSecure({ proto: "https" })).toBe(false);
  });
});

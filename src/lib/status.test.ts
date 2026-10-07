import { describe, expect, it } from "vitest";
import {
  ALLOWED_TRANSITIONS,
  canTransition,
  nextOperationalStatus,
  trackSteps,
} from "./status";

describe("ALLOWED_TRANSITIONS", () => {
  it("pending çıkışları", () => {
    expect(ALLOWED_TRANSITIONS.pending).toEqual(["accepted", "rejected", "dropped_off"]);
  });
});

describe("canTransition", () => {
  it("admin tüm grafik geçişlerini yapabilir (paket kuralları hariç)", () => {
    expect(canTransition("pending", "accepted", "admin", { packageId: "katlama" })).toBe(true);
    expect(canTransition("washing", "ready", "admin", { packageId: "katlama" })).toBe(true);
  });

  it("provider kabul ve operasyon adımları", () => {
    expect(canTransition("pending", "accepted", "provider", { packageId: "yikama" })).toBe(true);
    expect(canTransition("accepted", "dropped_off", "provider", { packageId: "yikama" })).toBe(true);
    expect(canTransition("ready", "completed", "provider", { packageId: "yikama", isOrderParty: true })).toBe(
      true,
    );
  });

  it("müşteri completed yapamaz (taraf değilse)", () => {
    expect(canTransition("ready", "completed", "customer", { packageId: "yikama", isOrderParty: false })).toBe(
      false,
    );
    expect(canTransition("ready", "completed", "customer", { packageId: "yikama", isOrderParty: true })).toBe(
      true,
    );
  });

  it("müşteri accepted yapamaz", () => {
    expect(canTransition("pending", "accepted", "customer", { packageId: "katlama" })).toBe(false);
  });

  it("tam pakette yıkama → hazır yasak", () => {
    expect(canTransition("washing", "ready", "provider", { packageId: "tam" })).toBe(false);
    expect(canTransition("washing", "ironing", "provider", { packageId: "tam" })).toBe(true);
  });

  it("ütü olmayan pakette ironing yasak", () => {
    expect(canTransition("washing", "ironing", "provider", { packageId: "katlama" })).toBe(false);
  });

  it("grafik dışı geçiş", () => {
    expect(canTransition("completed", "pending", "admin", { packageId: "katlama" })).toBe(false);
    expect(canTransition("pending", "washing", "provider", { packageId: "katlama" })).toBe(false);
  });

  it("accepted → cancelled müşteri veya provider", () => {
    expect(canTransition("accepted", "cancelled", "customer", { packageId: "katlama" })).toBe(true);
  });
});

describe("operasyon adımları", () => {
  it("tam pakette ütü basamağı", () => {
    expect(trackSteps("tam")).toEqual([
      "pending",
      "accepted",
      "washing",
      "ironing",
      "ready",
      "completed",
    ]);
    expect(nextOperationalStatus("accepted", "yikama")).toBe("dropped_off");
    expect(nextOperationalStatus("washing", "tam")).toBe("ironing");
    expect(nextOperationalStatus("washing", "katlama")).toBe("ready");
  });
});

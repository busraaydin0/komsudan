import { describe, expect, it } from "vitest";
import { pickTrackedOrderId } from "./pickTrackedOrder";

describe("pickTrackedOrderId", () => {
  const ready = { id: "demo-ready", status: "ready", createdAt: "2026-11-09T00:00:00.000Z" };
  const pending = { id: "new-pending", status: "pending", createdAt: "2026-11-09T00:10:00.000Z" };
  const accepted = { id: "demo-acc", status: "accepted", createdAt: "2026-11-09T00:05:00.000Z" };

  it("yeni bırakılan pending, hazır demoya yenilmez", () => {
    expect(pickTrackedOrderId([ready, accepted, pending], "new-pending")).toBe("new-pending");
  });

  it("seçim yoksa en yeni onayı bekleyen açılır", () => {
    expect(pickTrackedOrderId([ready, pending, accepted], null)).toBe("new-pending");
  });

  it("hazır demo seçili olsa bile yeni pending öne çıkar", () => {
    expect(pickTrackedOrderId([ready, accepted, pending], "demo-ready")).toBe("new-pending");
  });
});

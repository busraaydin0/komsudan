import { describe, expect, it } from "vitest";
import { tabForNotice } from "./noticeTab";

describe("tabForNotice", () => {
  it("yeni sipariş ve cevap hatırlatması Hizmet’e gider", () => {
    expect(tabForNotice("order_created")).toBe("hizmet");
    expect(tabForNotice("order_respond_reminder")).toBe("hizmet");
  });

  it("müşteri sipariş bildirimi Sipariş’e gider", () => {
    expect(tabForNotice("order_accepted")).toBe("siparis");
    expect(tabForNotice("order_ready")).toBe("siparis");
    expect(tabForNotice("pickup_code")).toBe("siparis");
  });

  it("mesaj Mesaj’a, dürtme Harita’ya", () => {
    expect(tabForNotice("order_message")).toBe("mesaj");
    expect(tabForNotice("nudge")).toBe("harita");
  });
});

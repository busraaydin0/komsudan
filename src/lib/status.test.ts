import { describe, expect, it } from "vitest";
import { CATALOG_CATEGORY_IDS } from "@/lib/categories/registry";
import { nextStatus, trackSteps } from "./status";

const FOOD_STEPS = ["onay_bekliyor", "teslim_alindi", "hazir", "teslim_edildi"] as const;

describe("Tip A kısaltılmış state machine", () => {
  it("onay_bekliyor → teslim_alindi → hazir → teslim_edildi", () => {
    expect(nextStatus("onay_bekliyor", "davet")).toBe("teslim_alindi");
    expect(nextStatus("teslim_alindi", "davet")).toBe("hazir");
    expect(nextStatus("hazir", "davet")).toBe("teslim_edildi");
    expect(nextStatus("teslim_edildi", "davet")).toBeNull();
  });

  it("14 katalog kategorisinde yıkama/ütü adımı yok", () => {
    for (const id of CATALOG_CATEGORY_IDS) {
      expect(trackSteps(id)).toEqual([...FOOD_STEPS]);
      expect(nextStatus("teslim_alindi", id)).toBe("hazir");
      expect(nextStatus("teslim_alindi", id)).not.toBe("yikaniyor");
    }
  });

  it("çamaşır tam pakette ütü basamağını korur", () => {
    expect(trackSteps("tam")).toEqual([
      "onay_bekliyor",
      "teslim_alindi",
      "yikaniyor",
      "utuleniyor",
      "hazir",
      "teslim_edildi",
    ]);
    expect(nextStatus("teslim_alindi", "yikama")).toBe("yikaniyor");
    expect(nextStatus("yikaniyor", "tam")).toBe("utuleniyor");
  });
});

import { describe, expect, it } from "vitest";
import { nextStatus, trackSteps } from "./status";

const FOOD_STEPS = ["onay_bekliyor", "teslim_alindi", "hazir", "teslim_edildi"] as const;

describe("Tip A kısaltılmış state machine", () => {
  it("food SM flag: onay_bekliyor → teslim_alindi → hazir → teslim_edildi", () => {
    expect(nextStatus("onay_bekliyor", "tam", true)).toBe("teslim_alindi");
    expect(nextStatus("teslim_alindi", "tam", true)).toBe("hazir");
    expect(nextStatus("hazir", "tam", true)).toBe("teslim_edildi");
    expect(nextStatus("teslim_edildi", "tam", true)).toBeNull();
    expect(trackSteps("tam", true)).toEqual([...FOOD_STEPS]);
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

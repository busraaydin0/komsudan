import { describe, expect, it } from "vitest";
import { nextStatus, trackSteps } from "./status";

describe("çamaşır state machine", () => {
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

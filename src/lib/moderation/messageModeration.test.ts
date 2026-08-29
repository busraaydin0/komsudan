import { describe, expect, it } from "vitest";
import { moderateMessage } from "./messageModeration";
import { normalizeForMatch } from "./normalize";
import { hasPersonalInfo } from "./personalInfo";
import { hasProfanity } from "./profanity";
import { isOffPlatform } from "./offPlatform";

describe("mesaj moderasyonu", () => {
  it("normalize harf tekrarı ve ayırıcıyı yok sayar", () => {
    expect(normalizeForMatch("Siiikkk t.i.r")).toContain("siktir");
  });

  it("küfür block, normal cümle allow", () => {
    expect(hasProfanity("siktir git")).toBe(true);
    expect(moderateMessage("siktir git").decision).toBe("block");
    expect(moderateMessage("Yarın 14:00 uygun mudur?").decision).toBe("allow");
    expect(moderateMessage("3 adet gömlek bırakacağım").decision).toBe("allow");
  });

  it("telefon e-posta IBAN block, kısa sayı değil", () => {
    expect(hasPersonalInfo("0532 111 22 33 ara")).toBe(true);
    expect(hasPersonalInfo("5321112233")).toBe(true);
    expect(hasPersonalInfo("bana yaz: ali@posta.com")).toBe(true);
    expect(hasPersonalInfo("TR33 0006 1005 1978 6457 8413 26")).toBe(true);
    expect(hasPersonalInfo("3 adet gömlek")).toBe(false);
    expect(hasPersonalInfo("Yarın 14:00 uygun mudur?")).toBe(false);
    expect(moderateMessage("Numaram 05321112233").decision).toBe("block");
  });

  it("WhatsApp / IBAN at yönlendirmesi warn", () => {
    expect(isOffPlatform("WhatsApp'tan yaz")).toBe(true);
    expect(moderateMessage("WhatsApp'tan yaz").decision).toBe("warn");
    expect(moderateMessage("IBAN atayım").decision).toBe("warn");
  });
});

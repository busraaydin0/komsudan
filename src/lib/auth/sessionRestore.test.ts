import { describe, expect, it } from "vitest";
import { requestOtp, verifyOtp, loadUserBySession } from "@/lib/services/authService";
import { verifyAccess } from "./jwt";

describe("oturum kalıcılığı", () => {
  it("session token access JWT olmasa da kullanıcıyı geri yükler", async () => {
    const phone = "5550000190";
    const sent = requestOtp(phone);
    const tokens = await verifyOtp(phone, sent.demoCode!);
    expect(tokens.sessionToken).toBeTruthy();
    const fromJwt = await verifyAccess(tokens.accessToken);
    expect(fromJwt?.sub).toBe(tokens.user.id);
    const restored = loadUserBySession(tokens.sessionToken!);
    expect(restored?.id).toBe(tokens.user.id);
    expect(restored?.phone).toBe(phone);
  });
});

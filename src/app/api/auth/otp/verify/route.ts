import { fail, ok } from "@/server/http";
import { parseBody, otpVerifySchema } from "@/lib/validation/auth.schema";
import { verifyOtp } from "@/lib/services/authService";
import { setAuthCookies } from "@/lib/auth/cookies";
import { publicUser } from "@/lib/auth/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await parseBody(req, otpVerifySchema);
    const tokens = await verifyOtp(body.phone, body.code);
    await setAuthCookies(tokens);
    return ok({
      user: publicUser(tokens.user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessExpiresIn: tokens.accessExpiresIn,
    });
  } catch (e) {
    return fail(e);
  }
}

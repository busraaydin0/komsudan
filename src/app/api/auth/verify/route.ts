import { fail } from "@/lib/http/response";
import { parseBody, otpVerifySchema } from "@/lib/validation/auth.schema";
import { verifyOtp } from "@/lib/services/authService";
import { setAuthCookies } from "@/lib/auth/cookies";
import { toAccount } from "@/lib/auth/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await parseBody(req, otpVerifySchema);
    const tokens = await verifyOtp(body.phone, body.code);
    await setAuthCookies(tokens);
    return Response.json({ account: toAccount(tokens.user) });
  } catch (e) {
    return fail(e);
  }
}

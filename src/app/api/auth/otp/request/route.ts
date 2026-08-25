import { fail, ok } from "@/server/http";
import { parseBody, phoneSchema } from "@/lib/validation/auth.schema";
import { requestOtp } from "@/lib/services/authService";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await parseBody(req, phoneSchema);
    const result = requestOtp(body.phone);
    return ok({
      expiresAt: result.expiresAt,
      sms: result.sms,
      ...(result.demoCode ? { demoCode: result.demoCode } : {}),
    });
  } catch (e) {
    return fail(e);
  }
}

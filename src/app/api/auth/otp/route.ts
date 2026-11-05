import { fail } from "@/lib/http/response";
import { parseBody, phoneSchema } from "@/lib/validation/auth.schema";
import { requestOtp } from "@/lib/services/authService";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await parseBody(req, phoneSchema);
    const result = requestOtp(body.phone);
    return Response.json({
      ok: true,
      sms: result.sms,
      demoCode: result.demoCode ?? "",
    });
  } catch (e) {
    return fail(e);
  }
}

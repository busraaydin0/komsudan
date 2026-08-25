import { fail } from "@/server/http";
import { normalizePhone, verifyOtp } from "@/server/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { phone?: string; code?: string };
    const phone = normalizePhone(body.phone ?? "");
    const account = await verifyOtp(phone, body.code ?? "");
    return Response.json({ account });
  } catch (e) {
    return fail(e);
  }
}

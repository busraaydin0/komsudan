import { fail } from "@/server/http";
import { issueOtp, normalizePhone } from "@/server/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { phone?: string };
    const phone = normalizePhone(body.phone ?? "");
    const code = issueOtp(phone);
    return Response.json({
      ok: true,
      sms: `Komşudan giriş kodu: ${code} (SMS simülasyonu, gerçek SMS yok.)`,
      demoCode: code,
    });
  } catch (e) {
    return fail(e);
  }
}

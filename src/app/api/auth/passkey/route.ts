import { fail } from "@/server/http";
import { assertPasskey, deliveredCount, enablePasskey } from "@/server/auth";
import { loyaltyForSession } from "@/lib/loyalty";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { credentialId?: string; assert?: boolean };
    const account = body.assert
      ? await assertPasskey(body.credentialId ?? "")
      : await enablePasskey(body.credentialId ?? "");
    return Response.json({
      account,
      loyalty: loyaltyForSession(deliveredCount(account.id)),
    });
  } catch (e) {
    return fail(e);
  }
}

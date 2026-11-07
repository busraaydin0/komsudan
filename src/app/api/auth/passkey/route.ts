import { fail } from "@/lib/http/response";
import { assertPasskey, enablePasskey } from "@/lib/auth/routeAccount";
import { parseBody, passkeyBodySchema } from "@/lib/validation/auth.schema";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await parseBody(req, passkeyBodySchema);
    const account = body.assert
      ? await assertPasskey(body.credentialId ?? "")
      : await enablePasskey(body.credentialId ?? "");
    return Response.json({ account });
  } catch (e) {
    return fail(e);
  }
}

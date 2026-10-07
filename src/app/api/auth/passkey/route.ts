import { fail } from "@/server/http";
import { assertPasskey, enablePasskey } from "@/server/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { credentialId?: string; assert?: boolean };
    const account = body.assert
      ? await assertPasskey(body.credentialId ?? "")
      : await enablePasskey(body.credentialId ?? "");
    return Response.json({ account });
  } catch (e) {
    return fail(e);
  }
}

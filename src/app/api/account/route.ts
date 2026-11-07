import { fail } from "@/lib/http/response";
import { updateProfile, verifyIdentity } from "@/lib/auth/routeAccount";
import { accountPatchSchema, parseBody } from "@/lib/validation/auth.schema";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  try {
    const body = await parseBody(req, accountPatchSchema);
    const account = body.identity
      ? await verifyIdentity(body.name ?? "")
      : await updateProfile(body.name ?? "");
    return Response.json({ account });
  } catch (e) {
    return fail(e);
  }
}

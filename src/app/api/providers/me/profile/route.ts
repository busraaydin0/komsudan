import { fail, ok } from "@/server/http";
import { parseBody } from "@/lib/validation/parse";
import { profilePatchSchema } from "@/lib/validation/provider.schema";
import { requireAuth } from "@/lib/auth/middleware";
import { getProviderPublic, patchMyProfile } from "@/lib/services/providerService";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req, "provider");
    return ok({ provider: getProviderPublic(user.id) });
  } catch (e) {
    return fail(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireAuth(req, "provider");
    const body = await parseBody(req, profilePatchSchema);
    return ok({ provider: patchMyProfile(user, body) });
  } catch (e) {
    return fail(e);
  }
}

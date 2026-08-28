import { fail, ok } from "@/server/http";
import { parseBody } from "@/lib/validation/parse";
import { preferencesPatchSchema } from "@/lib/validation/preferences.schema";
import { requireAuth } from "@/lib/auth/middleware";
import { publicUser } from "@/lib/auth/types";
import { savePreferences } from "@/lib/services/preferenceService";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  try {
    const user = await requireAuth(req);
    const body = await parseBody(req, preferencesPatchSchema);
    const next = savePreferences(user, body);
    return ok({ user: publicUser(next), account: publicUser(next) });
  } catch (e) {
    return fail(e);
  }
}

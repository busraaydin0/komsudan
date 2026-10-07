import { fail, ok } from "@/server/http";
import { parseBody, mePatchSchema } from "@/lib/validation/auth.schema";
import { requireAuth } from "@/lib/auth/middleware";
import { publicUser } from "@/lib/auth/types";
import { updateProfile } from "@/lib/services/authService";
import { deleteMyAccount } from "@/server/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req);
    return ok({ user: publicUser(user) });
  } catch (e) {
    return fail(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireAuth(req);
    const body = await parseBody(req, mePatchSchema);
    const name = body.fullName ?? body.name;
    if (!name) {
      return ok({ user: publicUser(user) });
    }
    const next = updateProfile(user, name);
    return ok({ user: publicUser(next) });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE() {
  try {
    await deleteMyAccount();
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}

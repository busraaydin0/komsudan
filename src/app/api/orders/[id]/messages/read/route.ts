import { fail, ok } from "@/server/http";
import { requireAuth } from "@/lib/auth/middleware";
import { readOrderMessages } from "@/lib/services/messageService";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const user = await requireAuth(req);
    const { id } = await ctx.params;
    return ok(readOrderMessages(user, id));
  } catch (e) {
    return fail(e);
  }
}

import { fail, ok } from "@/server/http";
import { requireAuth } from "@/lib/auth/middleware";
import { parseBody } from "@/lib/validation/parse";
import { patchDisputeSchema } from "@/lib/validation/dispute.schema";
import { resolveDispute } from "@/lib/services/disputeService";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const user = await requireAuth(req);
    const { id } = await ctx.params;
    await parseBody(req, patchDisputeSchema);
    return ok({ dispute: resolveDispute(user, id) });
  } catch (e) {
    return fail(e);
  }
}

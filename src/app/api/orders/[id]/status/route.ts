import { fail, ok } from "@/server/http";
import { requireAuth } from "@/lib/auth/middleware";
import { parseBody } from "@/lib/validation/parse";
import { patchStatusSchema } from "@/lib/validation/order.schema";
import { applyStatus } from "@/lib/services/orderService";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const user = await requireAuth(req);
    const { id } = await ctx.params;
    const body = await parseBody(req, patchStatusSchema);
    const order = applyStatus(id, user, body.status, body.code, body.note);
    return ok({ order });
  } catch (e) {
    return fail(e);
  }
}

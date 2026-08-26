import { fail, ok } from "@/server/http";
import { requireAuth } from "@/lib/auth/middleware";
import { parseBody } from "@/lib/validation/parse";
import { patchOrderSchema } from "@/lib/validation/order.schema";
import { applyOrderAction, getOrderFor } from "@/lib/services/orderService";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const user = await requireAuth(req);
    const { id } = await ctx.params;
    return ok({ order: getOrderFor(user, id) });
  } catch (e) {
    return fail(e);
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const user = await requireAuth(req);
    const { id } = await ctx.params;
    const body = await parseBody(req, patchOrderSchema);
    const order = applyOrderAction(id, body.action, user, body.code);
    return ok({ order });
  } catch (e) {
    return fail(e);
  }
}

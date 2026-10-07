import { fail, ok } from "@/server/http";
import { requireAuth } from "@/lib/auth/middleware";
import { parseBody } from "@/lib/validation/parse";
import { deliveryOverrideResolveSchema } from "@/lib/validation/order.schema";
import { adminResolveOverride } from "@/lib/services/deliveryOverrideService";
import { getOrderFor } from "@/lib/services/orderService";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    const user = await requireAuth(req);
    const { id } = await ctx.params;
    const body = await parseBody(req, deliveryOverrideResolveSchema);
    adminResolveOverride(user, id, body.approve, body.reason);
    return ok({ order: getOrderFor(user, id) });
  } catch (e) {
    return fail(e);
  }
}

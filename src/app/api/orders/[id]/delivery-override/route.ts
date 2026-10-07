import { fail, ok } from "@/server/http";
import { requireAuth } from "@/lib/auth/middleware";
import { parseBody } from "@/lib/validation/parse";
import { deliveryOverrideSchema } from "@/lib/validation/order.schema";
import { requestDeliveryOverride } from "@/lib/services/deliveryOverrideService";
import { getOrderFor } from "@/lib/services/orderService";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    const user = await requireAuth(req);
    const { id } = await ctx.params;
    const body = await parseBody(req, deliveryOverrideSchema);
    requestDeliveryOverride(user, id, body);
    return ok({ order: getOrderFor(user, id) });
  } catch (e) {
    return fail(e);
  }
}

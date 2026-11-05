import { fail, ok } from "@/lib/http/response";
import { requireAuth } from "@/lib/auth/middleware";
import { parseBody } from "@/lib/validation/parse";
import { priceChangeSchema } from "@/lib/validation/order.schema";
import { respondPriceChange } from "@/lib/services/pickupConfirmService";
import { getOrderFor } from "@/lib/services/orderService";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(req);
    const { id } = await ctx.params;
    const body = await parseBody(req, priceChangeSchema);
    respondPriceChange(user, id, body.action);
    return ok({ order: getOrderFor(user, id) });
  } catch (e) {
    return fail(e);
  }
}

import { fail, ok } from "@/server/http";
import { requireAuth } from "@/lib/auth/middleware";
import { parseBody } from "@/lib/validation/parse";
import { pickupConfirmSchema } from "@/lib/validation/order.schema";
import { confirmPickupAtDoor } from "@/lib/services/pickupConfirmService";
import { getOrderFor } from "@/lib/services/orderService";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(req);
    const { id } = await ctx.params;
    const body = await parseBody(req, pickupConfirmSchema);
    confirmPickupAtDoor(user, id, {
      confirmedSize: body.confirmedSize,
      addons: body.addons,
      colorGroups: body.colorGroups,
    });
    return ok({ order: getOrderFor(user, id) });
  } catch (e) {
    return fail(e);
  }
}

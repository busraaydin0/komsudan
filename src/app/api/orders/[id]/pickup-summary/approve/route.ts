import { fail, ok } from "@/server/http";
import { requireAuth } from "@/lib/auth/middleware";
import { approvePickupSummary } from "@/lib/services/handoffService";
import { getOrderFor } from "@/lib/services/orderService";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    const user = await requireAuth(req);
    const { id } = await ctx.params;
    approvePickupSummary(user, id);
    return ok({ order: getOrderFor(user, id) });
  } catch (e) {
    return fail(e);
  }
}

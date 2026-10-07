import { fail, ok } from "@/lib/http/response";
import { parseBody } from "@/lib/validation/parse";
import { requireAuth } from "@/lib/auth/middleware";
import { delayOrder } from "@/lib/services/delayOrderService";
import { z } from "zod";

export const dynamic = "force-dynamic";

const delaySchema = z.object({
  reason: z.string().trim().min(3).max(500),
  extendHours: z.number().int().min(1).max(72),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(req);
    const { id } = await ctx.params;
    const body = await parseBody(req, delaySchema);
    delayOrder(user, id, body.reason, body.extendHours);
    return ok({ orderId: id });
  } catch (e) {
    return fail(e);
  }
}

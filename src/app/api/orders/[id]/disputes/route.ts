import { fail, ok } from "@/server/http";
import { requireAuth } from "@/lib/auth/middleware";
import { parseBody } from "@/lib/validation/parse";
import { createDisputeSchema } from "@/lib/validation/dispute.schema";
import { listDisputesOnOrder, openDispute } from "@/lib/services/disputeService";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const user = await requireAuth(req);
    const { id } = await ctx.params;
    return ok({ disputes: listDisputesOnOrder(user, id) });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    const user = await requireAuth(req);
    const { id } = await ctx.params;
    const body = await parseBody(req, createDisputeSchema);
    const dispute = openDispute(user, id, body.reason);
    return ok({ dispute }, 201);
  } catch (e) {
    return fail(e);
  }
}

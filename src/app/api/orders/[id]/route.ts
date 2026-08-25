import { applyOrderAction, getOrder, type OrderAction } from "@/server/orders";
import { fail } from "@/server/http";
import { requireAccount } from "@/server/auth";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    await requireAccount();
    const { id } = await ctx.params;
    const order = getOrder(id);
    if (!order) return Response.json({ error: "Sipariş yok." }, { status: 404 });
    return Response.json({ order });
  } catch (e) {
    return fail(e);
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    await requireAccount();
    const { id } = await ctx.params;
    const body = (await req.json()) as { action?: string; code?: string };
    const action = body.action as OrderAction | undefined;
    if (action !== "accept" && action !== "reject" && action !== "advance" && action !== "deliver") {
      return Response.json({ error: "action geçersiz." }, { status: 400 });
    }
    const order = applyOrderAction(id, action, body.code);
    return Response.json({ order });
  } catch (e) {
    return fail(e);
  }
}

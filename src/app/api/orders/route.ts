import { fail, ok } from "@/lib/http/response";
import { requireAuth } from "@/lib/auth/middleware";
import { requireReadyAccount } from "@/lib/auth/routeAccount";
import { parseBody } from "@/lib/validation/parse";
import { createOrderSchema } from "@/lib/validation/order.schema";
import { createOrder, listOrdersFor } from "@/lib/services/orderService";
import { expireStaleRequests } from "@/lib/services/expireOrdersService";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    expireStaleRequests();
    const user = await requireAuth(req);
    const url = new URL(req.url);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 100) || 100));
    const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0) || 0);
    return ok({ orders: listOrdersFor(user, limit, offset) });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireReadyAccount(req);
    const body = await parseBody(req, createOrderSchema);
    const order = createOrder(body, user.id);
    return ok({ order }, 201);
  } catch (e) {
    return fail(e);
  }
}

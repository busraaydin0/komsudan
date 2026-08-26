import { fail, ok } from "@/server/http";
import { requireAuth } from "@/lib/auth/middleware";
import { requireReadyAccount } from "@/server/auth";
import { parseBody } from "@/lib/validation/parse";
import { createOrderSchema } from "@/lib/validation/order.schema";
import { createOrder, listOrdersFor } from "@/lib/services/orderService";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req);
    return ok({ orders: listOrdersFor(user) });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireReadyAccount(req);
    const body = await parseBody(req, createOrderSchema);
    const order = createOrder({ ...body, dropPointId: body.dropPointId ?? null }, user.id);
    return ok({ order }, 201);
  } catch (e) {
    return fail(e);
  }
}

import { listOrders, createOrder } from "@/server/orders";
import { fail } from "@/server/http";
import { requireAccount, requireReadyAccount } from "@/server/auth";
import type { CreateOrderInput } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAccount();
    return Response.json({ orders: listOrders() });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireReadyAccount();
    const body = (await req.json()) as CreateOrderInput;
    const order = createOrder(body, user.id);
    return Response.json({ order }, { status: 201 });
  } catch (e) {
    return fail(e);
  }
}

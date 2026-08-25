import { listOrders, createOrder } from "@/server/orders";
import { fail } from "@/server/http";
import type { CreateOrderInput } from "@/lib/types";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    return Response.json({ orders: listOrders() });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateOrderInput;
    const order = createOrder(body);
    return Response.json({ order }, { status: 201 });
  } catch (e) {
    return fail(e);
  }
}

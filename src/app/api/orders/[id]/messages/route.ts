import { fail, ok } from "@/server/http";
import { requireAuth } from "@/lib/auth/middleware";
import { parseBody } from "@/lib/validation/parse";
import { createMessageSchema } from "@/lib/validation/message.schema";
import { listOrderMessages, sendOrderMessage } from "@/lib/services/messageService";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const user = await requireAuth(req);
    const { id } = await ctx.params;
    return ok(listOrderMessages(user, id));
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    const user = await requireAuth(req);
    const { id } = await ctx.params;
    const body = await parseBody(req, createMessageSchema);
    const result = sendOrderMessage(user, id, body);
    return ok(result, 201);
  } catch (e) {
    return fail(e);
  }
}

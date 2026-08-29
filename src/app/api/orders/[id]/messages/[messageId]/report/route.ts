import { fail, ok } from "@/server/http";
import { requireAuth } from "@/lib/auth/middleware";
import { parseBody } from "@/lib/validation/parse";
import { reportMessageSchema } from "@/lib/validation/message.schema";
import { reportOrderMessage } from "@/lib/services/messageService";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; messageId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    const user = await requireAuth(req);
    const { id, messageId } = await ctx.params;
    const body = await parseBody(req, reportMessageSchema);
    return ok(reportOrderMessage(user, id, messageId, body.reason), 201);
  } catch (e) {
    return fail(e);
  }
}

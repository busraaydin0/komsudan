import { fail, ok } from "@/server/http";
import { requireAuth } from "@/lib/auth/middleware";
import { deleteOrderMessage } from "@/lib/services/messageService";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; messageId: string }> };

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const user = await requireAuth(req);
    const { id, messageId } = await ctx.params;
    return ok(deleteOrderMessage(user, id, messageId));
  } catch (e) {
    return fail(e);
  }
}

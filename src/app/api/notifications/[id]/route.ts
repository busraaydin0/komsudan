import { fail, ok } from "@/server/http";
import { requireAuth } from "@/lib/auth/middleware";
import { parseBody } from "@/lib/validation/parse";
import { notificationReadSchema } from "@/lib/validation/notification.schema";
import { readNotification } from "@/lib/services/notificationService";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const user = await requireAuth(req);
    const { id } = await ctx.params;
    await parseBody(req, notificationReadSchema);
    return ok(readNotification(user, id));
  } catch (e) {
    return fail(e);
  }
}

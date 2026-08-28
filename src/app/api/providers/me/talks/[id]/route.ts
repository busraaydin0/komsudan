import { fail, ok } from "@/server/http";
import { parseBody } from "@/lib/validation/parse";
import { talkPatchSchema } from "@/lib/validation/provider.schema";
import { requireAuth } from "@/lib/auth/middleware";
import { patchMyTalk, removeMyTalk } from "@/lib/services/providerService";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(req, "provider");
    const { id } = await ctx.params;
    const body = await parseBody(req, talkPatchSchema);
    return ok({ talk: patchMyTalk(user, id, body) });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(req, "provider");
    const { id } = await ctx.params;
    return ok(removeMyTalk(user, id));
  } catch (e) {
    return fail(e);
  }
}

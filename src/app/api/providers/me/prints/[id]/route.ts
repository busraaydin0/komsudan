import { fail, ok } from "@/server/http";
import { parseBody } from "@/lib/validation/parse";
import { printPatchSchema } from "@/lib/validation/provider.schema";
import { requireAuth } from "@/lib/auth/middleware";
import { patchMyPrint, removeMyPrint } from "@/lib/services/providerService";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(req, "provider");
    const { id } = await ctx.params;
    const body = await parseBody(req, printPatchSchema);
    return ok({ print: patchMyPrint(user, id, body) });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(req, "provider");
    const { id } = await ctx.params;
    return ok(removeMyPrint(user, id));
  } catch (e) {
    return fail(e);
  }
}

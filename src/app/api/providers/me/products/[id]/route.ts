import { fail, ok } from "@/server/http";
import { requireAuth } from "@/lib/auth/middleware";
import { removeMyProduct } from "@/lib/services/providerService";

export const dynamic = "force-dynamic";

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(req, "provider");
    const { id } = await ctx.params;
    return ok(removeMyProduct(user, id));
  } catch (e) {
    return fail(e);
  }
}

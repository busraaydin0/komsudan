import { fail, ok } from "@/lib/http/response";
import { requireAuth } from "@/lib/auth/middleware";
import { deletePortfolioPhoto, portfolioForUser } from "@/lib/services/photoService";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const user = await requireAuth(req);
    const { id } = await ctx.params;
    deletePortfolioPhoto(user.id, id);
    return ok({ photos: portfolioForUser(user.id) });
  } catch (e) {
    return fail(e);
  }
}

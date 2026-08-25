import { fail, ok } from "@/server/http";
import { requireAuth } from "@/lib/auth/middleware";
import { addPortfolioPhoto, bufferFromUpload, portfolioForUser } from "@/server/photos";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req);
    return ok({ photos: portfolioForUser(user.id) });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth(req);
    const photo = addPortfolioPhoto(user.id, await bufferFromUpload(req));
    return ok({ photo, photos: portfolioForUser(user.id) }, 201);
  } catch (e) {
    return fail(e);
  }
}

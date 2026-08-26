import { fail, ok } from "@/server/http";
import { requireAuth } from "@/lib/auth/middleware";
import { addOrderPhoto, listOrderPhotosFor } from "@/lib/services/orderService";
import { parsePhotoUpload } from "@/server/photos";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const user = await requireAuth(req);
    const { id } = await ctx.params;
    return ok({ photos: listOrderPhotosFor(user, id) });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    const user = await requireAuth(req);
    const { id } = await ctx.params;
    const { buf, kind } = await parsePhotoUpload(req);
    const photo = addOrderPhoto(user, id, buf, kind);
    return ok({ photo }, 201);
  } catch (e) {
    return fail(e);
  }
}

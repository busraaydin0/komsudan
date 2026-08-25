import { fail } from "@/server/http";
import { requireAccount } from "@/server/auth";
import { addPortfolioPhoto, bufferFromUpload, workPhotosForProvider } from "@/server/photos";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    return Response.json({ photos: workPhotosForProvider(id, 16) });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    await requireAccount();
    const { id } = await ctx.params;
    const photo = addPortfolioPhoto(id, await bufferFromUpload(req));
    return Response.json({ photo, photos: workPhotosForProvider(id, 16) }, { status: 201 });
  } catch (e) {
    return fail(e);
  }
}

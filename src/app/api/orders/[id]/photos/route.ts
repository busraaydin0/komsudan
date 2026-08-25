import { fail } from "@/server/http";
import { requireAccount } from "@/server/auth";
import { addPhoto, bufferFromUpload } from "@/server/photos";
import { getOrder } from "@/server/orders";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    await requireAccount();
    const { id } = await ctx.params;
    const photo = addPhoto(id, await bufferFromUpload(req));
    return Response.json({ photo, order: getOrder(id) }, { status: 201 });
  } catch (e) {
    return fail(e);
  }
}

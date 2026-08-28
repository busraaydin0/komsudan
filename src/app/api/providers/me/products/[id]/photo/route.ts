import { fail, ok } from "@/server/http";
import { requireAuth } from "@/lib/auth/middleware";
import { requireProvider } from "@/lib/services/providerService";
import { getProduct, toPublicProduct } from "@/lib/db/products";
import { bufferFromUpload, setProductPhoto } from "@/server/photos";
import { ApiError } from "@/server/rules";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(req, "provider");
    requireProvider(user);
    const { id } = await ctx.params;
    const row = getProduct(id);
    if (!row || row.provider_id !== user.id) {
      throw new ApiError(404, "Ürün bulunamadı.", "NOT_FOUND");
    }
    const photoUrl = setProductPhoto(user.id, id, await bufferFromUpload(req));
    return ok({ photoUrl, product: toPublicProduct(getProduct(id)!) }, 201);
  } catch (e) {
    return fail(e);
  }
}

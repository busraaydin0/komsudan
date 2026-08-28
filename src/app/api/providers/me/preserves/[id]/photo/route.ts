import { fail, ok } from "@/server/http";
import { requireAuth } from "@/lib/auth/middleware";
import { requireProvider } from "@/lib/services/providerService";
import { getPreserve, toPublicPreserve } from "@/lib/db/preserves";
import { bufferFromUpload, setPreservePhoto } from "@/server/photos";
import { ApiError } from "@/server/rules";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(req, "provider");
    requireProvider(user);
    const { id } = await ctx.params;
    const row = getPreserve(id);
    if (!row || row.provider_id !== user.id) {
      throw new ApiError(404, "Hizmet bulunamadı.", "NOT_FOUND");
    }
    const photoUrl = setPreservePhoto(user.id, id, await bufferFromUpload(req));
    return ok({ photoUrl, preserve: toPublicPreserve(getPreserve(id)!) }, 201);
  } catch (e) {
    return fail(e);
  }
}

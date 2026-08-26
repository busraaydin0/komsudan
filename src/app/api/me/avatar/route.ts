import { fail, ok } from "@/server/http";
import { requireAuth } from "@/lib/auth/middleware";
import { bufferFromUpload, setAvatarPhoto } from "@/server/photos";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await requireAuth(req);
    const avatarUrl = setAvatarPhoto(user.id, await bufferFromUpload(req));
    return ok({ avatarUrl }, 201);
  } catch (e) {
    return fail(e);
  }
}

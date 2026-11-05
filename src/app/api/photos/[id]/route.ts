import { fail } from "@/lib/http/response";
import { readPhoto } from "@/lib/services/photoService";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const photo = readPhoto(id);
    if (!photo) return new Response("Yok", { status: 404 });
    return new Response(new Uint8Array(photo.buf), {
      headers: {
        "Content-Type": photo.mime,
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (e) {
    return fail(e);
  }
}

import { fail, ok } from "@/server/http";
import { getProviderPublic } from "@/lib/services/providerService";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    return ok({ provider: getProviderPublic(id) });
  } catch (e) {
    return fail(e);
  }
}

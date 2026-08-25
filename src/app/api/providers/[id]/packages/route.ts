import { fail, ok } from "@/server/http";
import { listProviderPackages } from "@/lib/services/providerService";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    return ok({ packages: listProviderPackages(id) });
  } catch (e) {
    return fail(e);
  }
}

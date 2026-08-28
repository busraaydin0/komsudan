import { fail, ok } from "@/server/http";
import { parseBody } from "@/lib/validation/parse";
import { serviceOfferSchema } from "@/lib/validation/provider.schema";
import { requireAuth } from "@/lib/auth/middleware";
import { ensureServiceOffer } from "@/lib/services/providerService";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await requireAuth(req);
    const body = await parseBody(req, serviceOfferSchema);
    return ok({ provider: ensureServiceOffer(user, body) }, 201);
  } catch (e) {
    return fail(e);
  }
}

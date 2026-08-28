import { fail, ok } from "@/server/http";
import { parseBody } from "@/lib/validation/parse";
import { laundryOfferSchema } from "@/lib/validation/provider.schema";
import { requireAuth } from "@/lib/auth/middleware";
import { ensureLaundryOffer } from "@/lib/services/providerService";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await requireAuth(req);
    const body = await parseBody(req, laundryOfferSchema);
    return ok({ provider: ensureLaundryOffer(user, body) }, 201);
  } catch (e) {
    return fail(e);
  }
}

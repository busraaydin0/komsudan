import { fail, ok } from "@/server/http";
import { parseBody } from "@/lib/validation/parse";
import { preserveCreateSchema } from "@/lib/validation/provider.schema";
import { requireAuth } from "@/lib/auth/middleware";
import { addMyPreserve, listMyPreserves } from "@/lib/services/providerService";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req, "provider");
    return ok({ preserves: listMyPreserves(user) });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth(req, "provider");
    const body = await parseBody(req, preserveCreateSchema);
    return ok({ preserve: addMyPreserve(user, body) }, 201);
  } catch (e) {
    return fail(e);
  }
}

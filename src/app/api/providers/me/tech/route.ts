import { fail, ok } from "@/server/http";
import { parseBody } from "@/lib/validation/parse";
import { techCreateSchema } from "@/lib/validation/provider.schema";
import { requireAuth } from "@/lib/auth/middleware";
import { addMyTech, listMyTechs } from "@/lib/services/providerService";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req, "provider");
    return ok({ techs: listMyTechs(user) });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth(req, "provider");
    const body = await parseBody(req, techCreateSchema);
    return ok({ tech: addMyTech(user, body) }, 201);
  } catch (e) {
    return fail(e);
  }
}

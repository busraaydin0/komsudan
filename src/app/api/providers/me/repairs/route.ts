import { fail, ok } from "@/server/http";
import { parseBody } from "@/lib/validation/parse";
import { repairCreateSchema } from "@/lib/validation/provider.schema";
import { requireAuth } from "@/lib/auth/middleware";
import { addMyRepair, listMyRepairs } from "@/lib/services/providerService";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req, "provider");
    return ok({ repairs: listMyRepairs(user) });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth(req, "provider");
    const body = await parseBody(req, repairCreateSchema);
    return ok({ repair: addMyRepair(user, body) }, 201);
  } catch (e) {
    return fail(e);
  }
}

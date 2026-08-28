import { fail, ok } from "@/server/http";
import { parseBody } from "@/lib/validation/parse";
import { washCreateSchema } from "@/lib/validation/provider.schema";
import { requireAuth } from "@/lib/auth/middleware";
import { addMyWash, listMyWashes } from "@/lib/services/providerService";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req, "provider");
    return ok({ washes: listMyWashes(user) });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth(req, "provider");
    const body = await parseBody(req, washCreateSchema);
    return ok({ wash: addMyWash(user, body) }, 201);
  } catch (e) {
    return fail(e);
  }
}

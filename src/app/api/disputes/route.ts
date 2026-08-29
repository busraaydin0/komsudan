import { fail, ok } from "@/server/http";
import { requireAuth } from "@/lib/auth/middleware";
import { listMyDisputes } from "@/lib/services/disputeService";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req);
    return ok({ disputes: listMyDisputes(user) });
  } catch (e) {
    return fail(e);
  }
}

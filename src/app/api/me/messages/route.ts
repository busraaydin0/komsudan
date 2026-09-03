import { fail, ok } from "@/server/http";
import { requireAuth } from "@/lib/auth/middleware";
import { listMessageInbox } from "@/lib/services/messageService";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req);
    return ok(listMessageInbox(user));
  } catch (e) {
    return fail(e);
  }
}

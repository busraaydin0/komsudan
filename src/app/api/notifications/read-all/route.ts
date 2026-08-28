import { fail, ok } from "@/server/http";
import { requireAuth } from "@/lib/auth/middleware";
import { readAllNotifications } from "@/lib/services/notificationService";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await requireAuth(req);
    return ok(readAllNotifications(user));
  } catch (e) {
    return fail(e);
  }
}

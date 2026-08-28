import { fail, ok } from "@/server/http";
import { requireAuth } from "@/lib/auth/middleware";
import { listMyNotifications } from "@/lib/services/notificationService";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req);
    const url = new URL(req.url);
    const unreadOnly = url.searchParams.get("unread") === "1" || url.searchParams.get("unread") === "true";
    return ok(listMyNotifications(user, unreadOnly));
  } catch (e) {
    return fail(e);
  }
}

import { fail } from "@/lib/http/response";
import { logout, readSession } from "@/lib/auth/routeAccount";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const account = await readSession();
    if (!account) return Response.json({ account: null });
    return Response.json({ account });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE() {
  try {
    await logout();
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}

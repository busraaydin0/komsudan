import { fail } from "@/server/http";
import { deliveredCount, logout, readSession } from "@/server/auth";
import { loyaltyFromDelivered } from "@/lib/loyalty";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const account = await readSession();
    if (!account) return Response.json({ account: null, loyalty: null });
    return Response.json({
      account,
      loyalty: loyaltyFromDelivered(deliveredCount(account.id)),
    });
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

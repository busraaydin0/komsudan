import { fail } from "@/server/http";
import { deliveredCount, updateProfile, verifyIdentity } from "@/server/auth";
import { loyaltyFromDelivered } from "@/lib/loyalty";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  try {
    const body = (await req.json()) as { name?: string; identity?: boolean };
    const account = body.identity
      ? await verifyIdentity(body.name ?? "")
      : await updateProfile(body.name ?? "");
    return Response.json({
      account,
      loyalty: loyaltyFromDelivered(deliveredCount(account.id)),
    });
  } catch (e) {
    return fail(e);
  }
}

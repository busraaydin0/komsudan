import { fail } from "@/lib/http/response";
import { updateProfile, verifyIdentity } from "@/lib/auth/routeAccount";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  try {
    const body = (await req.json()) as { name?: string; identity?: boolean };
    const account = body.identity
      ? await verifyIdentity(body.name ?? "")
      : await updateProfile(body.name ?? "");
    return Response.json({ account });
  } catch (e) {
    return fail(e);
  }
}

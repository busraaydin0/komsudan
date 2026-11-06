import { PILOT_AREA } from "@/lib/laundry/pilot";
import { getAuth } from "@/lib/auth/middleware";
import { providersLive } from "@/lib/services/catalogService";
import { fail } from "@/lib/http/response";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await getAuth(req);
    return Response.json({
      providers: providersLive(user?.id),
      pilot: PILOT_AREA,
    });
  } catch (e) {
    return fail(e);
  }
}

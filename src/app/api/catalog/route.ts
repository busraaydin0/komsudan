import { PILOT } from "@/lib/data";
import { listDrops, providersLive } from "@/server/catalog";
import { fail } from "@/server/http";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    return Response.json({
      providers: providersLive(),
      dropPoints: listDrops(),
      pilot: PILOT,
    });
  } catch (e) {
    return fail(e);
  }
}

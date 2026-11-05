import { PILOT_AREA } from "@/lib/laundry/pilot";
import { providersLive } from "@/lib/services/catalogService";
import { fail } from "@/lib/http/response";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    return Response.json({
      providers: providersLive(),
      pilot: PILOT_AREA,
    });
  } catch (e) {
    return fail(e);
  }
}

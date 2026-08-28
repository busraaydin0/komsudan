import type { NextRequest } from "next/server";
import { fail, ok } from "@/server/http";
import { parseValue } from "@/lib/validation/parse";
import { nearbyQuerySchema } from "@/lib/validation/provider.schema";
import { parseCategoryIds } from "@/lib/validation/category.schema";
import { listNearby } from "@/lib/services/providerService";

export const dynamic = "force-dynamic";

function nearbyQuery(req: NextRequest) {
  const latRaw = req.nextUrl.searchParams.get("lat");
  const lngRaw = req.nextUrl.searchParams.get("lng");
  const radiusRaw = req.nextUrl.searchParams.get("radius");
  const parsed = parseValue(
    {
      lat: latRaw == null || latRaw === "" ? undefined : Number(latRaw),
      lng: lngRaw == null || lngRaw === "" ? undefined : Number(lngRaw),
      radius: radiusRaw == null || radiusRaw === "" ? undefined : Number(radiusRaw),
      category_id: req.nextUrl.searchParams.get("category_id") ?? undefined,
    },
    nearbyQuerySchema,
  );
  return {
    lat: parsed.lat,
    lng: parsed.lng,
    radius: parsed.radius,
    categoryIds: parseCategoryIds(parsed.category_id),
  };
}

export function GET(req: NextRequest) {
  try {
    return ok({ providers: listNearby(nearbyQuery(req)) });
  } catch (e) {
    return fail(e);
  }
}

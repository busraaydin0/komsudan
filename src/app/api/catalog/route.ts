import type { NextRequest } from "next/server";
import { PILOT } from "@/lib/data";
import { listDrops, providersLive } from "@/server/catalog";
import { fail } from "@/server/http";
import { parseCategoryIds } from "@/lib/validation/category.schema";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  try {
    const ids = parseCategoryIds(req.nextUrl.searchParams.get("category_id"));
    return Response.json({
      providers: providersLive(ids),
      dropPoints: listDrops(),
      pilot: PILOT,
    });
  } catch (e) {
    return fail(e);
  }
}

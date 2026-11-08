import { fail, ok } from "@/lib/http/response";
import { buildProviderCalendarDays } from "@/lib/services/calendarService";
import { expireStaleRequests } from "@/lib/services/expireOrdersService";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    expireStaleRequests();
    const { id } = await ctx.params;
    const url = new URL(req.url);
    const express = url.searchParams.get("express") === "1" || url.searchParams.get("express") === "true";
    const unitsRaw = url.searchParams.get("units");
    const neededUnits = unitsRaw && /^\d+$/.test(unitsRaw) ? Number(unitsRaw) : undefined;
    const days = buildProviderCalendarDays(id, new Date(), express, neededUnits);
    const windows = days.flatMap((d) => d.windows);
    return ok({ days, windows });
  } catch (e) {
    return fail(e);
  }
}

import { fail, ok } from "@/lib/http/response";
import { buildProviderCalendar } from "@/lib/services/calendarService";
import { expireStaleRequests } from "@/lib/services/expireOrdersService";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    expireStaleRequests();
    const { id } = await ctx.params;
    const express =
      new URL(req.url).searchParams.get("express") === "1" ||
      new URL(req.url).searchParams.get("express") === "true";
    const windows = buildProviderCalendar(id, new Date(), express);
    const days = [...new Set(windows.map((w) => w.date))].map((date) => ({
      date,
      windows: windows.filter((w) => w.date === date),
    }));
    return ok({ days, windows });
  } catch (e) {
    return fail(e);
  }
}

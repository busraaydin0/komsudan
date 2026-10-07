import { fail, ok } from "@/server/http";
import { buildProviderCalendar } from "@/lib/services/calendarService";
import { expireStaleRequests } from "@/lib/services/expireOrdersService";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    expireStaleRequests();
    const { id } = await ctx.params;
    const windows = buildProviderCalendar(id);
    const days = [...new Set(windows.map((w) => w.date))].map((date) => ({
      date,
      windows: windows.filter((w) => w.date === date),
    }));
    return ok({ days, windows });
  } catch (e) {
    return fail(e);
  }
}

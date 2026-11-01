import { fail, ok } from "@/lib/http/response";
import { requireStaffAdmin } from "@/lib/auth/staff";
import { parseValue } from "@/lib/validation/parse";
import { adminMonthQuerySchema } from "@/lib/validation/admin.schema";
import { getPilotKpi } from "@/lib/services/adminService";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await requireStaffAdmin(req);
    const url = new URL(req.url);
    const query = parseValue({ month: url.searchParams.get("month") ?? undefined }, adminMonthQuerySchema);
    return ok({ kpi: getPilotKpi(user, query.month) });
  } catch (e) {
    return fail(e);
  }
}

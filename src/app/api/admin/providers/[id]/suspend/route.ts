import { fail, ok } from "@/lib/http/response";
import { requireStaffAdmin } from "@/lib/auth/staff";
import { parseBody } from "@/lib/validation/parse";
import { suspendProviderSchema } from "@/lib/validation/admin.schema";
import { setProviderSuspend } from "@/lib/services/adminService";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireStaffAdmin(req);
    const { id } = await ctx.params;
    const body = await parseBody(req, suspendProviderSchema);
    return ok(setProviderSuspend(user, id, body));
  } catch (e) {
    return fail(e);
  }
}

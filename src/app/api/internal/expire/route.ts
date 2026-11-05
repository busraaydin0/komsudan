import { fail, ok } from "@/lib/http/response";
import { expireStaleRequests, validateInternalExpireKey } from "@/lib/services/expireOrdersService";
import { ApiError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    if (!validateInternalExpireKey(req)) {
      throw new ApiError(401, "Yetkisiz.", "UNAUTHORIZED");
    }
    const expired = expireStaleRequests();
    return ok({ expired });
  } catch (e) {
    return fail(e);
  }
}

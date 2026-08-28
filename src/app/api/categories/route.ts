import { fail, ok } from "@/server/http";
import { listCategoriesPublic } from "@/lib/services/preferenceService";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    return ok({ categories: listCategoriesPublic() });
  } catch (e) {
    return fail(e);
  }
}

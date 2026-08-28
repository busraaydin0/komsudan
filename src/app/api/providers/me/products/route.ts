import { fail, ok } from "@/server/http";
import { parseBody } from "@/lib/validation/parse";
import { productCreateSchema } from "@/lib/validation/provider.schema";
import { requireAuth } from "@/lib/auth/middleware";
import { addMyProduct } from "@/lib/services/providerService";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await requireAuth(req, "provider");
    const body = await parseBody(req, productCreateSchema);
    return ok({ product: addMyProduct(user, body) }, 201);
  } catch (e) {
    return fail(e);
  }
}

import { fail, ok } from "@/lib/http/response";
import { parseBody } from "@/lib/validation/parse";
import { requireAuth } from "@/lib/auth/middleware";
import { getMyCapacitySettings, saveMyCapacitySettings } from "@/lib/services/providerCapacityService";
import { z } from "zod";
import { MAX_UNITS_PER_ORDER } from "@/lib/laundryModel";

export const dynamic = "force-dynamic";

const capacitySchema = z.object({
  halfUnitsPerDay: z.number().int().min(2).max(24),
  workingDays: z.array(z.number().int().min(1).max(7)).min(1),
  maxUnitsPerOrder: z.number().int().min(1).max(MAX_UNITS_PER_ORDER),
});

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req, "provider");
    return ok({ capacity: getMyCapacitySettings(user) });
  } catch (e) {
    return fail(e);
  }
}

export async function PUT(req: Request) {
  try {
    const user = await requireAuth(req, "provider");
    const body = await parseBody(req, capacitySchema);
    return ok({ capacity: saveMyCapacitySettings(user, body) });
  } catch (e) {
    return fail(e);
  }
}

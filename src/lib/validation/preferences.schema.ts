import { z } from "zod";

export const preferencesPatchSchema = z.object({
  intent: z.enum(["seek", "offer", "both"]).nullable().optional(),
  categoryIds: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  homeLat: z.number().min(-90).max(90).nullable().optional(),
  homeLng: z.number().min(-180).max(180).nullable().optional(),
  homeNeighborhood: z.string().trim().max(80).nullable().optional(),
  completed: z.boolean().optional(),
  skipped: z.boolean().optional(),
});

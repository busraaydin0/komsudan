import { z } from "zod";

export const createDisputeSchema = z.object({
  reason: z
    .string({ error: "Gerekçe gerekli." })
    .trim()
    .min(8, "Gerekçe en az birkaç cümle olsun.")
    .max(500, "Gerekçe en fazla 500 karakter."),
});

export const patchDisputeSchema = z.object({
  status: z.literal("resolved", { error: "Yalnızca resolved yazılabilir." }),
});

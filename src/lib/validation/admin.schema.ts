import { z } from "zod";

export const adminMonthQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Ay YYYY-MM olmalı.")
    .optional(),
});

export const suspendProviderSchema = z.object({
  suspended: z.boolean(),
  reason: z.string().trim().min(1, "Neden zorunlu.").max(500, "Neden en fazla 500 karakter."),
});

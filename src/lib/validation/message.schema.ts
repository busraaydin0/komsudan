import { z } from "zod";

export const createMessageSchema = z.object({
  body: z.string({ error: "Mesaj gerekli." }),
  clientMessageId: z.string().trim().min(8).max(80).optional(),
});

export const reportMessageSchema = z.object({
  reason: z
    .string({ error: "Gerekçe gerekli." })
    .trim()
    .min(4, "Gerekçe biraz daha açık olsun.")
    .max(200, "Gerekçe en fazla 200 karakter."),
});

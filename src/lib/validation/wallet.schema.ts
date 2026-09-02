import { z } from "zod";
import { TOPUP_METHODS } from "@/lib/walletMethods";

const methodIds = TOPUP_METHODS.map((m) => m.id) as [string, ...string[]];

export const walletTopupSchema = z.object({
  method: z.enum(methodIds, { error: "Yükleme yöntemi seç." }),
  amount: z
    .number({ error: "Tutar gerekli." })
    .int("Tam lira yaz.")
    .min(50, "En az 50 ₺ yüklenebilir.")
    .max(10000, "Tek seferde en fazla 10.000 ₺."),
});

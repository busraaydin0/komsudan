import { z } from "zod";
import { PAYOUT_METHODS, TOPUP_METHODS } from "@/lib/walletMethods";

const methodIds = TOPUP_METHODS.map((m) => m.id) as [string, ...string[]];
const payoutMethodIds = PAYOUT_METHODS.map((m) => m.id) as [string, ...string[]];

export const walletTopupSchema = z.object({
  method: z.enum(methodIds, { error: "Yükleme yöntemi seç." }),
  amount: z
    .number({ error: "Tutar gerekli." })
    .int("Tam lira yaz.")
    .min(50, "En az 50 ₺ yüklenebilir.")
    .max(10000, "Tek seferde en fazla 10.000 ₺."),
});

export const walletPayoutSchema = z.object({
  method: z.enum(payoutMethodIds, { error: "Çekim yöntemi seç." }),
  amount: z
    .number({ error: "Tutar gerekli." })
    .int("Tam lira yaz.")
    .min(1, "En az 1 ₺ çekilebilir.")
    .max(100000, "Tek seferde en fazla 100.000 ₺."),
});

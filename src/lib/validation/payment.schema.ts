import { z } from "zod";

export const paymentWebhookSchema = z.object({
  event: z.string().min(1, "Olay adı gerekli."),
  providerReference: z.string().min(4).optional(),
});

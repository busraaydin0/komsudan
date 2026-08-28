import { z } from "zod";

export const notificationReadSchema = z.object({
  read: z.literal(true),
});

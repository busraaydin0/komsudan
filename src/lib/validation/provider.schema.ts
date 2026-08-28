import { z } from "zod";

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Saat HH:mm olmalı.");

export const nearbyQuerySchema = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  radius: z.number().positive().max(50).optional(),
  category_id: z.string().trim().max(400).optional(),
});

export const profilePatchSchema = z.object({
  bio: z.string().max(500).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  neighborhood: z.string().max(80).optional(),
  hasDryer: z.boolean().optional(),
  status: z.enum(["active", "paused"]).optional(),
  categoryId: z.string().trim().min(1).max(80).optional(),
});

export const slotCreateSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: hhmm,
  endTime: hhmm,
  deliveryMode: z.enum(["door", "point", "both"]),
});

export const dropCreateSchema = z.object({
  label: z.string().trim().min(2).max(80),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

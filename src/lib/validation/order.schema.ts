import { z } from "zod";
import { LAUNDRY_SIZES } from "@/lib/laundryModel";

const addonSchema = z.object({
  addon: z.enum(["yorgan", "battaniye"]),
  variant: z.enum(["tek", "cift"]),
  qty: z.number().int().min(0).max(8),
});

export const createOrderSchema = z.object({
  providerId: z.string().min(1, "Hizmet veren gerekli."),
  packageId: z.enum(["yikama", "katlama", "tam"]).optional(),
  size: z.enum(LAUNDRY_SIZES),
  addons: z.array(addonSchema).optional().default([]),
  drop: z.literal("kapi").optional().default("kapi"),
  pickup: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    windowStart: z.string().regex(/^\d{2}:\d{2}$/),
    windowEnd: z.string().regex(/^\d{2}:\d{2}$/),
  }),
  delivery: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    windowStart: z.string().regex(/^\d{2}:\d{2}$/),
    windowEnd: z.string().regex(/^\d{2}:\d{2}$/),
  }),
  note: z.string().max(500).optional().default(""),
});

export const patchOrderSchema = z.object({
  action: z.enum(["accept", "reject", "advance", "deliver"]),
  code: z.string().optional(),
});

export const pickupConfirmSchema = z.object({
  confirmedSize: z.enum(LAUNDRY_SIZES),
  addons: z.array(addonSchema).default([]),
  colorGroups: z.number().int().min(1).max(3),
});

export const priceChangeSchema = z.object({
  action: z.enum(["approve", "reject"]),
});

export const deliveryOverrideSchema = z.object({
  photoId: z.string().min(1),
  lat: z.number().optional(),
  lng: z.number().optional(),
  note: z.string().min(3).max(500),
});

export const deliveryOverrideResolveSchema = z.object({
  approve: z.boolean(),
  reason: z.string().min(3).max(500),
});

export const patchStatusSchema = z.object({
  status: z.enum([
    "pending",
    "accepted",
    "dropped_off",
    "washing",
    "ironing",
    "ready",
    "completed",
    "rejected",
    "cancelled",
    "disputed",
  ]),
  code: z.string().optional(),
  note: z.string().max(200).optional(),
});

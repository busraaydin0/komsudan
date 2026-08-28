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
  dryingType: z.enum(["makine", "ip", "ikisi"]).optional(),
  status: z.enum(["active", "paused"]).optional(),
  categoryId: z.string().trim().min(1).max(80).optional(),
  express: z.boolean().optional(),
  drops: z.array(z.enum(["kapi", "nokta"])).min(1).max(2).optional(),
  packages: z
    .array(
      z.object({
        id: z.enum(["yikama", "katlama", "tam"]),
        pricePerPiece: z.number().int().min(1, "Parça fiyatı 1–80 ₺.").max(80, "Parça fiyatı 1–80 ₺."),
      }),
    )
    .min(1, "En az bir paket seç.")
    .max(3)
    .optional(),
});

export const laundryOfferSchema = z.object({
  dryingType: z.enum(["makine", "ip", "ikisi"]),
  packages: z
    .array(
      z.object({
        id: z.enum(["yikama", "katlama", "tam"]),
        pricePerPiece: z.number().int().min(1, "Parça fiyatı 1–80 ₺.").max(80, "Parça fiyatı 1–80 ₺."),
      }),
    )
    .min(1, "En az bir paket seç.")
    .max(3),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  neighborhood: z.string().trim().min(1).max(80),
});

export const slotCreateSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: hhmm,
  endTime: hhmm,
  deliveryMode: z.enum(["door", "point", "both"]),
});

export const productCreateSchema = z.object({
  name: z.string().trim().min(2, "Ürün adı en az 2 karakter.").max(80),
  description: z.string().trim().max(400).optional().nullable(),
  foodCategory: z.enum(["kisir", "pasta", "kurabiye", "borek", "salata", "tatli", "diger"]).optional().nullable(),
  pricePerPerson: z
    .number({ error: "Fiyat gerekli." })
    .int()
    .min(1, "Fiyat 1–5000 ₺.")
    .max(5000, "Fiyat 1–5000 ₺."),
  priceUnit: z.enum(["porsiyon", "kg", "adet", "tepsi", "kisi"]).optional(),
  minOrder: z.number().int().min(1).max(80).optional(),
  maxQty: z.number().int().min(1).max(80).optional().nullable(),
  leadHours: z.number().int().min(0).max(168).optional().nullable(),
  delivery: z.enum(["kapi", "nokta", "ikisi"]).optional(),
  allergens: z.string().trim().max(400).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const productPatchSchema = productCreateSchema;

export const dropCreateSchema = z.object({
  label: z.string().trim().min(2).max(80),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

import { z } from "zod";
import { CATEGORY_ID_ENUM } from "@/lib/categories/registry";

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

export const serviceOfferSchema = z
  .object({
    categoryId: z.enum(CATEGORY_ID_ENUM).default("camasir"),
    dryingType: z.enum(["makine", "ip", "ikisi"]).optional(),
    packages: laundryOfferSchema.shape.packages.optional(),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    neighborhood: z.string().trim().min(1).max(80),
  })
  .superRefine((val, ctx) => {
    if (val.categoryId !== "camasir") return;
    if (!val.dryingType) {
      ctx.addIssue({ code: "custom", message: "Kurutma tipini seç.", path: ["dryingType"] });
    }
    if (!val.packages?.length) {
      ctx.addIssue({ code: "custom", message: "En az bir paket seç.", path: ["packages"] });
    }
  });

export const slotCreateSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: hhmm,
  endTime: hhmm,
  deliveryMode: z.enum(["door", "point", "both"]),
});

const washIncludesSchema = z.object({
  dis: z.boolean(),
  supurme: z.boolean(),
  cam: z.boolean(),
  torpido: z.boolean(),
  jant: z.boolean(),
  kurulama: z.boolean(),
});

export const washCreateSchema = z
  .object({
    name: z.string().trim().min(2, "Hizmet adı en az 2 karakter.").max(80),
    description: z.string().trim().max(400).optional().nullable(),
    job: z.enum(["dis", "ic", "icdis"]).optional(),
    vehicle: z.enum(["otomobil", "suv", "ticari", "diger"]).optional(),
    price: z.number({ error: "Fiyat gerekli." }).int().min(1, "Fiyat 1–50.000 ₺.").max(50_000, "Fiyat 1–50.000 ₺."),
    includes: washIncludesSchema.optional(),
    durationMin: z.number().int().min(0).max(480).optional().nullable(),
    maxPerDay: z.number().int().min(1).max(80).optional().nullable(),
    booking: z.enum(["randevu", "musait"]).optional(),
    location: z.string().trim().max(120).optional().nullable(),
    workHours: z.string().trim().max(80).optional().nullable(),
    materials: z.enum(["provider", "customer"]).optional(),
    notes: z.string().trim().max(400).optional().nullable(),
    isActive: z.boolean().optional(),
  })
  .superRefine((val, ctx) => {
    if (!val.includes) return;
    const i = val.includes;
    if (!i.dis && !i.supurme && !i.cam && !i.torpido && !i.jant && !i.kurulama) {
      ctx.addIssue({ code: "custom", message: "En az bir dahil kalem seç.", path: ["includes"] });
    }
  });

export const washPatchSchema = washCreateSchema;

export const dropCreateSchema = z.object({
  label: z.string().trim().min(2).max(80),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

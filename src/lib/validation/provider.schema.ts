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

export const serviceOfferSchema = z
  .object({
    categoryId: z.enum(["camasir", "davet", "dikis", "tamir", "teknoloji", "araba"]).default("camasir"),
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

const sewingDeliverySchema = z.object({
  adres: z.boolean(),
  nokta: z.boolean(),
  yakin: z.boolean(),
});

export const serviceCreateSchema = z
  .object({
    name: z.string().trim().min(2, "Hizmet adı en az 2 karakter.").max(80),
    description: z.string().trim().max(400).optional().nullable(),
    subcategory: z.enum(["kiyafet", "tamir", "ozel", "tekstil", "diger"]).optional(),
    price: z
      .number({ error: "Fiyat gerekli." })
      .int()
      .min(1, "Fiyat 1–50.000 ₺.")
      .max(50_000, "Fiyat 1–50.000 ₺."),
    priceUnit: z.enum(["adet", "cift", "metre", "kg", "parca", "saat", "proje"]).optional(),
    minOrder: z.number().int().min(1).max(80).optional(),
    leadDays: z.number().int().min(0).max(30).optional().nullable(),
    maxPerWeek: z.number().int().min(1).max(80).optional().nullable(),
    delivery: sewingDeliverySchema.optional(),
    workRadiusKm: z.number().int().min(1).max(50).optional().nullable(),
    notes: z.string().trim().max(400).optional().nullable(),
    material: z.enum(["customer", "provider", "either"]).optional(),
    isActive: z.boolean().optional(),
  })
  .superRefine((val, ctx) => {
    if (!val.delivery) return;
    if (!val.delivery.adres && !val.delivery.nokta && !val.delivery.yakin) {
      ctx.addIssue({ code: "custom", message: "En az bir teslim yöntemi seç.", path: ["delivery"] });
    }
    if (val.maxPerWeek != null && val.minOrder != null && val.maxPerWeek < val.minOrder) {
      ctx.addIssue({
        code: "custom",
        message: "Haftalık kapasite, minimum siparişten küçük olamaz.",
        path: ["maxPerWeek"],
      });
    }
  });

export const servicePatchSchema = serviceCreateSchema;

export const repairCreateSchema = z
  .object({
    name: z.string().trim().min(2, "Hizmet adı en az 2 karakter.").max(80),
    description: z.string().trim().max(400).optional().nullable(),
    kind: z.enum(["elektronik", "ev", "mobilya", "bisiklet", "oyuncak", "aksesuar", "diger"]).optional(),
    item: z.string().trim().max(80).optional().nullable(),
    job: z.enum(["onarim", "parca", "montaj", "bakim", "temizlik", "diger"]).optional(),
    price: z.number({ error: "Fiyat gerekli." }).int().min(0).max(50_000, "Fiyat 0–50.000 ₺."),
    priceType: z.enum(["sabit", "baslangic", "inceleme"]).optional(),
    priceUnit: z.enum(["adet", "parca", "urun", "saat", "is"]).optional(),
    parts: z.enum(["included", "extra", "customer", "either"]).optional(),
    leadDays: z.number().int().min(0).max(30).optional().nullable(),
    maxPerWeek: z.number().int().min(1).max(80).optional().nullable(),
    delivery: sewingDeliverySchema.optional(),
    workRadiusKm: z.number().int().min(1).max(50).optional().nullable(),
    inspectRequired: z.boolean().optional(),
    quoteFrom: z.enum(["photo", "seen"]).optional(),
    warrantyDays: z.number().int().min(0).max(365).optional().nullable(),
    notes: z.string().trim().max(400).optional().nullable(),
    workHours: z.string().trim().max(80).optional().nullable(),
    isActive: z.boolean().optional(),
  })
  .superRefine((val, ctx) => {
    const type = val.priceType ?? "sabit";
    if (type !== "inceleme" && val.price < 1) {
      ctx.addIssue({ code: "custom", message: "Sabit veya başlangıç fiyatı 1 ₺ ve üzeri olsun.", path: ["price"] });
    }
    if (val.delivery && !val.delivery.adres && !val.delivery.nokta && !val.delivery.yakin) {
      ctx.addIssue({ code: "custom", message: "En az bir teslim yöntemi seç.", path: ["delivery"] });
    }
  });

export const repairPatchSchema = repairCreateSchema;

const techDeliverySchema = z.object({
  adres: z.boolean(),
  nokta: z.boolean(),
  yakin: z.boolean(),
  yerinde: z.boolean(),
});

export const techCreateSchema = z
  .object({
    name: z.string().trim().min(2, "Hizmet adı en az 2 karakter.").max(80),
    description: z.string().trim().max(400).optional().nullable(),
    kind: z.enum(["bilgisayar", "telefon", "yazici", "konsol", "tv", "ag", "diger"]).optional(),
    item: z.string().trim().max(80).optional().nullable(),
    job: z.enum(["kurulum", "format", "yazilim", "veri", "bakim", "parca", "sorun", "diger"]).optional(),
    price: z.number({ error: "Fiyat gerekli." }).int().min(0).max(50_000, "Fiyat 0–50.000 ₺."),
    priceType: z.enum(["sabit", "baslangic", "inceleme"]).optional(),
    priceUnit: z.enum(["cihaz", "islem", "saat", "paket"]).optional(),
    materials: z.enum(["provider", "customer", "included", "extra", "none"]).optional(),
    leadHours: z.number().int().min(0).max(168).optional().nullable(),
    leadDays: z.number().int().min(0).max(30).optional().nullable(),
    maxPerWeek: z.number().int().min(1).max(80).optional().nullable(),
    delivery: techDeliverySchema.optional(),
    inspectRequired: z.boolean().optional(),
    quoteFromPhoto: z.boolean().optional(),
    platform: z.string().trim().max(80).optional().nullable(),
    warrantyDays: z.number().int().min(0).max(365).optional().nullable(),
    notes: z.string().trim().max(400).optional().nullable(),
    workHours: z.string().trim().max(80).optional().nullable(),
    isActive: z.boolean().optional(),
  })
  .superRefine((val, ctx) => {
    const type = val.priceType ?? "sabit";
    if (type !== "inceleme" && val.price < 1) {
      ctx.addIssue({ code: "custom", message: "Sabit veya başlangıç fiyatı 1 ₺ ve üzeri olsun.", path: ["price"] });
    }
    if (
      val.delivery &&
      !val.delivery.adres &&
      !val.delivery.nokta &&
      !val.delivery.yakin &&
      !val.delivery.yerinde
    ) {
      ctx.addIssue({ code: "custom", message: "En az bir teslim yöntemi seç.", path: ["delivery"] });
    }
  });

export const techPatchSchema = techCreateSchema;

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

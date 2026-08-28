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
    categoryId: z.enum(["camasir", "davet", "dikis", "tamir", "teknoloji", "araba", "kurye", "bahce", "kargo", "cikti"]).default("camasir"),
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

const courierTransportSchema = z.object({
  yaya: z.boolean(),
  bisiklet: z.boolean(),
  ebike: z.boolean(),
  motor: z.boolean(),
});
const courierSizeSchema = z.object({
  kucuk: z.boolean(),
  orta: z.boolean(),
  buyuk: z.boolean(),
});
const courierRouteSchema = z.object({
  adresAdres: z.boolean(),
  noktaAdres: z.boolean(),
  noktaNokta: z.boolean(),
});
const courierCarrySchema = z.object({
  evrak: z.boolean(),
  paket: z.boolean(),
  kiyafet: z.boolean(),
  anahtar: z.boolean(),
  hediye: z.boolean(),
  kisisel: z.boolean(),
  diger: z.boolean(),
});
const courierConfirmSchema = z.object({
  kod: z.boolean(),
  app: z.boolean(),
});

export const courierCreateSchema = z
  .object({
    name: z.string().trim().min(2, "Hizmet adı en az 2 karakter.").max(80),
    description: z.string().trim().max(400).optional().nullable(),
    transport: courierTransportSchema.optional(),
    sizes: courierSizeSchema.optional(),
    maxKm: z.number().int().min(1, "Mesafe 1–50 km.").max(50, "Mesafe 1–50 km.").optional(),
    price: z.number({ error: "Fiyat gerekli." }).int().min(1, "Fiyat 1–50.000 ₺.").max(50_000, "Fiyat 1–50.000 ₺."),
    priceType: z.enum(["sabit", "mesafe"]).optional(),
    durationMin: z.number().int().min(0).max(480).optional().nullable(),
    routes: courierRouteSchema.optional(),
    avail: z.enum(["hemen", "randevu", "saat"]).optional(),
    workHours: z.string().trim().max(80).optional().nullable(),
    region: z.string().trim().max(120).optional().nullable(),
    carry: courierCarrySchema.optional(),
    carryOther: z.string().trim().max(80).optional().nullable(),
    refuse: z.string().trim().max(400).optional().nullable(),
    confirm: courierConfirmSchema.optional(),
    notes: z.string().trim().max(400).optional().nullable(),
    isActive: z.boolean().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.transport && !val.transport.yaya && !val.transport.bisiklet && !val.transport.ebike && !val.transport.motor) {
      ctx.addIssue({ code: "custom", message: "En az bir ulaşım türü seç.", path: ["transport"] });
    }
    if (val.sizes && !val.sizes.kucuk && !val.sizes.orta && !val.sizes.buyuk) {
      ctx.addIssue({ code: "custom", message: "En az bir paket boyutu seç.", path: ["sizes"] });
    }
    if (val.routes && !val.routes.adresAdres && !val.routes.noktaAdres && !val.routes.noktaNokta) {
      ctx.addIssue({ code: "custom", message: "En az bir teslimat şekli seç.", path: ["routes"] });
    }
    if (
      val.carry &&
      !val.carry.evrak &&
      !val.carry.paket &&
      !val.carry.kiyafet &&
      !val.carry.anahtar &&
      !val.carry.hediye &&
      !val.carry.kisisel &&
      !val.carry.diger
    ) {
      ctx.addIssue({ code: "custom", message: "En az bir taşınabilir paket türü seç.", path: ["carry"] });
    }
    if (val.carry?.diger && !val.carryOther?.trim()) {
      ctx.addIssue({ code: "custom", message: "Diğer paket türünü yaz.", path: ["carryOther"] });
    }
    if (val.confirm && !val.confirm.kod && !val.confirm.app) {
      ctx.addIssue({ code: "custom", message: "En az bir teslim onayı seç.", path: ["confirm"] });
    }
  });

export const courierPatchSchema = courierCreateSchema;

const gardenJobsSchema = z.object({
  cim: z.boolean(),
  budama: z.boolean(),
  ot: z.boolean(),
  yaprak: z.boolean(),
  dikim: z.boolean(),
  saksi: z.boolean(),
  tasima: z.boolean(),
  sulama: z.boolean(),
  duzen: z.boolean(),
  diger: z.boolean(),
});
const gardenAreaSchema = z.object({
  kucuk: z.boolean(),
  orta: z.boolean(),
  buyuk: z.boolean(),
});

export const gardenCreateSchema = z
  .object({
    name: z.string().trim().min(2, "Hizmet adı en az 2 karakter.").max(80),
    description: z.string().trim().max(400).optional().nullable(),
    jobs: gardenJobsSchema.optional(),
    areas: gardenAreaSchema.optional(),
    price: z.number({ error: "Fiyat gerekli." }).int().min(1, "Fiyat 1–50.000 ₺.").max(50_000, "Fiyat 1–50.000 ₺."),
    priceType: z.enum(["sabit", "alan", "durum"]).optional(),
    durationMin: z.number().int().min(0).max(1440).optional().nullable(),
    equipment: z.enum(["provider", "customer", "none"]).optional(),
    location: z.string().trim().max(120).optional().nullable(),
    maxKm: z.number().int().min(1, "Mesafe 1–50 km.").max(50, "Mesafe 1–50 km.").optional(),
    avail: z.enum(["hemen", "randevu", "gun"]).optional(),
    workHours: z.string().trim().max(80).optional().nullable(),
    canDo: z.string().trim().max(400).optional().nullable(),
    cannotDo: z.string().trim().max(400).optional().nullable(),
    notes: z.string().trim().max(400).optional().nullable(),
    isActive: z.boolean().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.jobs) {
      const j = val.jobs;
      if (!j.cim && !j.budama && !j.ot && !j.yaprak && !j.dikim && !j.saksi && !j.tasima && !j.sulama && !j.duzen && !j.diger) {
        ctx.addIssue({ code: "custom", message: "En az bir hizmet türü seç.", path: ["jobs"] });
      }
    }
    if (val.areas && !val.areas.kucuk && !val.areas.orta && !val.areas.buyuk) {
      ctx.addIssue({ code: "custom", message: "En az bir alan / iş boyutu seç.", path: ["areas"] });
    }
  });

export const gardenPatchSchema = gardenCreateSchema;

const cargoJobsSchema = z.object({
  subeAl: z.boolean(),
  subeBirak: z.boolean(),
  noktaNokta: z.boolean(),
  alNokta: z.boolean(),
  teslimSube: z.boolean(),
});
const cargoSizeSchema = z.object({
  kucuk: z.boolean(),
  orta: z.boolean(),
  buyuk: z.boolean(),
});
const cargoPickupSchema = z.object({
  sube: z.boolean(),
  adres: z.boolean(),
  nokta: z.boolean(),
});
const cargoDropSchema = z.object({
  sube: z.boolean(),
  adres: z.boolean(),
  nokta: z.boolean(),
});
const cargoConfirmSchema = z.object({
  kod: z.boolean(),
  app: z.boolean(),
});

export const cargoCreateSchema = z
  .object({
    name: z.string().trim().min(2, "Hizmet adı en az 2 karakter.").max(80),
    jobs: cargoJobsSchema.optional(),
    sizes: cargoSizeSchema.optional(),
    maxKm: z.number().int().min(1, "Bölge 1–50 km.").max(50, "Bölge 1–50 km.").optional(),
    branches: z.string().trim().max(160).optional().nullable(),
    points: z.string().trim().max(400).optional().nullable(),
    price: z.number({ error: "Fiyat gerekli." }).int().min(1, "Fiyat 1–50.000 ₺.").max(50_000, "Fiyat 1–50.000 ₺."),
    priceType: z.enum(["sabit", "mesafe"]).optional(),
    durationMin: z.number().int().min(0).max(480).optional().nullable(),
    avail: z.enum(["hemen", "randevu", "saat"]).optional(),
    workHours: z.string().trim().max(80).optional().nullable(),
    pickup: cargoPickupSchema.optional(),
    dropoff: cargoDropSchema.optional(),
    confirm: cargoConfirmSchema.optional(),
    refuse: z.string().trim().max(400).optional().nullable(),
    notes: z.string().trim().max(400).optional().nullable(),
    isActive: z.boolean().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.jobs && !val.jobs.subeAl && !val.jobs.subeBirak && !val.jobs.noktaNokta && !val.jobs.alNokta && !val.jobs.teslimSube) {
      ctx.addIssue({ code: "custom", message: "En az bir hizmet türü seç.", path: ["jobs"] });
    }
    if (val.sizes && !val.sizes.kucuk && !val.sizes.orta && !val.sizes.buyuk) {
      ctx.addIssue({ code: "custom", message: "En az bir paket boyutu seç.", path: ["sizes"] });
    }
    if (val.pickup && !val.pickup.sube && !val.pickup.adres && !val.pickup.nokta) {
      ctx.addIssue({ code: "custom", message: "En az bir teslim alma yöntemi seç.", path: ["pickup"] });
    }
    if (val.dropoff && !val.dropoff.sube && !val.dropoff.adres && !val.dropoff.nokta) {
      ctx.addIssue({ code: "custom", message: "En az bir teslim etme yöntemi seç.", path: ["dropoff"] });
    }
    if (val.confirm && !val.confirm.kod && !val.confirm.app) {
      ctx.addIssue({ code: "custom", message: "En az bir teslim doğrulama seç.", path: ["confirm"] });
    }
  });

export const cargoPatchSchema = cargoCreateSchema;

const printColorSchema = z.object({
  bw: z.boolean(),
  color: z.boolean(),
});
const printPaperSchema = z.object({
  a4: z.boolean(),
});
const printSidesSchema = z.object({
  tek: z.boolean(),
  cift: z.boolean(),
});
const printFileSchema = z.object({
  pdf: z.boolean(),
  word: z.boolean(),
  image: z.boolean(),
  other: z.boolean(),
});
const printSendSchema = z.object({
  app: z.boolean(),
  email: z.boolean(),
  other: z.boolean(),
});
const printPickupSchema = z.object({
  adres: z.boolean(),
  nokta: z.boolean(),
});

export const printCreateSchema = z
  .object({
    name: z.string().trim().min(2, "Hizmet adı en az 2 karakter.").max(80),
    colors: printColorSchema.optional(),
    paper: printPaperSchema.optional(),
    sides: printSidesSchema.optional(),
    files: printFileSchema.optional(),
    price: z.number({ error: "Fiyat gerekli." }).int().min(1, "Sayfa ücreti 1–100 ₺.").max(100, "Sayfa ücreti 1–100 ₺."),
    minPages: z.number().int().min(1, "Minimum 1–200 sayfa.").max(200, "Minimum 1–200 sayfa.").optional(),
    durationMin: z.number().int().min(0).max(480).optional().nullable(),
    send: printSendSchema.optional(),
    pickup: printPickupSchema.optional(),
    avail: z.enum(["hemen", "saat", "randevu"]).optional(),
    workHours: z.string().trim().max(80).optional().nullable(),
    notes: z.string().trim().max(400).optional().nullable(),
    isActive: z.boolean().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.colors && !val.colors.bw && !val.colors.color) {
      ctx.addIssue({ code: "custom", message: "En az bir baskı türü seç.", path: ["colors"] });
    }
    if (val.paper && !val.paper.a4) {
      ctx.addIssue({ code: "custom", message: "Kağıt boyutu seç.", path: ["paper"] });
    }
    if (val.sides && !val.sides.tek && !val.sides.cift) {
      ctx.addIssue({ code: "custom", message: "En az bir baskı yüzü seç.", path: ["sides"] });
    }
    if (val.files && !val.files.pdf && !val.files.word && !val.files.image && !val.files.other) {
      ctx.addIssue({ code: "custom", message: "En az bir dosya türü seç.", path: ["files"] });
    }
    if (val.send && !val.send.app && !val.send.email && !val.send.other) {
      ctx.addIssue({ code: "custom", message: "En az bir dosya gönderme yöntemi seç.", path: ["send"] });
    }
    if (val.pickup && !val.pickup.adres && !val.pickup.nokta) {
      ctx.addIssue({ code: "custom", message: "En az bir teslim alma yöntemi seç.", path: ["pickup"] });
    }
  });

export const printPatchSchema = printCreateSchema;

export const dropCreateSchema = z.object({
  label: z.string().trim().min(2).max(80),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

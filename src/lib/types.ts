import type { LaundryPackageId, OrderPackageId } from "./categories/registry";

export type PackageId = LaundryPackageId;
export type { OrderPackageId };
export type DropMethod = "kapi" | "nokta";
export type DryingType = "makine" | "ip" | "ikisi";
export type MapMode = "2d" | "3d";
export type TrustTier = "yeni" | "kurucu" | "guvenilir";

export type OrderStatus =
  | "onay_bekliyor"
  | "teslim_alindi"
  | "yikaniyor"
  | "utuleniyor"
  | "hazir"
  | "teslim_edildi"
  | "iptal";

export type LngLat = { lng: number; lat: number };

export type ServicePackage = {
  id: PackageId;
  title: string;
  blurb: string;
  pricePerPiece: number;
};

export type FoodCategory = "kisir" | "pasta" | "kurabiye" | "borek" | "salata" | "tatli" | "diger";
export type FoodPriceUnit = "porsiyon" | "kg" | "adet" | "tepsi" | "kisi";
export type FoodDelivery = "kapi" | "nokta" | "ikisi";

export type SewingSubcategory = "kiyafet" | "tamir" | "ozel" | "tekstil" | "diger";
export type SewingPriceUnit = "adet" | "cift" | "metre" | "kg" | "parca" | "saat" | "proje";
export type SewingMaterial = "customer" | "provider" | "either";
export type SewingDelivery = { adres: boolean; nokta: boolean; yakin: boolean };

export type FulfillmentType = "dropoff" | "home_visit";

export type RepairKind =
  | "elektronik"
  | "ev"
  | "mobilya"
  | "bisiklet"
  | "oyuncak"
  | "aksesuar"
  | "musluk"
  | "diger";
export type RepairJob = "onarim" | "parca" | "montaj" | "bakim" | "temizlik" | "diger";
export type RepairPriceType = "sabit" | "baslangic" | "inceleme";
export type RepairPriceUnit = "adet" | "parca" | "urun" | "saat" | "is";
export type RepairParts = "included" | "extra" | "customer" | "either";
export type RepairQuoteFrom = "photo" | "seen";
export type RepairDelivery = { adres: boolean; nokta: boolean; yakin: boolean };

export type TechKind = "bilgisayar" | "telefon" | "yazici" | "konsol" | "tv" | "ag" | "diger";
export type TechJob = "kurulum" | "format" | "yazilim" | "veri" | "bakim" | "parca" | "sorun" | "diger";
export type TechPriceType = "sabit" | "baslangic" | "inceleme";
export type TechPriceUnit = "cihaz" | "islem" | "saat" | "paket";
export type TechMaterials = "provider" | "customer" | "included" | "extra" | "none";
export type TechDelivery = { adres: boolean; nokta: boolean; yakin: boolean; yerinde: boolean };

export type WashJob = "dis" | "ic" | "icdis";
export type WashVehicle = "otomobil" | "suv" | "ticari" | "diger";
export type WashBooking = "randevu" | "musait";
export type WashMaterials = "provider" | "customer";
export type WashIncludes = {
  dis: boolean;
  supurme: boolean;
  cam: boolean;
  torpido: boolean;
  jant: boolean;
  kurulama: boolean;
};

export type CourierTransport = {
  yaya: boolean;
  bisiklet: boolean;
  ebike: boolean;
  motor: boolean;
};
export type CourierSize = { kucuk: boolean; orta: boolean; buyuk: boolean };
export type CourierPriceType = "sabit" | "mesafe";
export type CourierRoute = { adresAdres: boolean; noktaAdres: boolean; noktaNokta: boolean };
export type CourierAvail = "hemen" | "randevu" | "saat";
export type CourierCarry = {
  evrak: boolean;
  paket: boolean;
  kiyafet: boolean;
  anahtar: boolean;
  hediye: boolean;
  kisisel: boolean;
  diger: boolean;
};
export type CourierConfirm = { kod: boolean; app: boolean };

export type GardenJobs = {
  cim: boolean;
  budama: boolean;
  ot: boolean;
  yaprak: boolean;
  dikim: boolean;
  saksi: boolean;
  tasima: boolean;
  sulama: boolean;
  duzen: boolean;
  diger: boolean;
};
export type GardenArea = { kucuk: boolean; orta: boolean; buyuk: boolean };
export type GardenPriceType = "sabit" | "alan" | "durum";
export type GardenEquipment = "provider" | "customer" | "none";
export type GardenAvail = "hemen" | "randevu" | "gun";

export type CargoJobs = {
  subeAl: boolean;
  subeBirak: boolean;
  noktaNokta: boolean;
  alNokta: boolean;
  teslimSube: boolean;
};
export type CargoSize = { kucuk: boolean; orta: boolean; buyuk: boolean };
export type CargoPriceType = "sabit" | "mesafe";
export type CargoAvail = "hemen" | "randevu" | "saat";
export type CargoPickup = { sube: boolean; adres: boolean; nokta: boolean };
export type CargoDrop = { sube: boolean; adres: boolean; nokta: boolean };
export type CargoConfirm = { kod: boolean; app: boolean };

export type PrintColor = { bw: boolean; color: boolean };
export type PrintPaper = { a4: boolean };
export type PrintSides = { tek: boolean; cift: boolean };
export type PrintFile = { pdf: boolean; word: boolean; image: boolean; other: boolean };
export type PrintSend = { app: boolean; email: boolean; other: boolean };
export type PrintPickup = { adres: boolean; nokta: boolean };
export type PrintAvail = "hemen" | "saat" | "randevu";

export type PreserveKind = {
  salca: boolean;
  tarhana: boolean;
  eriste: boolean;
  manti: boolean;
  sarma: boolean;
  dondurucu: boolean;
  other: boolean;
};
export type PreserveMaterial = "provider" | "customer" | "together";
export type PreservePriceUnit = "kg" | "porsiyon" | "paket" | "tepsi" | "adet";
export type PreserveStorage = { frozen: boolean; fresh: boolean; dried: boolean; jarred: boolean };
export type PreservePickup = { adres: boolean; nokta: boolean };

export type CarpetKind = { hali: boolean; kilim: boolean; yolluk: boolean; other: boolean };
export type CarpetSize = { kucuk: boolean; orta: boolean; buyuk: boolean; xl: boolean };
export type CarpetClean = { genel: boolean; leke: boolean; koku: boolean; ozel: boolean };
export type CarpetPickup = { adres: boolean; nokta: boolean };

export type LessonKind = {
  takip: boolean;
  okuma: boolean;
  eslik: boolean;
  tekrar: boolean;
  sinav: boolean;
  other: boolean;
};
export type LessonLevel = { ilkokul: boolean; ortaokul: boolean; lise: boolean };
export type LessonSubject = {
  turkce: boolean;
  matematik: boolean;
  fen: boolean;
  sosyal: boolean;
  ingilizce: boolean;
  all: boolean;
  other: boolean;
};
export type LessonDuration = { m30: boolean; m45: boolean; m60: boolean; m90: boolean };
export type LessonPlace = { ev: boolean; ortak: boolean; online: boolean };
export type LessonMaterials = { student: boolean; provider: boolean; none: boolean };

export type TalkLang = {
  en: boolean;
  de: boolean;
  es: boolean;
  fr: boolean;
  it: boolean;
  ar: boolean;
  other: boolean;
};
export type TalkKind = {
  speaking: boolean;
  chat: boolean;
  beginner: boolean;
  vocab: boolean;
  pronun: boolean;
  grammar: boolean;
  exam: boolean;
};
export type TalkLevel = { a1: boolean; a2: boolean; b: boolean };
export type TalkDuration = { m30: boolean; m45: boolean; m60: boolean };
export type TalkPlace = { ev: boolean; ortak: boolean; online: boolean };
export type TalkMaterials = { provider: boolean; student: boolean; together: boolean };

/** Evde çıktı kartı. Sayfa başı fiyat; siparişte sunucu çarpar. */
export type ProviderPrint = {
  id: string;
  name: string;
  photoUrl?: string | null;
  colors: PrintColor;
  paper: PrintPaper;
  sides: PrintSides;
  files: PrintFile;
  price: number;
  minPages: number;
  durationMin?: number | null;
  send: PrintSend;
  pickup: PrintPickup;
  avail?: PrintAvail;
  workHours?: string | null;
  notes?: string | null;
  isActive?: boolean;
};

/** Kışlık & dondurucu kartı. Birim başı fiyat; siparişte sunucu çarpar. */
export type ProviderPreserve = {
  id: string;
  name: string;
  description?: string | null;
  photoUrl?: string | null;
  kinds: PreserveKind;
  portion?: string | null;
  ingredients?: string | null;
  material?: PreserveMaterial;
  price: number;
  priceUnit?: PreservePriceUnit;
  minOrder?: number;
  leadDays?: number | null;
  noticeDays?: number | null;
  storage: PreserveStorage;
  pickup: PreservePickup;
  season?: string | null;
  allergens?: string | null;
  notes?: string | null;
  isActive?: boolean;
};

/** Halı yıkama kartı. Adet başı fiyat; siparişte sunucu çarpar. */
export type ProviderCarpet = {
  id: string;
  name: string;
  description?: string | null;
  photoUrl?: string | null;
  kinds: CarpetKind;
  sizes: CarpetSize;
  minOrder?: number;
  cleans: CarpetClean;
  price: number;
  leadDays?: number | null;
  pickup: CarpetPickup;
  readyAt?: string | null;
  products?: string | null;
  noticeDays?: number | null;
  notes?: string | null;
  isActive?: boolean;
};

/** Ödev eşliği kartı. Ders başı fiyat; siparişte sunucu çarpar. */
export type ProviderLesson = {
  id: string;
  name: string;
  description?: string | null;
  photoUrl?: string | null;
  kinds: LessonKind;
  levels: LessonLevel;
  subjects: LessonSubject;
  subjectOther?: string | null;
  durations: LessonDuration;
  price: number;
  place: LessonPlace;
  weekly?: number;
  materials: LessonMaterials;
  notes?: string | null;
  isActive?: boolean;
};

/** Dil pratiği kartı. Görüşme başı fiyat; siparişte sunucu çarpar. */
export type ProviderTalk = {
  id: string;
  name: string;
  description?: string | null;
  photoUrl?: string | null;
  langs: TalkLang;
  langOther?: string | null;
  kinds: TalkKind;
  levels: TalkLevel;
  durations: TalkDuration;
  price: number;
  place: TalkPlace;
  materials: TalkMaterials;
  notes?: string | null;
  isActive?: boolean;
};

export type GraveKind = {
  temizlik: boolean;
  cicek: boolean;
  sulama: boolean;
  ot: boolean;
  cevre: boolean;
  ziyaret: boolean;
  other: boolean;
};
export type GravePrice = { visit: boolean; job: boolean; monthly: boolean; other: boolean };
export type GraveFlower = { customer: boolean; provider: boolean; together: boolean };
export type GraveFee = { included: boolean; extra: boolean };
export type GravePhotoSend = { beforeAfter: boolean; after: boolean; none: boolean };
export type GraveAvail = { once: boolean; weekly: boolean; monthly: boolean; days: boolean };

/** Mezar bakımı kartı. İşlem başı fiyat; siparişte sunucu çarpar. İş mezarlıkta. */
export type ProviderGrave = {
  id: string;
  name: string;
  description?: string | null;
  photoUrl?: string | null;
  kinds: GraveKind;
  cemetery?: string | null;
  radiusKm: number;
  price: number;
  pricing: GravePrice;
  flowers: GraveFlower;
  fees: GraveFee;
  durationMin?: number | null;
  photos: GravePhotoSend;
  avails: GraveAvail;
  workHours?: string | null;
  notes?: string | null;
  isActive?: boolean;
};

/** Kargo & paket kartı. Sabit fiyatta sunucu çarpar; mesafeye göre listedeki tutar başlangıç. */
export type ProviderCargo = {
  id: string;
  name: string;
  photoUrl?: string | null;
  jobs: CargoJobs;
  sizes: CargoSize;
  maxKm: number;
  branches?: string | null;
  points?: string | null;
  price: number;
  priceType?: CargoPriceType;
  durationMin?: number | null;
  avail?: CargoAvail;
  workHours?: string | null;
  pickup: CargoPickup;
  dropoff: CargoDrop;
  confirm: CargoConfirm;
  refuse?: string | null;
  notes?: string | null;
  isActive?: boolean;
};

/** Bahçe & bitki kartı. Sabit fiyatta sunucu çarpar; alan/durum listedeki tutar başlangıç. */
export type ProviderGarden = {
  id: string;
  name: string;
  description?: string | null;
  photoUrl?: string | null;
  jobs: GardenJobs;
  areas: GardenArea;
  price: number;
  priceType?: GardenPriceType;
  durationMin?: number | null;
  equipment?: GardenEquipment;
  location?: string | null;
  maxKm: number;
  avail?: GardenAvail;
  workHours?: string | null;
  canDo?: string | null;
  cannotDo?: string | null;
  notes?: string | null;
  isActive?: boolean;
};

/** Yakın mesafe kurye kartı. Sabit fiyatta sunucu çarpar; mesafeye göre listedeki tutar başlangıç. */
export type ProviderCourier = {
  id: string;
  name: string;
  description?: string | null;
  photoUrl?: string | null;
  transport: CourierTransport;
  sizes: CourierSize;
  maxKm: number;
  price: number;
  priceType?: CourierPriceType;
  durationMin?: number | null;
  routes: CourierRoute;
  avail?: CourierAvail;
  workHours?: string | null;
  region?: string | null;
  carry: CourierCarry;
  carryOther?: string | null;
  refuse?: string | null;
  confirm: CourierConfirm;
  notes?: string | null;
  isActive?: boolean;
};

/** Araba yıkama kartı. Fiyat araç başı; siparişte sunucu çarpar. */
export type ProviderWash = {
  id: string;
  name: string;
  description?: string | null;
  job?: WashJob;
  vehicle?: WashVehicle;
  photoUrl?: string | null;
  price: number;
  includes: WashIncludes;
  durationMin?: number | null;
  maxPerDay?: number | null;
  booking?: WashBooking;
  location?: string | null;
  workHours?: string | null;
  materials?: WashMaterials;
  notes?: string | null;
  isActive?: boolean;
};

/** Teknoloji & kurulum kartı. Sabit/başlangıç fiyatta sunucu çarpar; inceleme sonrası 0 ise sipariş yok. */
export type ProviderTech = {
  id: string;
  name: string;
  description?: string | null;
  kind?: TechKind;
  item?: string | null;
  job?: TechJob;
  photoUrl?: string | null;
  price: number;
  priceType?: TechPriceType;
  priceUnit?: TechPriceUnit;
  materials?: TechMaterials;
  leadHours?: number | null;
  leadDays?: number | null;
  maxPerWeek?: number | null;
  delivery: TechDelivery;
  inspectRequired?: boolean;
  quoteFromPhoto?: boolean;
  platform?: string | null;
  warrantyDays?: number | null;
  notes?: string | null;
  workHours?: string | null;
  isActive?: boolean;
};

/** Tamir hizmet kartı. Sabit/başlangıç fiyatta sunucu çarpar; inceleme sonrası 0 ise sipariş yok. */
export type ProviderRepair = {
  id: string;
  name: string;
  description?: string | null;
  kind?: RepairKind;
  item?: string | null;
  job?: RepairJob;
  photoUrl?: string | null;
  price: number;
  priceType?: RepairPriceType;
  priceUnit?: RepairPriceUnit;
  parts?: RepairParts;
  leadDays?: number | null;
  maxPerWeek?: number | null;
  delivery: RepairDelivery;
  workRadiusKm?: number | null;
  inspectRequired?: boolean;
  quoteFrom?: RepairQuoteFrom;
  warrantyDays?: number | null;
  notes?: string | null;
  workHours?: string | null;
  isActive?: boolean;
  /** Kartın akışı. musluk → home_visit; diğerleri dropoff. Client seçmez. */
  fulfillmentType?: FulfillmentType;
};

/** Dikiş & tadilat hizmet kartı. Fiyat seçilen birim başı; siparişte sunucu çarpar. */
export type ProviderService = {
  id: string;
  name: string;
  description?: string | null;
  subcategory?: SewingSubcategory;
  photoUrl?: string | null;
  price: number;
  priceUnit?: SewingPriceUnit;
  minOrder?: number;
  leadDays?: number | null;
  maxPerWeek?: number | null;
  delivery: SewingDelivery;
  workRadiusKm?: number | null;
  notes?: string | null;
  material?: SewingMaterial;
  isActive?: boolean;
};

/** Davet menü kalemi. Fiyat seçilen birim başı; siparişte sunucu çarpar. */
export type ProviderProduct = {
  id: string;
  name: string;
  pricePerPerson: number;
  photoUrl?: string | null;
  description?: string | null;
  foodCategory?: FoodCategory | null;
  priceUnit?: FoodPriceUnit;
  minOrder?: number;
  maxQty?: number | null;
  leadHours?: number | null;
  delivery?: FoodDelivery;
  allergens?: string | null;
  isActive?: boolean;
};

export type OrderPhotoKind = "dropoff" | "pickup" | "damage";

export type WorkPhoto = {
  id: string;
  url: string;
  createdAt: string;
  kind?: OrderPhotoKind | string;
};

export type OrderStatusEvent = {
  id: string;
  from: string | null;
  to: string;
  actorId: string | null;
  actorRole: string | null;
  note: string | null;
  createdAt: string;
};

export type RatingBreakdown = {
  overall: number;
  count: number;
  quality: number | null;
  timeliness: number | null;
  communication: number | null;
  repeatRate: number | null;
};

export type Review = {
  id: string;
  providerId: string;
  orderId: string | null;
  rating: number;
  body: string;
  author: string;
  createdAt: string;
  photos?: WorkPhoto[];
  quality?: number | null;
  timeliness?: number | null;
  communication?: number | null;
  wouldRepeat?: boolean | null;
};

export type Provider = {
  id: string;
  name: string;
  neighborhood: string;
  loc: LngLat;
  rating: number;
  reviews: number;
  ratingBreakdown?: RatingBreakdown;
  packages: ServicePackage[];
  capacity: number;
  remaining: number;
  hasDryer: boolean;
  /** Yoksa müşteri `hasDryer` ile kurutucu / boş görür. */
  dryingType?: DryingType;
  express: boolean;
  trust: TrustTier;
  drops: DropMethod[];
  slots: string[];
  bio: string;
  avatarUrl?: string | null;
  workPhotos: WorkPhoto[];
  recentReviews: Review[];
  categoryId?: string;
  products?: ProviderProduct[];
  services?: ProviderService[];
  repairs?: ProviderRepair[];
  techs?: ProviderTech[];
  washes?: ProviderWash[];
  couriers?: ProviderCourier[];
  gardens?: ProviderGarden[];
  cargos?: ProviderCargo[];
  prints?: ProviderPrint[];
  preserves?: ProviderPreserve[];
  carpets?: ProviderCarpet[];
  lessons?: ProviderLesson[];
  talks?: ProviderTalk[];
  graves?: ProviderGrave[];
};

export type DropPoint = {
  id: string;
  name: string;
  hint: string;
  loc: LngLat;
};

export type PaymentStatus = "authorized" | "captured" | "voided";

export type AppPayment = {
  id: string;
  orderId: string;
  amount: number;
  commission: number;
  status: PaymentStatus;
  providerReference: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Hedef JSON API yaşam döngüsü. PWA hâlâ Türkçe `OrderStatus` saklar. */
export type ApiLifecycle =
  | "pending"
  | "accepted"
  | "dropped_off"
  | "washing"
  | "ironing"
  | "ready"
  | "completed"
  | "rejected"
  | "cancelled"
  | "disputed";

export type Order = {
  id: string;
  providerId: string;
  packageId: OrderPackageId;
  pieces: number;
  express: boolean;
  drop: DropMethod;
  dropPointId: string | null;
  slot: string;
  note: string;
  productId?: string | null;
  productName?: string | null;
  guestCount?: number | null;
  allergyNote?: string | null;
  fulfillmentType?: FulfillmentType;
  visitDistrict?: string | null;
  visitNeighborhood?: string | null;
  visitAddress?: string | null;
  appointment?: {
    date: string;
    windowStart: string;
    windowEnd: string;
  } | null;
  total: number;
  commission: number;
  status: OrderStatus;
  createdAt: string;
  photos: WorkPhoto[];
  review: Review | null;
  /** Only while status is `hazir`. Customer shows this; desk must not display it. */
  pickupCode: string | null;
  paymentStatus: PaymentStatus;
  paidAt: string | null;
  payment?: AppPayment;
  customerId?: string | null;
  lifecycle?: ApiLifecycle;
  deliveryMode?: "door" | "point";
  estimatedWeight?: number;
  pricePerKgSnapshot?: number;
  estimatedPrice?: number;
  finalPrice?: number | null;
  updatedAt?: string;
};

export type CreateOrderInput = {
  providerId: string;
  packageId?: PackageId;
  pieces?: number;
  express?: boolean;
  drop: DropMethod;
  dropPointId: string | null;
  slot?: string;
  note: string;
  productId?: string;
  guestCount?: number;
  allergyNote?: string;
  appointmentDate?: string;
  appointmentWindowStart?: string;
  appointmentWindowEnd?: string;
  visitDistrict?: string;
  visitNeighborhood?: string;
  visitAddress?: string;
  addressShareConsent?: boolean;
};

export type AppNotification = {
  id: string;
  orderId: string | null;
  type: string;
  title: string;
  body: string;
  channel: string;
  readAt: string | null;
  createdAt: string;
};

export type WalletSnapshot = {
  balance: number;
  canPay: 0 | 1;
  methods: { id: string; label: string; hint: string }[];
};

export type WalletActivity = {
  id: string;
  amount: number;
  kind: string;
  method: string | null;
  orderId: string | null;
  createdAt: string;
};

export type PreferredIntent = "seek" | "offer" | "both";

export type Account = {
  id: string;
  phone: string;
  name: string;
  identityVerified: boolean;
  passkeyEnabled: boolean;
  role: "customer" | "provider" | "admin";
  avatarUrl?: string | null;
  preferredCategoryIds: string[];
  preferredIntent: PreferredIntent | null;
  onboardingCompletedAt: string | null;
  homeLat: number | null;
  homeLng: number | null;
  homeNeighborhood: string | null;
};

export type OrderMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  warning: boolean;
  readAt: string | null;
  deleted: boolean;
  createdAt: string;
};

export type OrderConversation = {
  id: string;
  orderId: string;
  status: "open" | "closed" | "blocked";
  createdAt: string;
  updatedAt: string;
};

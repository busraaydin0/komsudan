export type PackageId = "yikama" | "katlama" | "tam";
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

export type RepairKind = "elektronik" | "ev" | "mobilya" | "bisiklet" | "oyuncak" | "aksesuar" | "diger";
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
  from: ApiLifecycle | null;
  to: ApiLifecycle;
  actorId: string | null;
  actorRole: string | null;
  note: string | null;
  createdAt: string;
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
};

export type Provider = {
  id: string;
  name: string;
  neighborhood: string;
  loc: LngLat;
  rating: number;
  reviews: number;
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
  packageId: PackageId | "davet" | "dikis" | "tamir" | "teknoloji" | "araba" | "kurye";
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
  slot: string;
  note: string;
  productId?: string;
  guestCount?: number;
  allergyNote?: string;
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

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
  packageId: PackageId | "davet";
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

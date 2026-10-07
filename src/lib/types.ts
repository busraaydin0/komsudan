import type { LaundryPackageId, OrderPackageId } from "./categories/registry";
import type { LaundrySize, OrderAddonLine, PriceChangeStatus } from "./laundryModel";

export type PackageId = LaundryPackageId;
export type { OrderPackageId };
export type DropMethod = "kapi";
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
  /** Liste kartı: orta boy fiyatı (geriye dönük alan adı). */
  pricePerPiece: number;
};

/** Müşteri tarafında anlık teklif için katalogdan gelir; sunucu kaynağı provider_prices. */
export type LaundryPriceGrid = {
  sizes: Partial<Record<PackageId, Partial<Record<LaundrySize, number>>>>;
  addons: Record<string, number>;
};

export type FulfillmentType = "dropoff";

export type OrderPhotoKind = "dropoff" | "pickup" | "damage" | "delivery";

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
  laundryPrices?: LaundryPriceGrid;
  capacity?: ProviderCapacitySummary;
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
};

export type ProviderCapacitySummary = {
  configured: boolean;
  maxUnitsPerOrder: number;
  earliestDelivery: string | null;
  earliestDeliveryLabel: string | null;
  weekLoad: { date: string; freeRatio: number; usedRatio: number }[];
  weekTone: "ok" | "low" | "full";
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
  | "disputed"
  | "admin_pending";

export type Order = {
  id: string;
  providerId: string;
  packageId: OrderPackageId;
  size: LaundrySize;
  confirmedSize: LaundrySize | null;
  addons: OrderAddonLine[];
  machineUnits: number;
  express: boolean;
  drop: DropMethod;
  slot: string;
  pickup: AppointmentWindow | null;
  delivery: AppointmentWindow | null;
  respondBy: string | null;
  note: string;
  fulfillmentType?: FulfillmentType;
  total: number;
  commission: number;
  status: OrderStatus;
  createdAt: string;
  photos: WorkPhoto[];
  review: Review | null;
  /** KL-XXXX — iki tarafta görünür. */
  publicCode: string | null;
  /** Yalnız müşteri API'sinde, aktifken. */
  pickupHandoffCode: string | null;
  returnHandoffCode: string | null;
  pickupSummaryApprovedAt: string | null;
  adminHold: boolean;
  disputeWindowEnd: string | null;
  paymentStatus: PaymentStatus;
  paidAt: string | null;
  payment?: AppPayment;
  customerId?: string | null;
  lifecycle?: ApiLifecycle;
  deliveryMode?: "door" | "point";
  priceChange: PriceChangeStatus;
  colorGroups: number | null;
  pickupConfirmedAt: string | null;
  cancelReason: string | null;
  estimatedDeliveryDate: string | null;
  promisedDeliveryDate: string | null;
  delayCount: number;
  updatedAt?: string;
};

export type AppointmentWindow = {
  date: string;
  windowStart: string;
  windowEnd: string;
};

export type CreateOrderInput = {
  providerId: string;
  packageId?: PackageId;
  size: LaundrySize;
  addons?: OrderAddonLine[];
  drop: DropMethod;
  pickup: AppointmentWindow;
  delivery: AppointmentWindow;
  note: string;
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
  canWithdraw?: 0 | 1;
  methods: { id: string; label: string; hint: string }[];
  payoutMethods?: { id: string; label: string; hint: string }[];
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

export type MessageInboxThread = {
  orderId: string;
  peerName: string;
  title: string;
  status: string;
  preview: string;
  unread: number;
  updatedAt: string;
  conversationStatus: OrderConversation["status"];
};

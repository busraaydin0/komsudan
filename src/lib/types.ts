export type PackageId = "yikama" | "katlama" | "tam";
export type DropMethod = "kapi" | "nokta";
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

export type WorkPhoto = {
  id: string;
  url: string;
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
  express: boolean;
  trust: TrustTier;
  drops: DropMethod[];
  slots: string[];
  bio: string;
  workPhotos: WorkPhoto[];
  recentReviews: Review[];
};

export type DropPoint = {
  id: string;
  name: string;
  hint: string;
  loc: LngLat;
};

export type PaymentStatus = "authorized" | "captured" | "voided";

export type Order = {
  id: string;
  providerId: string;
  packageId: PackageId;
  pieces: number;
  express: boolean;
  drop: DropMethod;
  dropPointId: string | null;
  slot: string;
  note: string;
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
};

export type CreateOrderInput = {
  providerId: string;
  packageId: PackageId;
  pieces: number;
  express: boolean;
  drop: DropMethod;
  dropPointId: string | null;
  slot: string;
  note: string;
};

export type Account = {
  id: string;
  phone: string;
  name: string;
  identityVerified: boolean;
  passkeyEnabled: boolean;
  role: "customer" | "provider" | "admin";
};

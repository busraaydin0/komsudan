import { randomInt, randomUUID } from "node:crypto";
import { estimateFood, estimateFor, GUESTS_MAX, GUESTS_MIN, PIECES_MAX, PIECES_MIN } from "@/lib/pricing";
import { loyaltyRate } from "@/lib/loyalty";
import { getCategoryForProvider } from "@/lib/db/categories";
import { getProduct } from "@/lib/db/products";
import { strategyFor } from "@/lib/fulfillment";
import {
  canAddPhotos,
  canCancel,
  isLifecycle,
  lifecycleOf,
  nextStatus,
  PICKUP_CODE_LEN,
  PICKUP_CODE_TRIES,
  pilotFromLifecycle,
} from "@/lib/status";
import type {
  ApiLifecycle,
  CreateOrderInput,
  DropMethod,
  Order,
  OrderPhotoKind,
  OrderStatus,
  OrderStatusEvent,
  PackageId,
  PaymentStatus,
} from "@/lib/types";
import type { AuthUser } from "@/lib/auth/types";
import { deliveredCount } from "@/lib/db/auth";
import {
  addRemaining,
  bumpCodeAttempts,
  dropPointExists,
  getOrderRow,
  getRemaining,
  insertOrderRow,
  listHistoryRows,
  listOrderRowsAll,
  listOrderRowsForCustomer,
  listOrderRowsForProvider,
  recordTransition,
  rotatePickupCode,
  runOrderTx,
  setPickupCode,
  updateOrderStatus,
  type OrderRow,
} from "@/lib/db/orders";
import { getProvider } from "@/server/catalog";
import { addPhoto, photosForOrder } from "@/server/photos";
import { reviewForOrder } from "@/server/reviews";
import { ApiError } from "@/server/rules";
import {
  notifyNewOrder,
  notifyPickupCodeRotated,
  notifyStatusChange,
} from "@/lib/services/notificationService";
import { authorizePayment, capturePayment, paymentForOrder, voidPayment } from "@/lib/services/paymentService";

export type OrderAction = "accept" | "reject" | "advance" | "deliver";

function genCode() {
  return randomInt(0, 10 ** PICKUP_CODE_LEN)
    .toString()
    .padStart(PICKUP_CODE_LEN, "0");
}

function digits(raw: string) {
  return raw.replace(/\D/g, "");
}

function deliveryMode(drop: DropMethod): "door" | "point" {
  return drop === "kapi" ? "door" : "point";
}

function ensurePickupCode(row: OrderRow) {
  if (row.status !== "hazir") return;
  if (row.pickup_code) return;
  const code = genCode();
  setPickupCode(row.id, code);
  row.pickup_code = code;
}

function toOrder(row: OrderRow): Order {
  ensurePickupCode(row);
  const drop = row.drop_method as DropMethod;
  const status = row.status as OrderStatus;
  const pay = paymentForOrder(row.id);
  const payStatus = (pay?.status ?? row.payment_status) as PaymentStatus;
  return {
    id: row.id,
    providerId: row.provider_id,
    packageId: (row.package_id === "davet" ? "davet" : row.package_id) as Order["packageId"],
    pieces: row.pieces,
    express: Boolean(row.express),
    drop,
    dropPointId: row.drop_point_id,
    slot: row.slot,
    note: row.note,
    productId: row.product_id,
    productName: row.product_name,
    guestCount: row.guest_count,
    allergyNote: row.allergy_note,
    total: row.total,
    commission: row.commission,
    status,
    createdAt: row.created_at,
    photos: photosForOrder(row.id),
    review: reviewForOrder(row.id),
    pickupCode: status === "hazir" ? row.pickup_code : null,
    paymentStatus: payStatus,
    paidAt: payStatus === "captured" ? (pay?.updatedAt ?? row.paid_at) : row.paid_at,
    payment: pay,
    customerId: row.user_id,
    lifecycle: lifecycleOf(status, row.lifecycle),
    deliveryMode: (row.delivery_mode as "door" | "point" | null) ?? deliveryMode(drop),
    estimatedWeight: row.estimated_weight ?? row.pieces,
    pricePerKgSnapshot: row.price_per_kg_snapshot ?? 0,
    estimatedPrice: row.estimated_price ?? row.total,
    finalPrice: row.final_price,
    updatedAt: row.updated_at,
  };
}

export function canSeeOrder(user: AuthUser, row: OrderRow) {
  if (user.role === "admin") return true;
  if (row.user_id === user.id) return true;
  if (row.provider_id === user.id) return true;
  return false;
}

/** Şimdilik kapalı: PWA masasında siparişi gören (müşteri dahil) kabul/ilerletsin. */
const REQUIRE_PROVIDER_TO_MUTATE = false;

function canMutateOrder(user: AuthUser, row: OrderRow) {
  if (user.role === "admin") return true;
  if (!canSeeOrder(user, row)) return false;
  if (!REQUIRE_PROVIDER_TO_MUTATE) return true;
  return user.role === "provider" && row.provider_id === user.id;
}

export function getOrder(id: string): Order | undefined {
  const row = getOrderRow(id);
  return row ? toOrder(row) : undefined;
}

export function getOrderFor(user: AuthUser, id: string): Order {
  const row = getOrderRow(id);
  if (!row || !canSeeOrder(user, row)) {
    throw new ApiError(404, "Sipariş yok.", "NOT_FOUND");
  }
  return toOrder(row);
}

export function listOrdersFor(user: AuthUser): Order[] {
  const rows =
    user.role === "admin"
      ? listOrderRowsAll()
      : user.role === "provider"
        ? listOrderRowsForProvider(user.id)
        : listOrderRowsForCustomer(user.id);
  return rows.map(toOrder);
}

export function createOrder(input: CreateOrderInput, userId: string): Order {
  const provider = getProvider(input.providerId);
  if (!provider) throw new ApiError(404, "Hizmet veren bulunamadı.", "NOT_FOUND");
  const cat = getCategoryForProvider(provider.id);
  assertFulfillmentReady(provider.id);

  if (cat.id === "davet") return createDavetOrder(input, userId, provider);
  return createLaundryOrder(input, userId, provider);
}

function validateDropAndSlot(provider: NonNullable<ReturnType<typeof getProvider>>, input: CreateOrderInput) {
  if (!provider.drops.includes(input.drop)) {
    throw new ApiError(400, "Bu teslimat yöntemi kapalı.", "VALIDATION_ERROR");
  }

  let dropPointId: string | null = null;
  if (input.drop === "nokta") {
    if (!input.dropPointId || !dropPointExists(input.dropPointId)) {
      throw new ApiError(400, "Nötr nokta seç.", "VALIDATION_ERROR");
    }
    dropPointId = input.dropPointId;
  }

  if (!provider.slots.includes(input.slot)) {
    throw new ApiError(400, "Saat dilimi geçersiz.", "VALIDATION_ERROR");
  }
  return dropPointId;
}

function insertPendingOrder(args: {
  providerId: string;
  packageId: string;
  pieces: number;
  express: boolean;
  drop: DropMethod;
  dropPointId: string | null;
  slot: string;
  note: string;
  quote: { total: number; commission: number; perPiece: number };
  userId: string;
  productId?: string | null;
  productName?: string | null;
  guestCount?: number | null;
  allergyNote?: string | null;
}) {
  const now = new Date().toISOString();
  const id = `k-${randomUUID().slice(0, 8)}`;
  const capacityLabel = args.productId ? "kişilik yer" : "parça yer";
  runOrderTx(() => {
    const remaining = getRemaining(args.providerId);
    if (remaining == null) throw new ApiError(404, "Hizmet veren bulunamadı.", "NOT_FOUND");
    if (remaining < args.pieces) {
      throw new ApiError(409, `Bugün yalnızca ${remaining} ${capacityLabel} var.`, "CAPACITY");
    }
    addRemaining(args.providerId, -args.pieces);
    insertOrderRow({
      id,
      provider_id: args.providerId,
      package_id: args.packageId,
      pieces: args.pieces,
      express: args.express ? 1 : 0,
      drop_method: args.drop,
      drop_point_id: args.dropPointId,
      slot: args.slot,
      note: args.note,
      total: args.quote.total,
      commission: args.quote.commission,
      status: "onay_bekliyor",
      created_at: now,
      updated_at: now,
      user_id: args.userId,
      price_per_kg_snapshot: args.quote.perPiece,
      estimated_weight: args.pieces,
      estimated_price: args.quote.total,
      delivery_mode: deliveryMode(args.drop),
      scheduled_window_start: args.slot,
      lifecycle: "pending",
      product_id: args.productId ?? null,
      product_name: args.productName ?? null,
      guest_count: args.guestCount ?? null,
      allergy_note: args.allergyNote ?? null,
    });
    recordTransition({
      orderId: id,
      fromStatus: null,
      toStatus: "onay_bekliyor",
      fromLifecycle: null,
      toLifecycle: "pending",
      actorId: args.userId,
      actorRole: "customer",
      at: now,
    });
    authorizePayment({
      orderId: id,
      amount: args.quote.total,
      commission: args.quote.commission,
      at: now,
    });
  });
  return id;
}

function createLaundryOrder(input: CreateOrderInput, userId: string, provider: NonNullable<ReturnType<typeof getProvider>>): Order {
  const pieces = Math.round(input.pieces ?? NaN);
  if (!Number.isFinite(pieces) || pieces < PIECES_MIN || pieces > PIECES_MAX) {
    throw new ApiError(400, `Parça sayısı ${PIECES_MIN}–${PIECES_MAX} olmalı.`, "VALIDATION_ERROR");
  }
  if (!input.packageId) {
    throw new ApiError(400, "Paket seç.", "VALIDATION_ERROR");
  }
  if (input.productId) {
    throw new ApiError(400, "Çamaşır siparişinde menü ürünü yok.", "VALIDATION_ERROR");
  }

  const pack = provider.packages.find((p) => p.id === input.packageId);
  if (!pack) throw new ApiError(400, "Bu paket bu komşuda yok.", "VALIDATION_ERROR");

  const express = Boolean(input.express) && provider.express;
  if (input.express && !provider.express) {
    throw new ApiError(400, "Bu komşu aynı gün almıyor.", "VALIDATION_ERROR");
  }

  const dropPointId = validateDropAndSlot(provider, input);
  const quote = estimateFor(
    provider,
    pieces,
    input.packageId,
    express,
    loyaltyRate(deliveredCount(userId)),
  );
  const id = insertPendingOrder({
    providerId: provider.id,
    packageId: input.packageId,
    pieces,
    express,
    drop: input.drop,
    dropPointId,
    slot: input.slot,
    note: (input.note ?? "").trim().slice(0, 500),
    quote,
    userId,
  });
  const order = getOrder(id)!;
  notifyNewOrder({
    id,
    provider_id: provider.id,
    user_id: userId,
    pieces,
  });
  return order;
}

function createDavetOrder(input: CreateOrderInput, userId: string, provider: NonNullable<ReturnType<typeof getProvider>>): Order {
  const productId = (input.productId ?? "").trim();
  if (!productId) throw new ApiError(400, "Ürün seç.", "VALIDATION_ERROR");
  const product = getProduct(productId);
  if (!product || product.provider_id !== provider.id || !product.is_active) {
    throw new ApiError(400, "Bu ürün bu komşuda yok.", "VALIDATION_ERROR");
  }

  const guests = Math.round(input.guestCount ?? NaN);
  if (!Number.isFinite(guests) || guests < GUESTS_MIN || guests > GUESTS_MAX) {
    throw new ApiError(400, `Kişi sayısı ${GUESTS_MIN}–${GUESTS_MAX} olmalı.`, "VALIDATION_ERROR");
  }

  const allergy = (input.allergyNote ?? "").trim();
  if (!allergy) {
    throw new ApiError(400, "Alerji durumunu yaz. Yoksa “yok” de.", "VALIDATION_ERROR");
  }

  const dropPointId = validateDropAndSlot(provider, input);
  const quote = estimateFood(guests, product.price_per_person, loyaltyRate(deliveredCount(userId)));
  const id = insertPendingOrder({
    providerId: provider.id,
    packageId: "davet",
    pieces: guests,
    express: false,
    drop: input.drop,
    dropPointId,
    slot: input.slot,
    note: (input.note ?? "").trim().slice(0, 500),
    quote,
    userId,
    productId: product.id,
    productName: product.name,
    guestCount: guests,
    allergyNote: allergy.slice(0, 300),
  });
  const order = getOrder(id)!;
  notifyNewOrder({
    id,
    provider_id: provider.id,
    user_id: userId,
    pieces: guests,
  });
  return order;
}

function currentLifecycle(row: OrderRow): ApiLifecycle {
  return lifecycleOf(row.status as OrderStatus, row.lifecycle);
}

function assertFulfillmentReady(providerId: string) {
  const cat = getCategoryForProvider(providerId);
  const strat = strategyFor(cat.fulfillment_mode, cat.id);
  if (!strat.ready) {
    throw new ApiError(409, "Bu hizmet tipi henüz açık değil.", "CATEGORY_NOT_READY");
  }
  return strat;
}

function assertCanMove(row: OrderRow, from: ApiLifecycle, to: ApiLifecycle, packageId: PackageId) {
  const strat = assertFulfillmentReady(row.provider_id);
  if (strat.canTransition(from, to, packageId)) return;
  if (to === "ironing" && packageId !== "tam") {
    throw new ApiError(409, "Ütü bu pakette yok.", "INVALID_TRANSITION");
  }
  if (from === "washing" && to === "ready" && packageId === "tam") {
    throw new ApiError(409, "Önce ütü adımı var.", "INVALID_TRANSITION");
  }
  throw new ApiError(409, "Bu duruma geçilemez.", "INVALID_TRANSITION");
}

function assertStatusRole(user: AuthUser, row: OrderRow, next: ApiLifecycle) {
  if (user.role === "admin") return;
  if (next === "completed") {
    if (row.user_id === user.id || row.provider_id === user.id) return;
    throw new ApiError(403, "Teslimi yalnızca taraflar onaylar.", "FORBIDDEN");
  }
  if (canMutateOrder(user, row)) return;
  throw new ApiError(403, "Bu siparişi yalnızca hizmet veren ilerletebilir.", "FORBIDDEN");
}

function verifyPickupCode(row: OrderRow, code: string | undefined, now: string) {
  const entered = digits(code ?? "");
  const expected = row.pickup_code ?? "";
  if (entered.length !== PICKUP_CODE_LEN || entered !== expected) {
    const attempts = (row.code_attempts ?? 0) + 1;
    if (attempts >= PICKUP_CODE_TRIES) {
      const fresh = genCode();
      rotatePickupCode(row.id, fresh, now);
      notifyPickupCodeRotated(row, fresh);
      throw new ApiError(
        409,
        "Beş hatalı deneme. Yeni kod müşteriye gitti (SMS simülasyonu).",
        "INVALID_CODE",
      );
    }
    bumpCodeAttempts(row.id, attempts, now);
    throw new ApiError(409, `Kod uyuşmadı. Kalan deneme: ${PICKUP_CODE_TRIES - attempts}.`, "INVALID_CODE");
  }
}

export function applyStatus(
  id: string,
  user: AuthUser,
  next: ApiLifecycle,
  code?: string,
  note?: string,
): Order {
  const row = getOrderRow(id);
  if (!row || !canSeeOrder(user, row)) {
    throw new ApiError(404, "Sipariş yok.", "NOT_FOUND");
  }
  const from = currentLifecycle(row);
  const pack = row.package_id as PackageId;
  assertCanMove(row, from, next, pack);
  assertStatusRole(user, row, next);

  const now = new Date().toISOString();
  if (next === "completed") verifyPickupCode(row, code, now);

  const nextPilot = pilotFromLifecycle(next);
  const issuedCode = next === "ready" ? genCode() : null;
  const capture = next === "completed";
  const voidPay = next === "rejected" || next === "cancelled";

  runOrderTx(() => {
    if (issuedCode) {
      updateOrderStatus({
        id,
        status: nextPilot,
        lifecycle: next,
        updatedAt: now,
        pickupCode: issuedCode,
      });
    } else if (capture) {
      updateOrderStatus({
        id,
        status: nextPilot,
        lifecycle: next,
        updatedAt: now,
        pickupCode: null,
        resetAttempts: true,
        paymentStatus: "captured",
        paidAt: now,
        finalPrice: row.total,
      });
    } else if (voidPay) {
      updateOrderStatus({
        id,
        status: nextPilot,
        lifecycle: next,
        updatedAt: now,
        paymentStatus: "voided",
      });
    } else {
      updateOrderStatus({ id, status: nextPilot, lifecycle: next, updatedAt: now });
    }
    recordTransition({
      orderId: id,
      fromStatus: row.status,
      toStatus: nextPilot,
      fromLifecycle: from,
      toLifecycle: next,
      actorId: user.id,
      actorRole: user.role,
      note: note?.trim().slice(0, 200) || null,
      at: now,
    });
    if (voidPay) addRemaining(row.provider_id, row.pieces);
    if (capture) capturePayment(id, now);
    if (voidPay) voidPayment(id, now);
  });

  const order = getOrder(id)!;
  notifyStatusChange({
    row,
    from,
    next,
    actorId: user.id,
    pickupCode: order.pickupCode,
  });
  return order;
}

export function applyOrderAction(id: string, action: OrderAction, user: AuthUser, code?: string): Order {
  const row = getOrderRow(id);
  if (!row) throw new ApiError(404, "Sipariş yok.", "NOT_FOUND");
  if (!canMutateOrder(user, row)) {
    throw new ApiError(403, "Bu siparişi yalnızca hizmet veren ilerletebilir.", "FORBIDDEN");
  }

  const order = toOrder(row);
  let next: ApiLifecycle;

  if (action === "accept") {
    if (order.status !== "onay_bekliyor") {
      throw new ApiError(409, "Bu sipariş kabul edilemez.", "INVALID_TRANSITION");
    }
    next = "accepted";
  } else if (action === "reject") {
    if (!canCancel(order.status)) {
      throw new ApiError(409, "Bu aşamada iptal yok.", "INVALID_TRANSITION");
    }
    next = currentLifecycle(row) === "pending" ? "rejected" : "cancelled";
  } else if (action === "deliver") {
    if (order.status !== "hazir") {
      throw new ApiError(409, "Kod ancak hazır siparişte geçer.", "INVALID_TRANSITION");
    }
    next = "completed";
  } else {
    const n = nextStatus(order.status, order.packageId, Boolean(order.productId));
    if (!n) throw new ApiError(409, "Daha ileri durum yok.", "INVALID_TRANSITION");
    if (n === "teslim_edildi") {
      throw new ApiError(409, "Teslim için müşterinin kodunu gir.", "INVALID_TRANSITION");
    }
    next = lifecycleOf(n);
  }

  return applyStatus(id, user, next, code);
}

const PHOTO_KINDS: OrderPhotoKind[] = ["dropoff", "pickup", "damage"];

function parsePhotoKind(raw?: string): OrderPhotoKind {
  if (!raw) return "dropoff";
  if (PHOTO_KINDS.includes(raw as OrderPhotoKind)) return raw as OrderPhotoKind;
  throw new ApiError(400, "Fotoğraf türü dropoff, pickup veya damage olmalı.", "VALIDATION_ERROR");
}

export function listOrderHistory(user: AuthUser, id: string): OrderStatusEvent[] {
  getOrderFor(user, id);
  return listHistoryRows(id).map((row) => ({
    id: row.id,
    from: row.from_lifecycle && isLifecycle(row.from_lifecycle)
      ? row.from_lifecycle
      : row.from_status
        ? lifecycleOf(row.from_status as OrderStatus, row.from_lifecycle)
        : null,
    to: lifecycleOf(row.to_status as OrderStatus, row.to_lifecycle),
    actorId: row.actor_id,
    actorRole: row.actor_role,
    note: row.note,
    createdAt: row.created_at,
  }));
}

export function listOrderPhotosFor(user: AuthUser, id: string) {
  getOrderFor(user, id);
  return photosForOrder(id);
}

export function addOrderPhoto(user: AuthUser, id: string, buf: Buffer, kindRaw?: string) {
  const row = getOrderRow(id);
  if (!row || !canSeeOrder(user, row)) {
    throw new ApiError(404, "Sipariş yok.", "NOT_FOUND");
  }
  if (!canMutateOrder(user, row)) {
    throw new ApiError(403, "Fotoğrafı hizmet veren ekler.", "FORBIDDEN");
  }
  if (!canAddPhotos(row.status as OrderStatus)) {
    throw new ApiError(409, "Bu aşamada fotoğraf eklenmez.", "INVALID_TRANSITION");
  }
  return addPhoto(id, buf, parsePhotoKind(kindRaw));
}

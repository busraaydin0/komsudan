import { randomUUID } from "node:crypto";
import { generatePublicCode } from "@/lib/handoff/codegen";
import {
  issueReturnHandoffCode,
  verifyHandoffPin,
  customerHandoffSecrets,
} from "@/lib/services/handoffService";
import {
  assertCanServeOrder,
  planOrder,
  releaseOrderCapacity,
  reserveOrderCapacity,
  scheduleLine,
} from "@/lib/services/capacityService";
import { parseAllocations } from "@/lib/db/providerCapacity";
import { addonKey, type LaundrySize, type OrderAddonLine } from "@/lib/laundryModel";
import { assertReadyForDroppedOff } from "@/lib/pickupRules";
import {
  addonsFromItems,
  insertOrderItem,
  listOrderItems,
} from "@/lib/db/orderItems";
import { ensureProviderPriceGrid, getAddonPrice } from "@/lib/db/providerPrices";
import { resolveExpress } from "@/lib/pricing";
import { quoteForProviderOrder } from "@/lib/pricingServer";
import { getAppointment, insertAppointment, listAppointmentsForOrder } from "@/lib/db/appointments";
import { listSlots } from "@/lib/db/providers";
import { computeRespondBy } from "@/lib/scheduling/respondBy";
import { windowLabel } from "@/lib/scheduling/windows";
import { assertCalendarWindow } from "@/lib/services/calendarService";
import { getCategoryForProvider } from "@/lib/db/categories";
import { strategyFor } from "@/lib/fulfillment";
import {
  canAddPhotos,
  canCancel,
  lifecycleOf,
  pilotFromLifecycle,
} from "@/lib/status";
import type {
  ApiLifecycle,
  AppointmentWindow,
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
import { getProfile } from "@/lib/db/providers";
import {
  getOrderRow,
  insertOrderRow,
  listHistoryRows,
  listOrderRowsAll,
  listOrderRowsForCustomer,
  listOrderRowsForProvider,
  recordTransition,
  runOrderTx,
  updateOrderCapacityCommit,
  updateOrderStatus,
  type OrderRow,
} from "@/lib/db/orders";
import { getProvider } from "@/server/catalog";
import { addPhoto, photosForOrder } from "@/server/photos";
import { reviewForOrder } from "@/lib/services/reviewService";
import { logger } from "@/lib/logger";
import { ApiError } from "@/server/rules";
import {
  notifyNewOrder,
  notifyStatusChange,
} from "@/lib/services/notificationService";
import { authorizePayment, capturePayment, paymentForOrder, voidPayment } from "@/lib/services/paymentService";
import { holdForOrder } from "@/lib/services/walletService";

export type OrderAction = "accept" | "reject" | "advance" | "deliver";

function nextLifecycleStep(current: ApiLifecycle, packageId: PackageId): ApiLifecycle | null {
  if (current === "accepted") return "dropped_off";
  if (current === "dropped_off") return "washing";
  if (current === "washing") return packageId === "tam" ? "ironing" : "ready";
  if (current === "ironing") return "ready";
  if (current === "ready") return null;
  return null;
}

function deliveryMode(): "door" {
  return "door";
}

function isCustomerViewer(viewer: AuthUser | undefined, row: OrderRow) {
  if (!viewer) return false;
  if (viewer.role === "admin") return false;
  return row.user_id === viewer.id;
}

function assertDeliveryPhoto(orderId: string) {
  const photos = photosForOrder(orderId);
  if (!photos.some((p) => p.kind === "delivery")) {
    throw new ApiError(400, "Teslim için en az bir teslim fotoğrafı gerekli.", "VALIDATION_ERROR");
  }
}

function toOrder(row: OrderRow, viewer?: AuthUser, lean = false): Order {
  const drop = row.drop_method as DropMethod;
  const status = row.status as OrderStatus;
  const pay = paymentForOrder(row.id);
  const payStatus = (pay?.status ?? row.payment_status) as PaymentStatus;
  const items = lean ? [] : listOrderItems(row.id);
  const addons = addonsFromItems(items);
  const size = (row.size ?? items.find((i) => i.kind === "size")?.variant) as LaundrySize;
  return {
    id: row.id,
    providerId: row.provider_id,
    packageId: row.package_id as Order["packageId"],
    size: size ?? "orta",
    confirmedSize: row.confirmed_size,
    addons,
    machineUnits: row.machine_units,
    express: Boolean(row.express),
    drop,
    slot: row.slot,
    pickup: (() => {
      const a = lean ? null : listAppointmentsForOrder(row.id).find((x) => x.kind === "pickup");
      return a ? { date: a.date, windowStart: a.window_start, windowEnd: a.window_end } : null;
    })(),
    delivery: (() => {
      const a = lean ? null : listAppointmentsForOrder(row.id).find((x) => x.kind === "delivery");
      return a ? { date: a.date, windowStart: a.window_start, windowEnd: a.window_end } : null;
    })(),
    respondBy: row.respond_by ?? null,
    note: row.note,
    fulfillmentType: "dropoff",
    total: row.total,
    commission: row.commission,
    status,
    createdAt: row.created_at,
    photos: lean ? [] : photosForOrder(row.id),
    review: lean ? null : reviewForOrder(row.id),
    publicCode: row.public_code ?? null,
    pickupHandoffCode: isCustomerViewer(viewer, row) ? customerHandoffSecrets(row).pickupHandoffCode : null,
    returnHandoffCode: isCustomerViewer(viewer, row) ? customerHandoffSecrets(row).returnHandoffCode : null,
    pickupSummaryApprovedAt: row.pickup_summary_approved_at ?? null,
    adminHold: Boolean(row.admin_hold),
    disputeWindowEnd: row.dispute_window_end ?? null,
    paymentStatus: payStatus,
    paidAt: payStatus === "captured" ? (pay?.updatedAt ?? row.paid_at) : row.paid_at,
    payment: pay,
    customerId: row.user_id,
    lifecycle: lifecycleOf(status, row.lifecycle) as Order["lifecycle"],
    deliveryMode: (row.delivery_mode as "door" | "point" | null) ?? deliveryMode(),
    priceChange: row.price_change ?? "none",
    colorGroups: row.color_groups,
    pickupConfirmedAt: row.pickup_confirmed_at,
    cancelReason: row.cancel_reason,
    estimatedDeliveryDate: row.estimated_delivery_date ?? null,
    promisedDeliveryDate: row.promised_delivery_date ?? null,
    delayCount: row.delay_count ?? 0,
    updatedAt: row.updated_at,
  };
}

/** Şimdilik: giriş yapan herkes tüm siparişleri listelesin / açsın (pilot). */
const PILOT_SEE_ALL_ORDERS = true;

export function isOrderParty(user: AuthUser, row: OrderRow) {
  if (user.role === "admin") return true;
  if (row.user_id === user.id) return true;
  if (row.provider_id === user.id) return true;
  return false;
}

export function canSeeOrder(user: AuthUser, row: OrderRow) {
  if (PILOT_SEE_ALL_ORDERS) return true;
  return isOrderParty(user, row);
}

/** Şimdilik kapalı: PWA masasında siparişi gören (müşteri dahil) kabul/ilerletsin. */
const REQUIRE_PROVIDER_TO_MUTATE = false;

function canMutateOrder(user: AuthUser, row: OrderRow) {
  if (user.role === "admin") return true;
  if (!canSeeOrder(user, row)) return false;
  if (!REQUIRE_PROVIDER_TO_MUTATE) return true;
  return user.role === "provider" && row.provider_id === user.id;
}

export function getOrder(id: string, viewer?: AuthUser): Order | undefined {
  const row = getOrderRow(id);
  return row ? toOrder(row, viewer) : undefined;
}

export function getOrderFor(user: AuthUser, id: string): Order {
  const row = getOrderRow(id);
  if (!row || !canSeeOrder(user, row)) {
    throw new ApiError(404, "Sipariş yok.", "NOT_FOUND");
  }
  return toOrder(row, user);
}

export function listOrdersFor(user: AuthUser): Order[] {
  const asProvider = user.role === "provider" || Boolean(getProfile(user.id));
  const rows =
    user.role === "admin" || PILOT_SEE_ALL_ORDERS
      ? listOrderRowsAll()
      : asProvider
        ? listOrderRowsForProvider(user.id)
        : listOrderRowsForCustomer(user.id);
  return rows.flatMap((row) => {
    try {
      return [toOrder(row, user, true)];
    } catch (e) {
      logger.error({ err: e, orderId: row.id }, "Sipariş satırı okunamadı.");
      return [];
    }
  });
}

export function createOrder(input: CreateOrderInput, userId: string): Order {
  const provider = getProvider(input.providerId);
  if (!provider) throw new ApiError(404, "Hizmet veren bulunamadı.", "NOT_FOUND");
  const cat = getCategoryForProvider(provider.id);
  assertFulfillmentReady(provider.id);

  if (cat.id !== "camasir") {
    throw new ApiError(400, "Bu hizmet alanı şu an kapalı.", "CATEGORY_INACTIVE");
  }
  return createLaundryOrder(input, userId, provider);
}

function validateDrop(provider: NonNullable<ReturnType<typeof getProvider>>, input: CreateOrderInput) {
  if (input.drop !== "kapi" || !provider.drops.includes("kapi")) {
    throw new ApiError(400, "Bu teslimat yöntemi kapalı.", "VALIDATION_ERROR");
  }
}

function validateWindows(providerId: string, input: CreateOrderInput, minDeliveryDate: string) {
  const now = new Date();
  try {
    assertCalendarWindow(providerId, input.pickup, now);
    assertCalendarWindow(providerId, input.delivery, now);
  } catch {
    throw new ApiError(400, "Seçilen pencere müsait değil.", "VALIDATION_ERROR");
  }
  if (input.delivery.date < minDeliveryDate) {
    throw new ApiError(400, "Teslim penceresi işlem süresinden önce olamaz.", "VALIDATION_ERROR");
  }
  if (input.delivery.date < input.pickup.date) {
    throw new ApiError(400, "Teslim alımdan önce teslim olamaz.", "VALIDATION_ERROR");
  }
}

function normalizeAddons(raw?: OrderAddonLine[]) {
  return (raw ?? []).filter((a) => a.qty > 0);
}

function insertPendingOrder(args: {
  providerId: string;
  packageId: string;
  size: LaundrySize;
  addons: OrderAddonLine[];
  express: boolean;
  drop: DropMethod;
  slot: string;
  pickup: AppointmentWindow;
  delivery: AppointmentWindow;
  note: string;
  quote: { total: number; commission: number; machineUnits: number; sizePrice: number };
  userId: string;
  estimatedDeliveryDate: string | null;
  respondBy: string;
}) {
  const now = new Date().toISOString();
  const id = `k-${randomUUID().slice(0, 8)}`;
  runOrderTx(() => {
    holdForOrder(args.userId, id, args.quote.total);
    insertOrderRow({
      id,
      provider_id: args.providerId,
      package_id: args.packageId,
      express: args.express ? 1 : 0,
      drop_method: args.drop,
      slot: args.slot,
      note: args.note,
      total: args.quote.total,
      commission: args.quote.commission,
      status: "onay_bekliyor",
      created_at: now,
      updated_at: now,
      user_id: args.userId,
      delivery_mode: deliveryMode(),
      scheduled_window_start: `${args.pickup.date}T${args.pickup.windowStart}:00+03:00`,
      lifecycle: "pending",
      size: args.size,
      machine_units: args.quote.machineUnits,
      estimated_delivery_date: args.estimatedDeliveryDate,
      respond_by: args.respondBy,
      public_code: generatePublicCode(),
    });
    insertOrderItem({
      order_id: id,
      kind: "size",
      variant: args.size,
      qty: 1,
      unit_price: args.quote.sizePrice,
    });
    for (const a of args.addons) {
      const key = addonKey(a.addon, a.variant);
      const unit = getAddonPrice(args.providerId, a.addon, a.variant);
      if (unit == null) throw new ApiError(400, "Ek fiyatı tanımlı değil.", "VALIDATION_ERROR");
      insertOrderItem({
        order_id: id,
        kind: "addon",
        variant: key,
        qty: a.qty,
        unit_price: unit,
      });
    }
    recordTransition({
      orderId: id,
      fromStatus: null,
      toStatus: "onay_bekliyor",
      fromLifecycle: null,
      toLifecycle: "pending",
      actorId: args.userId,
      actorRole: "customer",
      note: null,
      at: now,
    });
    authorizePayment({
      orderId: id,
      amount: args.quote.total,
      commission: args.quote.commission,
      at: now,
    });
    insertAppointment({
      orderId: id,
      kind: "pickup",
      date: args.pickup.date,
      windowStart: args.pickup.windowStart,
      windowEnd: args.pickup.windowEnd,
      at: now,
    });
    insertAppointment({
      orderId: id,
      kind: "delivery",
      date: args.delivery.date,
      windowStart: args.delivery.windowStart,
      windowEnd: args.delivery.windowEnd,
      at: now,
    });
  });
  return id;
}

function createLaundryOrder(input: CreateOrderInput, userId: string, provider: NonNullable<ReturnType<typeof getProvider>>): Order {
  if (!input.packageId) {
    throw new ApiError(400, "Paket seç.", "VALIDATION_ERROR");
  }

  const pack = provider.packages.find((p) => p.id === input.packageId);
  if (!pack) throw new ApiError(400, "Bu paket bu komşuda yok.", "VALIDATION_ERROR");

  validateDrop(provider, input);
  ensureProviderPriceGrid(provider.id);
  const addons = normalizeAddons(input.addons);
  const express = resolveExpress(provider.express, input.pickup.date);
  const line = scheduleLine({
    packageId: input.packageId,
    machineUnits: 0,
    addons,
    pickupDate: input.pickup.date,
  });
  const quotePreview = quoteForProviderOrder(
    provider.id,
    input.packageId,
    input.size,
    addons,
    express,
  );
  line.machineUnits = quotePreview.machineUnits;
  const plan = planOrder(provider.id, line);
  if (!plan) {
    throw new ApiError(409, "Bu tarihlerde kapasite uygun değil.", "CAPACITY");
  }
  validateWindows(provider.id, input, plan.deliveryDate);
  const quote = quotePreview;
  assertCanServeOrder(provider.id, quote.machineUnits);
  const slot = windowLabel(input.pickup.date, input.pickup.windowStart, input.pickup.windowEnd);
  const createdAt = new Date();
  const respondBy = computeRespondBy(createdAt, listSlots(provider.id, true));

  const id = insertPendingOrder({
    providerId: provider.id,
    packageId: input.packageId,
    size: input.size,
    addons,
    express,
    drop: "kapi",
    slot,
    pickup: input.pickup,
    delivery: input.delivery,
    note: (input.note ?? "").trim().slice(0, 500),
    quote,
    userId,
    estimatedDeliveryDate: plan.deliveryDate,
    respondBy,
  });
  const order = getOrder(id)!;
  notifyNewOrder({
    id,
    provider_id: provider.id,
    user_id: userId,
    machineUnits: quote.machineUnits,
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
  const strat = strategyFor(
    getCategoryForProvider(row.provider_id).fulfillment_mode,
    getCategoryForProvider(row.provider_id).id,
    "dropoff",
  );
  if (!strat.ready) {
    throw new ApiError(409, "Bu hizmet tipi henüz açık değil.", "CATEGORY_NOT_READY");
  }
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

export function completeOrderOverride(user: AuthUser, orderId: string, reason: string) {
  return applyStatus(orderId, user, "completed", undefined, `override:${reason}`, { skipHandoff: true });
}

export function applyStatus(
  id: string,
  user: AuthUser,
  next: ApiLifecycle,
  code?: string,
  note?: string,
  opts?: { skipHandoff?: boolean },
): Order {
  const row = getOrderRow(id);
  if (!row || !canSeeOrder(user, row)) {
    throw new ApiError(404, "Sipariş yok.", "NOT_FOUND");
  }
  const from = currentLifecycle(row);
  const pack = row.package_id as PackageId;
  assertCanMove(row, from, next, pack);
  assertStatusRole(user, row, next);
  if (next === "dropped_off") assertReadyForDroppedOff(row);

  const now = new Date().toISOString();
  if (next === "dropped_off") {
    verifyHandoffPin(row, "pickup", code, user.id, now);
  }
  if (next === "completed" && !opts?.skipHandoff) {
    assertDeliveryPhoto(id);
    verifyHandoffPin(row, "return", code, user.id, now);
  }

  const nextPilot = pilotFromLifecycle(next);
  const capture = next === "completed";
  const voidPay = next === "rejected" || next === "cancelled";

  runOrderTx(() => {
    if (next === "ready") {
      issueReturnHandoffCode(id);
      updateOrderStatus({ id, status: nextPilot, lifecycle: next, updatedAt: now });
    } else if (capture) {
      updateOrderStatus({
        id,
        status: nextPilot,
        lifecycle: next,
        updatedAt: now,
        resetAttempts: true,
        paymentStatus: "captured",
        paidAt: now,
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
    if (voidPay) {
      releaseOrderCapacity(row.provider_id, parseAllocations(row.capacity_allocations));
    }
    if (capture) capturePayment(id, now);
    if (voidPay) voidPayment(id, now);
  });

  notifyStatusChange({
    row,
    from,
    next,
    actorId: user.id,
  });
  return toOrder(getOrderRow(id)!, user);
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
    const items = listOrderItems(id);
    const addons = addonsFromItems(items);
    const line = scheduleLine({
      packageId: row.package_id as PackageId,
      machineUnits: row.machine_units,
      addons,
      pickupDate: getAppointment(row.id, "pickup")?.date ?? row.estimated_delivery_date ?? "",
    });
    const now = new Date().toISOString();
    runOrderTx(() => {
      const { schedule, allocations } = reserveOrderCapacity(row.provider_id, line);
      updateOrderCapacityCommit({
        id,
        promisedDeliveryDate: schedule.deliveryDate,
        allocationsJson: JSON.stringify(allocations),
        updatedAt: now,
      });
    });
    next = "accepted";
  } else if (action === "reject") {
    if (!canCancel(order.status)) {
      throw new ApiError(409, "Bu aşamada iptal yok.", "INVALID_TRANSITION");
    }
    next = currentLifecycle(row) === "pending" ? "rejected" : "cancelled";
  } else if (action === "deliver") {
    if (order.status !== "hazir" || order.adminHold) {
      throw new ApiError(409, "Kod ancak hazır siparişte geçer.", "INVALID_TRANSITION");
    }
    next = "completed";
  } else if (action === "advance") {
    const step = nextLifecycleStep(currentLifecycle(row), order.packageId);
    if (!step) throw new ApiError(409, "Daha ileri durum yok.", "INVALID_TRANSITION");
    if (step === "dropped_off" && !code) {
      throw new ApiError(400, "Alım kodu gerekli.", "VALIDATION_ERROR");
    }
    next = step;
  } else {
    throw new ApiError(400, "Bu sipariş için bu aksiyon yok.", "VALIDATION_ERROR");
  }

  return applyStatus(id, user, next, code);
}

const PHOTO_KINDS: OrderPhotoKind[] = ["dropoff", "pickup", "damage", "delivery"];

function parsePhotoKind(raw?: string): OrderPhotoKind {
  if (!raw) return "dropoff";
  if (PHOTO_KINDS.includes(raw as OrderPhotoKind)) return raw as OrderPhotoKind;
  throw new ApiError(400, "Fotoğraf türü dropoff, pickup veya damage olmalı.", "VALIDATION_ERROR");
}

export function listOrderHistory(user: AuthUser, id: string): OrderStatusEvent[] {
  getOrderFor(user, id);
  return listHistoryRows(id).map((row) => ({
    id: row.id,
    from: row.from_lifecycle || (row.from_status
      ? lifecycleOf(row.from_status as OrderStatus, row.from_lifecycle)
      : null),
    to: row.to_lifecycle || lifecycleOf(row.to_status as OrderStatus, row.to_lifecycle),
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

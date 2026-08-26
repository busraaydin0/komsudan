import { randomInt, randomUUID } from "node:crypto";
import { estimateFor, PIECES_MAX, PIECES_MIN } from "@/lib/pricing";
import { loyaltyRate } from "@/lib/loyalty";
import { canCancel, nextStatus, PICKUP_CODE_LEN, PICKUP_CODE_TRIES, toLifecycle } from "@/lib/status";
import type {
  CreateOrderInput,
  DropMethod,
  Order,
  OrderStatus,
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
  insertOrderEvent,
  insertOrderRow,
  listOrderRowsAll,
  listOrderRowsForCustomer,
  listOrderRowsForProvider,
  rotatePickupCode,
  runOrderTx,
  setPickupCode,
  updateOrderStatus,
  type OrderRow,
} from "@/lib/db/orders";
import { getProvider } from "@/server/catalog";
import { photosForOrder } from "@/server/photos";
import { reviewForOrder } from "@/server/reviews";
import { ApiError } from "@/server/rules";

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
  return {
    id: row.id,
    providerId: row.provider_id,
    packageId: row.package_id as PackageId,
    pieces: row.pieces,
    express: Boolean(row.express),
    drop,
    dropPointId: row.drop_point_id,
    slot: row.slot,
    note: row.note,
    total: row.total,
    commission: row.commission,
    status,
    createdAt: row.created_at,
    photos: photosForOrder(row.id),
    review: reviewForOrder(row.id),
    pickupCode: status === "hazir" ? row.pickup_code : null,
    paymentStatus: (row.payment_status as PaymentStatus) || "authorized",
    paidAt: row.paid_at,
    customerId: row.user_id,
    lifecycle: toLifecycle(status),
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

function canMutateOrder(user: AuthUser, row: OrderRow) {
  if (user.role === "admin") return true;
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
  const pieces = Math.round(input.pieces);
  if (!Number.isFinite(pieces) || pieces < PIECES_MIN || pieces > PIECES_MAX) {
    throw new ApiError(400, `Parça sayısı ${PIECES_MIN}–${PIECES_MAX} olmalı.`, "VALIDATION_ERROR");
  }

  const provider = getProvider(input.providerId);
  if (!provider) throw new ApiError(404, "Hizmet veren bulunamadı.", "NOT_FOUND");

  const pack = provider.packages.find((p) => p.id === input.packageId);
  if (!pack) throw new ApiError(400, "Bu paket bu komşuda yok.", "VALIDATION_ERROR");

  const express = Boolean(input.express) && provider.express;
  if (input.express && !provider.express) {
    throw new ApiError(400, "Bu komşu aynı gün almıyor.", "VALIDATION_ERROR");
  }

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

  const quote = estimateFor(
    provider,
    pieces,
    input.packageId,
    express,
    loyaltyRate(deliveredCount(userId)),
  );
  const now = new Date().toISOString();
  const id = `k-${randomUUID().slice(0, 8)}`;

  runOrderTx(() => {
    const remaining = getRemaining(provider.id);
    if (remaining == null) throw new ApiError(404, "Hizmet veren bulunamadı.", "NOT_FOUND");
    if (remaining < pieces) {
      throw new ApiError(409, `Bugün yalnızca ${remaining} parça yer var.`, "CAPACITY");
    }
    addRemaining(provider.id, -pieces);
    insertOrderRow({
      id,
      provider_id: provider.id,
      package_id: input.packageId,
      pieces,
      express: express ? 1 : 0,
      drop_method: input.drop,
      drop_point_id: dropPointId,
      slot: input.slot,
      note: (input.note ?? "").trim().slice(0, 500),
      total: quote.total,
      commission: quote.commission,
      status: "onay_bekliyor",
      created_at: now,
      updated_at: now,
      user_id: userId,
      price_per_kg_snapshot: quote.perPiece,
      estimated_weight: pieces,
      estimated_price: quote.total,
      delivery_mode: deliveryMode(input.drop),
      scheduled_window_start: input.slot,
    });
    insertOrderEvent(id, null, "onay_bekliyor", now);
  });

  return getOrder(id)!;
}

export function applyOrderAction(id: string, action: OrderAction, user: AuthUser, code?: string): Order {
  const row = getOrderRow(id);
  if (!row) throw new ApiError(404, "Sipariş yok.", "NOT_FOUND");
  if (!canMutateOrder(user, row)) {
    throw new ApiError(403, "Bu siparişi yalnızca hizmet veren ilerletebilir.", "FORBIDDEN");
  }

  const order = toOrder(row);
  const now = new Date().toISOString();
  let next: OrderStatus;
  let capture = false;
  let voidPay = false;
  let issuedCode: string | null = null;

  if (action === "accept") {
    if (order.status !== "onay_bekliyor") {
      throw new ApiError(409, "Bu sipariş kabul edilemez.", "INVALID_TRANSITION");
    }
    next = "teslim_alindi";
  } else if (action === "reject") {
    if (!canCancel(order.status)) {
      throw new ApiError(409, "Bu aşamada iptal yok.", "INVALID_TRANSITION");
    }
    next = "iptal";
    voidPay = true;
  } else if (action === "deliver") {
    if (order.status !== "hazir") {
      throw new ApiError(409, "Kod ancak hazır siparişte geçer.", "INVALID_TRANSITION");
    }
    const entered = digits(code ?? "");
    const expected = row.pickup_code ?? "";
    if (entered.length !== PICKUP_CODE_LEN || entered !== expected) {
      const attempts = (row.code_attempts ?? 0) + 1;
      if (attempts >= PICKUP_CODE_TRIES) {
        rotatePickupCode(id, genCode(), now);
        throw new ApiError(
          409,
          "Beş hatalı deneme. Yeni kod müşteriye gitti (SMS simülasyonu).",
          "INVALID_CODE",
        );
      }
      bumpCodeAttempts(id, attempts, now);
      throw new ApiError(409, `Kod uyuşmadı. Kalan deneme: ${PICKUP_CODE_TRIES - attempts}.`, "INVALID_CODE");
    }
    next = "teslim_edildi";
    capture = true;
  } else {
    const n = nextStatus(order.status, order.packageId);
    if (!n) throw new ApiError(409, "Daha ileri durum yok.", "INVALID_TRANSITION");
    if (n === "teslim_edildi") {
      throw new ApiError(409, "Teslim için müşterinin kodunu gir.", "INVALID_TRANSITION");
    }
    next = n;
    if (next === "hazir") issuedCode = genCode();
  }

  runOrderTx(() => {
    if (issuedCode) {
      updateOrderStatus({ id, status: next, updatedAt: now, pickupCode: issuedCode });
    } else if (capture) {
      updateOrderStatus({
        id,
        status: next,
        updatedAt: now,
        pickupCode: null,
        resetAttempts: true,
        paymentStatus: "captured",
        paidAt: now,
        finalPrice: order.total,
      });
    } else if (voidPay) {
      updateOrderStatus({ id, status: next, updatedAt: now, paymentStatus: "voided" });
    } else {
      updateOrderStatus({ id, status: next, updatedAt: now });
    }
    insertOrderEvent(id, order.status, next, now);
    if (next === "iptal") addRemaining(order.providerId, order.pieces);
  });

  return getOrder(id)!;
}

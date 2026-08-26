import { randomInt, randomUUID } from "node:crypto";
import { estimateFor, PIECES_MAX, PIECES_MIN } from "@/lib/pricing";
import { loyaltyRate } from "@/lib/loyalty";
import { PICKUP_CODE_LEN, PICKUP_CODE_TRIES } from "@/lib/status";
import type {
  CreateOrderInput,
  DropMethod,
  Order,
  OrderStatus,
  PackageId,
  PaymentStatus,
} from "@/lib/types";
import { getDrop, getProvider } from "./catalog";
import { db } from "./db";
import { photosForOrder } from "./photos";
import { reviewForOrder } from "./reviews";
import { ApiError, canCancel, nextStatus } from "./rules";
import { deliveredCount } from "./auth";

type OrderRow = {
  id: string;
  provider_id: string;
  package_id: string;
  pieces: number;
  express: number;
  drop_method: string;
  drop_point_id: string | null;
  slot: string;
  note: string;
  total: number;
  commission: number;
  status: string;
  created_at: string;
  updated_at: string;
  pickup_code: string | null;
  code_attempts: number;
  paid_at: string | null;
  payment_status: string;
  user_id: string | null;
};

function genCode() {
  return randomInt(0, 10 ** PICKUP_CODE_LEN)
    .toString()
    .padStart(PICKUP_CODE_LEN, "0");
}

function digits(raw: string) {
  return raw.replace(/\D/g, "");
}

function ensurePickupCode(row: OrderRow) {
  if (row.status !== "hazir") return;
  if (row.pickup_code) return;
  const code = genCode();
  db().prepare("UPDATE orders SET pickup_code = ? WHERE id = ?").run(code, row.id);
  row.pickup_code = code;
}

function rowToOrder(row: OrderRow): Order {
  ensurePickupCode(row);
  return {
    id: row.id,
    providerId: row.provider_id,
    packageId: row.package_id as PackageId,
    pieces: row.pieces,
    express: Boolean(row.express),
    drop: row.drop_method as DropMethod,
    dropPointId: row.drop_point_id,
    slot: row.slot,
    note: row.note,
    total: row.total,
    commission: row.commission,
    status: row.status as OrderStatus,
    createdAt: row.created_at,
    photos: photosForOrder(row.id),
    review: reviewForOrder(row.id),
    pickupCode: row.status === "hazir" ? row.pickup_code : null,
    paymentStatus: (row.payment_status as PaymentStatus) || "authorized",
    paidAt: row.paid_at,
  };
}

export function listOrders(): Order[] {
  const rows = db()
    .prepare("SELECT * FROM orders ORDER BY created_at DESC")
    .all() as OrderRow[];
  return rows.map(rowToOrder);
}

export function getOrder(id: string): Order | undefined {
  const row = db().prepare("SELECT * FROM orders WHERE id = ?").get(id) as OrderRow | undefined;
  return row ? rowToOrder(row) : undefined;
}

export function createOrder(input: CreateOrderInput, userId: string): Order {
  const pieces = Math.round(input.pieces);
  if (!Number.isFinite(pieces) || pieces < PIECES_MIN || pieces > PIECES_MAX) {
    throw new ApiError(400, `Parça sayısı ${PIECES_MIN}–${PIECES_MAX} olmalı.`);
  }

  const provider = getProvider(input.providerId);
  if (!provider) throw new ApiError(404, "Hizmet veren bulunamadı.");

  const pack = provider.packages.find((p) => p.id === input.packageId);
  if (!pack) throw new ApiError(400, "Bu paket bu komşuda yok.");

  const express = Boolean(input.express) && provider.express;
  if (input.express && !provider.express) {
    throw new ApiError(400, "Bu komşu aynı gün almıyor.");
  }

  if (!provider.drops.includes(input.drop)) {
    throw new ApiError(400, "Bu teslimat yöntemi kapalı.");
  }

  let dropPointId: string | null = null;
  if (input.drop === "nokta") {
    if (!input.dropPointId || !getDrop(input.dropPointId)) {
      throw new ApiError(400, "Nötr nokta seç.");
    }
    dropPointId = input.dropPointId;
  }

  if (!provider.slots.includes(input.slot)) {
    throw new ApiError(400, "Saat dilimi geçersiz.");
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

  const run = db().transaction(() => {
    const remaining = (
      db().prepare("SELECT remaining FROM providers WHERE id = ?").get(provider.id) as {
        remaining: number;
      }
    ).remaining;
    if (remaining < pieces) {
      throw new ApiError(409, `Bugün yalnızca ${remaining} parça yer var.`);
    }
    db()
      .prepare("UPDATE providers SET remaining = remaining - ? WHERE id = ?")
      .run(pieces, provider.id);
    db()
      .prepare(
        `INSERT INTO orders (
          id, provider_id, package_id, pieces, express, drop_method, drop_point_id,
          slot, note, total, commission, status, created_at, updated_at,
          pickup_code, code_attempts, paid_at, payment_status, user_id
        ) VALUES (
          @id, @provider_id, @package_id, @pieces, @express, @drop_method, @drop_point_id,
          @slot, @note, @total, @commission, @status, @created_at, @updated_at,
          NULL, 0, NULL, 'authorized', @user_id
        )`,
      )
      .run({
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
      });
    db()
      .prepare(
        "INSERT INTO order_events (order_id, from_status, to_status, at) VALUES (?, NULL, ?, ?)",
      )
      .run(id, "onay_bekliyor", now);
  });

  run();
  return getOrder(id)!;
}

export type OrderAction = "accept" | "reject" | "advance" | "deliver";

export function applyOrderAction(id: string, action: OrderAction, code?: string): Order {
  const order = getOrder(id);
  if (!order) throw new ApiError(404, "Sipariş yok.");

  const now = new Date().toISOString();
  let next: OrderStatus;
  let capture = false;
  let voidPay = false;
  let issuedCode: string | null = null;

  if (action === "accept") {
    if (order.status !== "onay_bekliyor") throw new ApiError(409, "Bu sipariş kabul edilemez.");
    next = "teslim_alindi";
  } else if (action === "reject") {
    if (!canCancel(order.status)) throw new ApiError(409, "Bu aşamada iptal yok.");
    next = "iptal";
    voidPay = true;
  } else if (action === "deliver") {
    if (order.status !== "hazir") throw new ApiError(409, "Kod ancak hazır siparişte geçer.");
    const entered = digits(code ?? "");
    const row = db().prepare("SELECT pickup_code, code_attempts FROM orders WHERE id = ?").get(id) as {
      pickup_code: string | null;
      code_attempts: number;
    };
    const expected = row.pickup_code ?? "";
    if (entered.length !== PICKUP_CODE_LEN || entered !== expected) {
      const attempts = (row.code_attempts ?? 0) + 1;
      if (attempts >= PICKUP_CODE_TRIES) {
        const fresh = genCode();
        db()
          .prepare("UPDATE orders SET pickup_code = ?, code_attempts = 0, updated_at = ? WHERE id = ?")
          .run(fresh, now, id);
        throw new ApiError(409, "Beş hatalı deneme. Yeni kod müşteriye gitti (SMS simülasyonu).");
      }
      db()
        .prepare("UPDATE orders SET code_attempts = ?, updated_at = ? WHERE id = ?")
        .run(attempts, now, id);
      throw new ApiError(
        409,
        `Kod uyuşmadı. Kalan deneme: ${PICKUP_CODE_TRIES - attempts}.`,
      );
    }
    next = "teslim_edildi";
    capture = true;
  } else {
    const n = nextStatus(order.status, order.packageId);
    if (!n) throw new ApiError(409, "Daha ileri durum yok.");
    if (n === "teslim_edildi") {
      throw new ApiError(409, "Teslim için müşterinin kodunu gir.");
    }
    next = n;
    if (next === "hazir") issuedCode = genCode();
  }

  const run = db().transaction(() => {
    if (issuedCode) {
      db()
        .prepare(
          "UPDATE orders SET status = ?, pickup_code = ?, code_attempts = 0, updated_at = ? WHERE id = ?",
        )
        .run(next, issuedCode, now, id);
    } else if (capture) {
      db()
        .prepare(
          `UPDATE orders SET status = ?, payment_status = 'captured', paid_at = ?, pickup_code = NULL,
           code_attempts = 0, updated_at = ? WHERE id = ?`,
        )
        .run(next, now, now, id);
    } else if (voidPay) {
      db()
        .prepare(
          `UPDATE orders SET status = ?, payment_status = 'voided', pickup_code = NULL, updated_at = ? WHERE id = ?`,
        )
        .run(next, now, id);
    } else {
      db().prepare("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?").run(next, now, id);
    }
    db()
      .prepare(
        "INSERT INTO order_events (order_id, from_status, to_status, at) VALUES (?, ?, ?, ?)",
      )
      .run(id, order.status, next, now);
    if (next === "iptal") {
      db()
        .prepare("UPDATE providers SET remaining = remaining + ? WHERE id = ?")
        .run(order.pieces, order.providerId);
    }
  });
  run();
  return getOrder(id)!;
}

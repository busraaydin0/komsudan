import { randomUUID } from "node:crypto";
import type { AuthUser } from "@/lib/auth/types";
import { getOrderRow } from "@/lib/db/orders";
import {
  getDispute,
  getOpenDisputeForOrder,
  insertDispute,
  listDisputesAll,
  listDisputesForOrder,
  listDisputesForParty,
  resolveDispute as resolveDisputeRow,
  type DisputeOpenerRole,
  type DisputeRow,
} from "@/lib/db/disputes";
import { canSeeOrder } from "@/lib/services/orderService";
import { ApiError } from "@/server/rules";

export type PublicDispute = {
  id: string;
  orderId: string;
  openedBy: string;
  openerRole: DisputeOpenerRole;
  reason: string;
  status: "open" | "resolved";
  createdAt: string;
  resolvedAt: string | null;
};

function toPublic(row: DisputeRow): PublicDispute {
  return {
    id: row.id,
    orderId: row.order_id,
    openedBy: row.opened_by,
    openerRole: row.opener_role,
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  };
}

function requireOrderParty(user: AuthUser, orderId: string) {
  const row = getOrderRow(orderId);
  if (!row || !canSeeOrder(user, row)) {
    throw new ApiError(404, "Sipariş yok.", "NOT_FOUND");
  }
  return row;
}

function openerRoleFor(user: AuthUser, order: { user_id: string | null; provider_id: string }): DisputeOpenerRole {
  if (user.role === "admin") return "admin";
  if (order.provider_id === user.id) return "provider";
  return "customer";
}

export function openDispute(user: AuthUser, orderId: string, reason: string): PublicDispute {
  const order = requireOrderParty(user, orderId);
  if (getOpenDisputeForOrder(orderId)) {
    throw new ApiError(409, "Bu siparişte açık itiraz zaten var.", "CONFLICT");
  }
  const now = new Date().toISOString();
  const row: DisputeRow = {
    id: `d-${randomUUID().slice(0, 10)}`,
    order_id: orderId,
    opened_by: user.id,
    opener_role: openerRoleFor(user, order),
    reason: reason.trim(),
    status: "open",
    created_at: now,
    resolved_at: null,
  };
  insertDispute(row);
  return toPublic(row);
}

export function listDisputesOnOrder(user: AuthUser, orderId: string): PublicDispute[] {
  requireOrderParty(user, orderId);
  return listDisputesForOrder(orderId).map(toPublic);
}

export function listMyDisputes(user: AuthUser): PublicDispute[] {
  const rows = user.role === "admin" ? listDisputesAll() : listDisputesForParty(user.id);
  return rows.map(toPublic);
}

export function resolveDispute(user: AuthUser, id: string): PublicDispute {
  const existing = getDispute(id);
  if (!existing) throw new ApiError(404, "İtiraz yok.", "NOT_FOUND");
  requireOrderParty(user, existing.order_id);
  if (existing.status === "resolved") {
    throw new ApiError(409, "İtiraz zaten kapandı.", "CONFLICT");
  }
  const at = new Date().toISOString();
  if (!resolveDisputeRow(id, at)) {
    throw new ApiError(409, "İtiraz zaten kapandı.", "CONFLICT");
  }
  return toPublic({ ...existing, status: "resolved", resolved_at: at });
}

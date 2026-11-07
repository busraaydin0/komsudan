import { ApiError } from "@/lib/errors";
import {
  getUserById,
  getUserByPhone,
  insertUser,
  setUserRole,
  setUserSuperAdmin,
  type UserRow,
} from "@/lib/db/auth";
import { insertAdminAudit } from "@/lib/db/admin";
import { ensureWalletRow, insertLedger, listRecentLedger } from "@/lib/db/wallets";
import { normalizePhone } from "@/lib/phone";

export const STAFF_ADMIN_KINDS = ["service_admin", "super_admin"] as const;
export type StaffAdminKind = (typeof STAFF_ADMIN_KINDS)[number];

export function isStaffAdminKind(value: string): value is StaffAdminKind {
  return (STAFF_ADMIN_KINDS as readonly string[]).includes(value);
}

function dbRoleFor(kind: StaffAdminKind) {
  return kind === "super_admin" ? ("admin" as const) : ("service_admin" as const);
}

/** Sunucu CLI: kullanıcıyı oluşturur veya rolünü yazar. Rol HTTP ile gelmez. */
export function createOrSetStaffAdmin(
  rawPhone: string,
  rawKind: string,
  actorId = "cli",
): UserRow {
  let phone: string;
  try {
    phone = normalizePhone(rawPhone);
  } catch (e) {
    throw new ApiError(400, e instanceof Error ? e.message : "Geçersiz telefon.", "VALIDATION_ERROR");
  }
  if (!isStaffAdminKind(rawKind)) {
    throw new ApiError(400, "Rol service_admin veya super_admin olmalı.", "VALIDATION_ERROR");
  }

  const now = new Date().toISOString();
  const role = dbRoleFor(rawKind);
  const existing = getUserByPhone(phone);
  const created = !existing;
  const row = existing
    ? setUserRole(existing.id, role)
    : insertUser(phone, role);
  setUserSuperAdmin(row.id, rawKind === "super_admin");
  ensureWalletRow(row.id, now);
  if (listRecentLedger(row.id, 1).length === 0) {
    insertLedger({ userId: row.id, amount: 0, kind: "admin_setup", method: "cli", at: now });
  }
  insertAdminAudit({
    actorId,
    action: created ? "admin_create" : "admin_role_set",
    targetType: "user",
    targetId: row.id,
    reason: `${rawKind} via ${actorId}`,
    at: now,
  });
  return getUserById(row.id)!;
}

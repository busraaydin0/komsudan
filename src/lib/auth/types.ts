import type { Account } from "@/lib/types";
import type { UserRole, UserRow } from "@/lib/db/auth";

export type AuthUser = {
  id: string;
  phone: string;
  name: string;
  fullName: string;
  role: UserRole;
  identityVerified: boolean;
  passkeyEnabled: boolean;
};

export function toAuthUser(row: UserRow): AuthUser {
  const name = row.full_name || row.name;
  return {
    id: row.id,
    phone: row.phone,
    name,
    fullName: name,
    role: row.role === "provider" || row.role === "admin" ? row.role : "customer",
    identityVerified: Boolean(row.identity_verified),
    passkeyEnabled: Boolean(row.passkey_id),
  };
}

export function toAccount(user: AuthUser): Account {
  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    identityVerified: user.identityVerified,
    passkeyEnabled: user.passkeyEnabled,
    role: user.role,
  };
}

export function publicUser(user: AuthUser) {
  return {
    id: user.id,
    phone: user.phone,
    fullName: user.fullName,
    role: user.role,
    identityVerified: user.identityVerified,
    passkeyEnabled: user.passkeyEnabled,
  };
}

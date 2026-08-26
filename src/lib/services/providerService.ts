import { ApiError } from "@/server/rules";
import { PILOT } from "@/lib/data";
import { haversineKm } from "@/lib/geo/distance";
import {
  getProfile,
  insertDrop,
  insertSlot,
  listDrops,
  listPackages,
  listProfilesInBox,
  listSlots,
  updateProfileFields,
  type DropRow,
  type PackageRow,
  type ProfileRow,
  type SlotRow,
} from "@/lib/db/providers";
import type { AuthUser } from "@/lib/auth/types";

export type NearbyQuery = {
  lat?: number;
  lng?: number;
  radius?: number;
};

function toPackage(row: PackageRow) {
  return {
    id: row.id,
    providerId: row.provider_id,
    name: row.name,
    pricePerKg: row.price_per_kg,
    minOrderAmount: row.min_order_amount,
    expressAvailable: Boolean(row.express_available),
    expressSurchargePct: row.express_surcharge_pct,
  };
}

function toDrop(row: DropRow) {
  return {
    id: row.id,
    providerId: row.provider_id,
    label: row.label,
    lat: row.lat,
    lng: row.lng,
  };
}

function toSlot(row: SlotRow) {
  return {
    id: row.id,
    providerId: row.provider_id,
    dayOfWeek: row.day_of_week,
    startTime: row.start_time,
    endTime: row.end_time,
    deliveryMode: row.delivery_mode,
  };
}

function toPublic(row: ProfileRow, origin?: { lat: number; lng: number }) {
  const provider = {
    id: row.user_id,
    fullName: row.full_name,
    bio: row.bio ?? "",
    avatarUrl: row.avatar_url,
    neighborhood: row.neighborhood ?? "",
    lat: row.lat,
    lng: row.lng,
    hasDryer: Boolean(row.has_dryer),
    isFounder: Boolean(row.is_founder),
    verificationStatus: row.verification_status,
    status: row.status,
    ratingAvg: row.rating_avg,
    ratingCount: row.rating_count,
    completedOrders: row.completed_orders,
    commissionRate: row.commission_rate,
    packages: listPackages(row.user_id).map(toPackage),
    dropPoints: listDrops(row.user_id).map(toDrop),
    availability: listSlots(row.user_id).map(toSlot),
    distanceKm: origin
      ? Math.round(haversineKm(origin, { lat: row.lat, lng: row.lng }) * 1000) / 1000
      : undefined,
  };
  return provider;
}

function bbox(lat: number, lng: number, radiusKm: number) {
  const dLat = radiusKm / 111;
  const dLng = radiusKm / (111 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
  return {
    south: lat - dLat,
    north: lat + dLat,
    west: lng - dLng,
    east: lng + dLng,
  };
}

export function listNearby(query: NearbyQuery) {
  const lat = query.lat ?? PILOT.center.lat;
  const lng = query.lng ?? PILOT.center.lng;
  const radius = query.radius ?? PILOT.radiusKm;
  const origin = { lat, lng };
  const rows = listProfilesInBox(bbox(lat, lng, radius));
  return rows
    .map((row) => toPublic(row, origin))
    .filter((p) => (p.distanceKm ?? Infinity) <= radius)
    .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
}

export function getProviderPublic(id: string) {
  const row = getProfile(id);
  if (!row || row.verification_status === "rejected") {
    throw new ApiError(404, "Hizmet veren bulunamadı.", "NOT_FOUND");
  }
  return toPublic(row);
}

export function listProviderPackages(id: string) {
  getProviderPublic(id);
  return listPackages(id).map(toPackage);
}

export function requireProvider(user: AuthUser) {
  if (user.role !== "provider" && user.role !== "admin") {
    throw new ApiError(403, "Bu işlem hizmet veren hesabı ister.", "FORBIDDEN");
  }
  const row = getProfile(user.id);
  if (!row) throw new ApiError(403, "Hizmet veren profilin yok.", "FORBIDDEN");
  return row;
}

export function patchMyProfile(
  user: AuthUser,
  patch: {
    bio?: string;
    lat?: number;
    lng?: number;
    neighborhood?: string;
    hasDryer?: boolean;
    status?: "active" | "paused";
  },
) {
  requireProvider(user);
  const row = updateProfileFields(user.id, patch);
  if (!row) throw new ApiError(404, "Hizmet veren bulunamadı.", "NOT_FOUND");
  return toPublic(row);
}

export function listMyAvailability(user: AuthUser) {
  requireProvider(user);
  return listSlots(user.id).map(toSlot);
}

export function addMyAvailability(
  user: AuthUser,
  input: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    deliveryMode: "door" | "point" | "both";
  },
) {
  requireProvider(user);
  if (input.endTime <= input.startTime) {
    throw new ApiError(400, "Bitiş saati başlangıçtan sonra olmalı.", "VALIDATION_ERROR");
  }
  return toSlot(
    insertSlot({
      providerId: user.id,
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
      deliveryMode: input.deliveryMode,
    }),
  );
}

export function listMyDropPoints(user: AuthUser) {
  requireProvider(user);
  return listDrops(user.id).map(toDrop);
}

export function addMyDropPoint(user: AuthUser, input: { label: string; lat: number; lng: number }) {
  requireProvider(user);
  return toDrop(insertDrop({ providerId: user.id, ...input }));
}

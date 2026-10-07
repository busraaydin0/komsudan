import { ApiError } from "@/server/rules";
import {
  canonicalCategoryId,
  clampPublicCategoryIds,
  isPublicCategoryId,
  type CategoryId,
} from "@/lib/categories/registry";
import { PACKAGES, PILOT } from "@/lib/data";
import { dryingBlurb, hasDryerFrom } from "@/lib/drying";
import { haversineKm } from "@/lib/geo/distance";
import { setUserRole } from "@/lib/db/auth";
import {
  catalogProviderExists,
  countSlots,
  getProfile,
  insertCatalogProvider,
  insertSlot,
  listPackages,
  listProfilesInBox,
  listSlots,
  patchCatalogPayload,
  updateProfileFields,
  upsertPackage,
  upsertProfile,
  deactivateOtherPackages,
  type PackageRow,
  type ProfileRow,
  type SlotRow,
} from "@/lib/db/providers";
import { getCategory } from "@/lib/db/categories";
import { ratingBreakdown, ratingForProvider } from "@/lib/services/reviewService";
import { EXPRESS_BUMP } from "@/lib/pricing";
import type { DropMethod, DryingType, PackageId, Provider, ServicePackage } from "@/lib/types";
import type { AuthUser } from "@/lib/auth/types";

export type NearbyQuery = {
  lat?: number;
  lng?: number;
  radius?: number;
  categoryIds?: string[];
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
  const live = ratingForProvider(row.user_id, {
    rating: row.rating_avg,
    reviews: row.rating_count,
  });
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
    ratingAvg: live.rating,
    ratingCount: live.reviews,
    rating: ratingBreakdown(row.user_id, live),
    completedOrders: row.completed_orders,
    commissionRate: row.commission_rate,
    categoryId: row.category_id ?? "camasir",
    packages: listPackages(row.user_id).map(toPackage),
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
  const rows = listProfilesInBox(bbox(lat, lng, radius), clampPublicCategoryIds(query.categoryIds));
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
  const row = getProfile(user.id);
  if (!row) throw new ApiError(403, "Hizmet veren profilin yok.", "FORBIDDEN");
  if (user.role !== "provider" && user.role !== "admin") {
    setUserRole(user.id, "provider");
  }
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
    dryingType?: DryingType;
    status?: "active" | "paused";
    categoryId?: string;
    express?: boolean;
    drops?: DropMethod[];
    packages?: { id: PackageId; pricePerPiece: number }[];
  },
) {
  const requestedCategoryId = patch.categoryId ? canonicalCategoryId(patch.categoryId) : undefined;
  if (requestedCategoryId && !getCategory(requestedCategoryId)) {
    throw new ApiError(400, "Kategori bulunamadı.", "VALIDATION_ERROR");
  }
  const profile = requireProvider(user);
  const categoryId = requestedCategoryId ?? profile.category_id ?? "camasir";
  if (patch.packages && categoryId !== "camasir") {
    throw new ApiError(400, "Bu alanda çamaşır paketi yok.", "VALIDATION_ERROR");
  }
  if (patch.packages) {
    assertUniquePackages(patch.packages);
  }
  const hasDryer =
    patch.hasDryer ?? (patch.dryingType !== undefined ? hasDryerFrom(patch.dryingType) : undefined);
  const row = updateProfileFields(user.id, {
    ...patch,
    hasDryer,
    ...(requestedCategoryId ? { categoryId: requestedCategoryId } : {}),
  });
  if (!row) throw new ApiError(404, "Hizmet veren bulunamadı.", "NOT_FOUND");

  if (patch.packages) {
    const express = patch.express ?? false;
    for (const pack of patch.packages) {
      const meta = PACKAGES.find((p) => p.id === pack.id)!;
      upsertPackage({
        id: `${user.id}:${pack.id}`,
        provider_id: user.id,
        name: meta.title,
        price_per_kg: pack.pricePerPiece,
        min_order_amount: 0,
        express_available: express ? 1 : 0,
        express_surcharge_pct: express ? EXPRESS_BUMP : 0,
        is_active: 1,
      });
    }
    deactivateOtherPackages(
      user.id,
      patch.packages.map((p) => `${user.id}:${p.id}`),
    );
  }

  const catalogPacks: ServicePackage[] | undefined = patch.packages
    ? patch.packages.map((p) => {
        const meta = PACKAGES.find((x) => x.id === p.id)!;
        return { id: p.id, title: meta.title, blurb: meta.blurb, pricePerPiece: p.pricePerPiece };
      })
    : undefined;
  patchCatalogPayload(user.id, {
    ...(catalogPacks ? { packages: catalogPacks } : {}),
    ...(patch.express !== undefined ? { express: patch.express } : {}),
    ...(patch.drops ? { drops: ["kapi"] as DropMethod[] } : {}),
    ...(patch.dryingType
      ? { dryingType: patch.dryingType, hasDryer: hasDryerFrom(patch.dryingType) }
      : {}),
  });
  return toPublic(row);
}

function assertUniquePackages(packages: { id: PackageId }[]) {
  const ids = new Set(packages.map((p) => p.id));
  if (ids.size !== packages.length) {
    throw new ApiError(400, "Aynı paket iki kez seçilemez.", "VALIDATION_ERROR");
  }
}

const DEFAULT_SLOTS = [
  "Bugün 18:00–19:00",
  "Bugün 19:00–20:00",
  "Yarın 09:00–10:00",
  "Yarın 12:00–13:00",
  "Yarın 18:00–19:00",
];

function ensureDirectoryEntry(
  user: AuthUser,
  input: {
    lat: number;
    lng: number;
    neighborhood: string;
    bio: string;
    hasDryer: boolean;
    categoryId: string;
    packages: ServicePackage[];
    dryingType?: DryingType;
  },
) {
  const neighborhood = input.neighborhood.trim() || PILOT.label;
  if (user.role !== "admin") {
    setUserRole(user.id, "provider");
  }
  const existing = getProfile(user.id);
  const bio = existing?.bio?.trim() ? existing.bio : input.bio;
  if (!existing) {
    upsertProfile({
      userId: user.id,
      bio,
      lat: input.lat,
      lng: input.lng,
      neighborhood,
      hasDryer: input.hasDryer,
      isFounder: false,
      ratingAvg: 0,
      ratingCount: 0,
      avatarUrl: user.avatarUrl,
      categoryId: input.categoryId,
    });
  } else {
    updateProfileFields(user.id, {
      bio,
      lat: input.lat,
      lng: input.lng,
      neighborhood,
      hasDryer: input.hasDryer,
      categoryId: input.categoryId,
    });
  }

  const drops: DropMethod[] = ["kapi"];
  const payload: Provider = {
    id: user.id,
    name: user.name || "Komşu",
    neighborhood,
    loc: { lat: input.lat, lng: input.lng },
    rating: 0,
    reviews: 0,
    packages: input.packages,
    hasDryer: input.hasDryer,
    dryingType: input.dryingType,
    express: false,
    trust: "yeni",
    drops,
    slots: DEFAULT_SLOTS,
    bio,
    avatarUrl: user.avatarUrl,
    workPhotos: [],
    recentReviews: [],
    categoryId: input.categoryId,
  };

  if (!catalogProviderExists(user.id)) {
    insertCatalogProvider({
      id: user.id,
      payload: { ...payload },
      categoryId: input.categoryId,
    });
  } else {
    patchCatalogPayload(user.id, {
      packages: input.packages,
      hasDryer: input.hasDryer,
      dryingType: input.dryingType,
      loc: payload.loc,
      neighborhood,
      bio,
      name: payload.name,
      drops,
      categoryId: input.categoryId,
    });
  }

  if (countSlots(user.id) === 0) {
    for (const day of [1, 2, 3, 4, 5]) {
      insertSlot({
        providerId: user.id,
        dayOfWeek: day,
        startTime: "18:00",
        endTime: "19:00",
        deliveryMode: "door",
      });
      insertSlot({
        providerId: user.id,
        dayOfWeek: day,
        startTime: "19:00",
        endTime: "20:00",
        deliveryMode: "door",
      });
    }
  }
  const row = getProfile(user.id);
  if (!row) throw new ApiError(500, "Profil oluşturulamadı.", "INTERNAL");
  return toPublic(row);
}

export function ensureLaundryOffer(
  user: AuthUser,
  input: {
    dryingType: DryingType;
    packages: { id: PackageId; pricePerPiece: number }[];
    lat: number;
    lng: number;
    neighborhood: string;
  },
) {
  assertUniquePackages(input.packages);
  const catalogPacks: ServicePackage[] = input.packages.map((pack) => {
    const meta = PACKAGES.find((p) => p.id === pack.id);
    if (!meta) throw new ApiError(400, "Paket bulunamadı.", "VALIDATION_ERROR");
    return { id: pack.id, title: meta.title, blurb: meta.blurb, pricePerPiece: pack.pricePerPiece };
  });
  const row = ensureDirectoryEntry(user, {
    lat: input.lat,
    lng: input.lng,
    neighborhood: input.neighborhood,
    bio: dryingBlurb(input.dryingType),
    hasDryer: hasDryerFrom(input.dryingType),
    categoryId: "camasir",
    packages: catalogPacks,
    dryingType: input.dryingType,
  });
  for (const pack of input.packages) {
    const meta = PACKAGES.find((p) => p.id === pack.id)!;
    upsertPackage({
      id: `${user.id}:${pack.id}`,
      provider_id: user.id,
      name: meta.title,
      price_per_kg: pack.pricePerPiece,
      min_order_amount: 0,
      express_available: 0,
      express_surcharge_pct: 0,
      is_active: 1,
    });
  }
  deactivateOtherPackages(
    user.id,
    input.packages.map((p) => `${user.id}:${p.id}`),
  );
  return row;
}

export function ensureServiceOffer(
  user: AuthUser,
  input: {
    categoryId?: CategoryId;
    dryingType?: DryingType;
    packages?: { id: PackageId; pricePerPiece: number }[];
    lat: number;
    lng: number;
    neighborhood: string;
  },
) {
  const categoryId = input.categoryId ?? "camasir";
  if (!isPublicCategoryId(categoryId) || categoryId !== "camasir") {
    throw new ApiError(400, "Bu hizmet alanı şu an kapalı.", "CATEGORY_INACTIVE");
  }
  if (!input.dryingType || !input.packages?.length) {
    throw new ApiError(400, "Çamaşır için kurutma tipi ve paket yaz.", "VALIDATION_ERROR");
  }
  return ensureLaundryOffer(user, {
    dryingType: input.dryingType,
    packages: input.packages,
    lat: input.lat,
    lng: input.lng,
    neighborhood: input.neighborhood,
  });
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


import { ApiError } from "@/server/rules";
import { PACKAGES, PILOT } from "@/lib/data";
import { dryingBlurb, hasDryerFrom } from "@/lib/drying";
import { haversineKm } from "@/lib/geo/distance";
import { setUserRole } from "@/lib/db/auth";
import {
  catalogProviderExists,
  countSlots,
  getProfile,
  insertCatalogProvider,
  insertDrop,
  insertSlot,
  listDrops,
  listPackages,
  listProfilesInBox,
  listSlots,
  patchCatalogPayload,
  updateProfileFields,
  upsertPackage,
  upsertProfile,
  deactivateOtherPackages,
  type DropRow,
  type PackageRow,
  type ProfileRow,
  type SlotRow,
} from "@/lib/db/providers";
import { countProducts, deactivateProduct, insertProduct, listProducts, toPublicProduct, updateProduct, type ProductRow, type ProductWrite } from "@/lib/db/products";
import { getCategory } from "@/lib/db/categories";
import { EXPRESS_BUMP, MIN_ORDER } from "@/lib/pricing";
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

function toProduct(row: ProductRow) {
  return toPublicProduct(row);
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
    categoryId: row.category_id ?? "camasir",
    packages: listPackages(row.user_id).map(toPackage),
    products: listProducts(row.user_id).map(toProduct),
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
  const rows = listProfilesInBox(bbox(lat, lng, radius), query.categoryIds);
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
    dryingType?: DryingType;
    status?: "active" | "paused";
    categoryId?: string;
    express?: boolean;
    drops?: DropMethod[];
    packages?: { id: PackageId; pricePerPiece: number }[];
  },
) {
  if (patch.categoryId && !getCategory(patch.categoryId)) {
    throw new ApiError(400, "Kategori bulunamadı.", "VALIDATION_ERROR");
  }
  const profile = requireProvider(user);
  const categoryId = patch.categoryId ?? profile.category_id ?? "camasir";
  if (patch.packages && categoryId === "davet") {
    throw new ApiError(400, "Davet menüsü ürünlerden oluşur, çamaşır paketi değil.", "VALIDATION_ERROR");
  }
  if (patch.packages) {
    assertUniquePackages(patch.packages);
  }
  const hasDryer =
    patch.hasDryer ?? (patch.dryingType !== undefined ? hasDryerFrom(patch.dryingType) : undefined);
  const row = updateProfileFields(user.id, { ...patch, hasDryer });
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
        min_order_amount: MIN_ORDER,
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
    ...(patch.drops ? { drops: patch.drops } : {}),
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

  const drops: DropMethod[] = ["kapi", "nokta"];
  const payload: Provider = {
    id: user.id,
    name: user.name || "Komşu",
    neighborhood,
    loc: { lat: input.lat, lng: input.lng },
    rating: 0,
    reviews: 0,
    packages: input.packages,
    capacity: 24,
    remaining: 24,
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
      remaining: 24,
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
        deliveryMode: "both",
      });
      insertSlot({
        providerId: user.id,
        dayOfWeek: day,
        startTime: "19:00",
        endTime: "20:00",
        deliveryMode: "both",
      });
    }
  }
  if (listDrops(user.id).length === 0) {
    insertDrop({
      providerId: user.id,
      label: neighborhood,
      lat: input.lat,
      lng: input.lng,
    });
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
      min_order_amount: MIN_ORDER,
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

export function ensureDavetOffer(
  user: AuthUser,
  input: { lat: number; lng: number; neighborhood: string },
) {
  return ensureDirectoryEntry(user, {
    lat: input.lat,
    lng: input.lng,
    neighborhood: input.neighborhood,
    bio: "Davet ikramlık. Menünü Hizmet’ten ekle.",
    hasDryer: false,
    categoryId: "davet",
    packages: [],
  });
}

export function ensureServiceOffer(
  user: AuthUser,
  input: {
    categoryId?: "camasir" | "davet";
    dryingType?: DryingType;
    packages?: { id: PackageId; pricePerPiece: number }[];
    lat: number;
    lng: number;
    neighborhood: string;
  },
) {
  const categoryId = input.categoryId ?? "camasir";
  if (categoryId === "davet") {
    return ensureDavetOffer(user, input);
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

export function listMyDropPoints(user: AuthUser) {
  requireProvider(user);
  return listDrops(user.id).map(toDrop);
}

export function addMyDropPoint(user: AuthUser, input: { label: string; lat: number; lng: number }) {
  requireProvider(user);
  return toDrop(insertDrop({ providerId: user.id, ...input }));
}

const MAX_PRODUCTS = 12;

function assertProductWrite(input: ProductWrite) {
  const min = input.minOrder ?? 1;
  const max = input.maxQty;
  if (max != null && max < min) {
    throw new ApiError(400, "Maksimum, minimum siparişten küçük olamaz.", "VALIDATION_ERROR");
  }
}

export function listMyProducts(user: AuthUser) {
  requireProvider(user);
  return listProducts(user.id, false).map(toPublicProduct);
}

export function addMyProduct(user: AuthUser, input: ProductWrite) {
  const row = requireProvider(user);
  if ((row.category_id ?? "camasir") !== "davet") {
    throw new ApiError(400, "Ürün yalnızca Davet hizmetinde. Kategorini Davet yap.", "VALIDATION_ERROR");
  }
  assertProductWrite(input);
  if (countProducts(user.id, false) >= MAX_PRODUCTS) {
    throw new ApiError(400, `En fazla ${MAX_PRODUCTS} ürün.`, "VALIDATION_ERROR");
  }
  return toPublicProduct(
    insertProduct(user.id, {
      ...input,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      allergens: input.allergens?.trim() || null,
    }),
  );
}

export function patchMyProduct(user: AuthUser, productId: string, input: ProductWrite) {
  requireProvider(user);
  assertProductWrite(input);
  const row = updateProduct(productId, user.id, {
    ...input,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    allergens: input.allergens?.trim() || null,
  });
  if (!row) throw new ApiError(404, "Ürün bulunamadı.", "NOT_FOUND");
  return toPublicProduct(row);
}

export function removeMyProduct(user: AuthUser, productId: string) {
  requireProvider(user);
  if (!deactivateProduct(productId, user.id)) {
    throw new ApiError(404, "Ürün bulunamadı.", "NOT_FOUND");
  }
  return { ok: true as const };
}

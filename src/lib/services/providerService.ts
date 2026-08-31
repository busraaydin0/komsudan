import { ApiError } from "@/server/rules";
import { CATEGORIES, isCatalogCategoryId, type CatalogCategoryId, type CategoryId } from "@/lib/categories/registry";
import { lockRepairSubtype } from "@/lib/repair";
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
import {
  countServices,
  deactivateService,
  insertService,
  listServices,
  toPublicService,
  updateService,
  type ServiceWrite,
} from "@/lib/db/services";
import {
  countRepairs,
  deactivateRepair,
  insertRepair,
  listRepairs,
  toPublicRepair,
  updateRepair,
  type RepairWrite,
} from "@/lib/db/repairs";
import {
  countTechs,
  deactivateTech,
  insertTech,
  listTechs,
  toPublicTech,
  updateTech,
  type TechWrite,
} from "@/lib/db/tech";
import {
  countWashes,
  deactivateWash,
  insertWash,
  listWashes,
  toPublicWash,
  updateWash,
  type WashWrite,
} from "@/lib/db/washes";
import {
  countCouriers,
  deactivateCourier,
  insertCourier,
  listCouriers,
  toPublicCourier,
  updateCourier,
  type CourierWrite,
} from "@/lib/db/couriers";
import {
  countGardens,
  deactivateGarden,
  insertGarden,
  listGardens,
  toPublicGarden,
  updateGarden,
  type GardenWrite,
} from "@/lib/db/gardens";
import {
  countCargos,
  deactivateCargo,
  insertCargo,
  listCargos,
  toPublicCargo,
  updateCargo,
  type CargoWrite,
} from "@/lib/db/cargos";
import {
  countPrints,
  deactivatePrint,
  insertPrint,
  listPrints,
  toPublicPrint,
  updatePrint,
  type PrintWrite,
} from "@/lib/db/prints";
import {
  countPreserves,
  deactivatePreserve,
  insertPreserve,
  listPreserves,
  toPublicPreserve,
  updatePreserve,
  type PreserveWrite,
} from "@/lib/db/preserves";
import {
  countCarpets,
  deactivateCarpet,
  insertCarpet,
  listCarpets,
  toPublicCarpet,
  updateCarpet,
  type CarpetWrite,
} from "@/lib/db/carpets";
import {
  countLessons,
  deactivateLesson,
  insertLesson,
  listLessons,
  toPublicLesson,
  updateLesson,
  type LessonWrite,
} from "@/lib/db/lessons";
import {
  countTalks,
  deactivateTalk,
  insertTalk,
  listTalks,
  toPublicTalk,
  updateTalk,
  type TalkWrite,
} from "@/lib/db/talks";
import {
  countGraves,
  deactivateGrave,
  insertGrave,
  listGraves,
  toPublicGrave,
  updateGrave,
  type GraveWrite,
} from "@/lib/db/graves";
import { getCategory } from "@/lib/db/categories";
import { ratingBreakdown, ratingForProvider } from "@/lib/services/reviewService";
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
    products: listProducts(row.user_id).map(toProduct),
    services: listServices(row.user_id).map(toPublicService),
    repairs: listRepairs(row.user_id).map(toPublicRepair),
    techs: listTechs(row.user_id).map(toPublicTech),
    washes: listWashes(row.user_id).map(toPublicWash),
    couriers: listCouriers(row.user_id).map(toPublicCourier),
    gardens: listGardens(row.user_id).map(toPublicGarden),
    cargos: listCargos(row.user_id).map(toPublicCargo),
    prints: listPrints(row.user_id).map(toPublicPrint),
    preserves: listPreserves(row.user_id).map(toPublicPreserve),
    carpets: listCarpets(row.user_id).map(toPublicCarpet),
    lessons: listLessons(row.user_id).map(toPublicLesson),
    talks: listTalks(row.user_id).map(toPublicTalk),
    graves: listGraves(row.user_id).map(toPublicGrave),
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
  if (patch.packages && isCatalogCategoryId(categoryId)) {
    throw new ApiError(400, "Bu alanda çamaşır paketi yok. Hizmetlerini Hizmet’ten ekle.", "VALIDATION_ERROR");
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

function ensureCatalogOffer(
  user: AuthUser,
  input: { lat: number; lng: number; neighborhood: string },
  categoryId: CatalogCategoryId,
) {
  return ensureDirectoryEntry(user, {
    lat: input.lat,
    lng: input.lng,
    neighborhood: input.neighborhood,
    bio: CATEGORIES[categoryId].offerBio,
    hasDryer: false,
    categoryId,
    packages: [],
  });
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
  if (isCatalogCategoryId(categoryId)) {
    return ensureCatalogOffer(user, input, categoryId);
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

const MAX_SERVICES = 12;

function assertServiceWrite(input: ServiceWrite) {
  const min = input.minOrder ?? 1;
  const max = input.maxPerWeek;
  if (max != null && max < min) {
    throw new ApiError(400, "Haftalık kapasite, minimum siparişten küçük olamaz.", "VALIDATION_ERROR");
  }
  const d = input.delivery;
  if (d && !d.adres && !d.nokta && !d.yakin) {
    throw new ApiError(400, "En az bir teslim yöntemi seç.", "VALIDATION_ERROR");
  }
}

export function listMyServices(user: AuthUser) {
  requireProvider(user);
  return listServices(user.id, false).map(toPublicService);
}

export function addMyService(user: AuthUser, input: ServiceWrite) {
  const row = requireProvider(user);
  if ((row.category_id ?? "camasir") !== "dikis") {
    throw new ApiError(400, "Hizmet kartı yalnızca Dikiş & Tadilat’ta.", "VALIDATION_ERROR");
  }
  assertServiceWrite(input);
  if (countServices(user.id, false) >= MAX_SERVICES) {
    throw new ApiError(400, `En fazla ${MAX_SERVICES} hizmet.`, "VALIDATION_ERROR");
  }
  return toPublicService(
    insertService(user.id, {
      ...input,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      notes: input.notes?.trim() || null,
    }),
  );
}

export function patchMyService(user: AuthUser, serviceId: string, input: ServiceWrite) {
  requireProvider(user);
  assertServiceWrite(input);
  const row = updateService(serviceId, user.id, {
    ...input,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    notes: input.notes?.trim() || null,
  });
  if (!row) throw new ApiError(404, "Hizmet bulunamadı.", "NOT_FOUND");
  return toPublicService(row);
}

export function removeMyService(user: AuthUser, serviceId: string) {
  requireProvider(user);
  if (!deactivateService(serviceId, user.id)) {
    throw new ApiError(404, "Hizmet bulunamadı.", "NOT_FOUND");
  }
  return { ok: true as const };
}

const MAX_REPAIRS = 12;

function assertRepairWrite(input: RepairWrite) {
  const locked = lockRepairSubtype(input);
  const type = locked.priceType ?? "sabit";
  if (type !== "inceleme" && input.price < 1) {
    throw new ApiError(400, "Sabit veya başlangıç fiyatı 1 ₺ ve üzeri olsun.", "VALIDATION_ERROR");
  }
  if (locked.kind === "musluk") return;
  const d = input.delivery;
  if (d && !d.adres && !d.nokta && !d.yakin) {
    throw new ApiError(400, "En az bir teslim yöntemi seç.", "VALIDATION_ERROR");
  }
}

export function listMyRepairs(user: AuthUser) {
  requireProvider(user);
  return listRepairs(user.id, false).map(toPublicRepair);
}

export function addMyRepair(user: AuthUser, input: RepairWrite) {
  const row = requireProvider(user);
  if ((row.category_id ?? "camasir") !== "tamir") {
    throw new ApiError(400, "Tamir kartı yalnızca Tamir alanında.", "VALIDATION_ERROR");
  }
  assertRepairWrite(input);
  if (countRepairs(user.id, false) >= MAX_REPAIRS) {
    throw new ApiError(400, `En fazla ${MAX_REPAIRS} hizmet.`, "VALIDATION_ERROR");
  }
  return toPublicRepair(
    insertRepair(user.id, {
      ...input,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      item: input.item?.trim() || null,
      notes: input.notes?.trim() || null,
      workHours: input.workHours?.trim() || null,
    }),
  );
}

export function patchMyRepair(user: AuthUser, repairId: string, input: RepairWrite) {
  requireProvider(user);
  assertRepairWrite(input);
  const row = updateRepair(repairId, user.id, {
    ...input,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    item: input.item?.trim() || null,
    notes: input.notes?.trim() || null,
    workHours: input.workHours?.trim() || null,
  });
  if (!row) throw new ApiError(404, "Hizmet bulunamadı.", "NOT_FOUND");
  return toPublicRepair(row);
}

export function removeMyRepair(user: AuthUser, repairId: string) {
  requireProvider(user);
  if (!deactivateRepair(repairId, user.id)) {
    throw new ApiError(404, "Hizmet bulunamadı.", "NOT_FOUND");
  }
  return { ok: true as const };
}

const MAX_TECHS = 12;

function assertTechWrite(input: TechWrite) {
  const type = input.priceType ?? "sabit";
  if (type !== "inceleme" && input.price < 1) {
    throw new ApiError(400, "Sabit veya başlangıç fiyatı 1 ₺ ve üzeri olsun.", "VALIDATION_ERROR");
  }
  const d = input.delivery;
  if (d && !d.adres && !d.nokta && !d.yakin && !d.yerinde) {
    throw new ApiError(400, "En az bir teslim yöntemi seç.", "VALIDATION_ERROR");
  }
}

export function listMyTechs(user: AuthUser) {
  requireProvider(user);
  return listTechs(user.id, false).map(toPublicTech);
}

export function addMyTech(user: AuthUser, input: TechWrite) {
  const row = requireProvider(user);
  if ((row.category_id ?? "camasir") !== "teknoloji") {
    throw new ApiError(400, "Teknoloji kartı yalnızca Teknoloji alanında.", "VALIDATION_ERROR");
  }
  assertTechWrite(input);
  if (countTechs(user.id, false) >= MAX_TECHS) {
    throw new ApiError(400, `En fazla ${MAX_TECHS} hizmet.`, "VALIDATION_ERROR");
  }
  return toPublicTech(
    insertTech(user.id, {
      ...input,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      item: input.item?.trim() || null,
      platform: input.platform?.trim() || null,
      notes: input.notes?.trim() || null,
      workHours: input.workHours?.trim() || null,
    }),
  );
}

export function patchMyTech(user: AuthUser, techId: string, input: TechWrite) {
  requireProvider(user);
  assertTechWrite(input);
  const row = updateTech(techId, user.id, {
    ...input,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    item: input.item?.trim() || null,
    platform: input.platform?.trim() || null,
    notes: input.notes?.trim() || null,
    workHours: input.workHours?.trim() || null,
  });
  if (!row) throw new ApiError(404, "Hizmet bulunamadı.", "NOT_FOUND");
  return toPublicTech(row);
}

export function removeMyTech(user: AuthUser, techId: string) {
  requireProvider(user);
  if (!deactivateTech(techId, user.id)) {
    throw new ApiError(404, "Hizmet bulunamadı.", "NOT_FOUND");
  }
  return { ok: true as const };
}

const MAX_WASHES = 12;

function assertWashWrite(input: WashWrite) {
  if (input.price < 1) {
    throw new ApiError(400, "Fiyat 1 ₺ ve üzeri olsun.", "VALIDATION_ERROR");
  }
  const i = input.includes;
  if (i && !i.dis && !i.supurme && !i.cam && !i.torpido && !i.jant && !i.kurulama) {
    throw new ApiError(400, "En az bir dahil kalem seç.", "VALIDATION_ERROR");
  }
}

export function listMyWashes(user: AuthUser) {
  requireProvider(user);
  return listWashes(user.id, false).map(toPublicWash);
}

export function addMyWash(user: AuthUser, input: WashWrite) {
  const row = requireProvider(user);
  if ((row.category_id ?? "camasir") !== "araba") {
    throw new ApiError(400, "Yıkama kartı yalnızca Araba Yıkama alanında.", "VALIDATION_ERROR");
  }
  assertWashWrite(input);
  if (countWashes(user.id, false) >= MAX_WASHES) {
    throw new ApiError(400, `En fazla ${MAX_WASHES} hizmet.`, "VALIDATION_ERROR");
  }
  return toPublicWash(
    insertWash(user.id, {
      ...input,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      location: input.location?.trim() || null,
      notes: input.notes?.trim() || null,
      workHours: input.workHours?.trim() || null,
    }),
  );
}

export function patchMyWash(user: AuthUser, washId: string, input: WashWrite) {
  requireProvider(user);
  assertWashWrite(input);
  const row = updateWash(washId, user.id, {
    ...input,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    location: input.location?.trim() || null,
    notes: input.notes?.trim() || null,
    workHours: input.workHours?.trim() || null,
  });
  if (!row) throw new ApiError(404, "Hizmet bulunamadı.", "NOT_FOUND");
  return toPublicWash(row);
}

export function removeMyWash(user: AuthUser, washId: string) {
  requireProvider(user);
  if (!deactivateWash(washId, user.id)) {
    throw new ApiError(404, "Hizmet bulunamadı.", "NOT_FOUND");
  }
  return { ok: true as const };
}

const MAX_COURIERS = 12;

function assertCourierWrite(input: CourierWrite) {
  if (input.price < 1) {
    throw new ApiError(400, "Fiyat 1 ₺ ve üzeri olsun.", "VALIDATION_ERROR");
  }
  const t = input.transport;
  if (t && !t.yaya && !t.bisiklet && !t.ebike && !t.motor) {
    throw new ApiError(400, "En az bir ulaşım türü seç.", "VALIDATION_ERROR");
  }
  const s = input.sizes;
  if (s && !s.kucuk && !s.orta && !s.buyuk) {
    throw new ApiError(400, "En az bir paket boyutu seç.", "VALIDATION_ERROR");
  }
  const r = input.routes;
  if (r && !r.adresAdres && !r.noktaAdres && !r.noktaNokta) {
    throw new ApiError(400, "En az bir teslimat şekli seç.", "VALIDATION_ERROR");
  }
  const c = input.carry;
  if (c && !c.evrak && !c.paket && !c.kiyafet && !c.anahtar && !c.hediye && !c.kisisel && !c.diger) {
    throw new ApiError(400, "En az bir taşınabilir paket türü seç.", "VALIDATION_ERROR");
  }
  if (c?.diger && !input.carryOther?.trim()) {
    throw new ApiError(400, "Diğer paket türünü yaz.", "VALIDATION_ERROR");
  }
  const k = input.confirm;
  if (k && !k.kod && !k.app) {
    throw new ApiError(400, "En az bir teslim onayı seç.", "VALIDATION_ERROR");
  }
}

export function listMyCouriers(user: AuthUser) {
  requireProvider(user);
  return listCouriers(user.id, false).map(toPublicCourier);
}

export function addMyCourier(user: AuthUser, input: CourierWrite) {
  const row = requireProvider(user);
  if ((row.category_id ?? "camasir") !== "kurye") {
    throw new ApiError(400, "Kurye kartı yalnızca Yakın Mesafe Kurye alanında.", "VALIDATION_ERROR");
  }
  assertCourierWrite(input);
  if (countCouriers(user.id, false) >= MAX_COURIERS) {
    throw new ApiError(400, `En fazla ${MAX_COURIERS} hizmet.`, "VALIDATION_ERROR");
  }
  return toPublicCourier(
    insertCourier(user.id, {
      ...input,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      region: input.region?.trim() || null,
      notes: input.notes?.trim() || null,
      workHours: input.workHours?.trim() || null,
      refuse: input.refuse?.trim() || null,
      carryOther: input.carryOther?.trim() || null,
    }),
  );
}

export function patchMyCourier(user: AuthUser, courierId: string, input: CourierWrite) {
  requireProvider(user);
  assertCourierWrite(input);
  const row = updateCourier(courierId, user.id, {
    ...input,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    region: input.region?.trim() || null,
    notes: input.notes?.trim() || null,
    workHours: input.workHours?.trim() || null,
    refuse: input.refuse?.trim() || null,
    carryOther: input.carryOther?.trim() || null,
  });
  if (!row) throw new ApiError(404, "Hizmet bulunamadı.", "NOT_FOUND");
  return toPublicCourier(row);
}

export function removeMyCourier(user: AuthUser, courierId: string) {
  requireProvider(user);
  if (!deactivateCourier(courierId, user.id)) {
    throw new ApiError(404, "Hizmet bulunamadı.", "NOT_FOUND");
  }
  return { ok: true as const };
}

const MAX_GARDENS = 12;

function assertGardenWrite(input: GardenWrite) {
  if (input.price < 1) {
    throw new ApiError(400, "Fiyat 1 ₺ ve üzeri olsun.", "VALIDATION_ERROR");
  }
  const j = input.jobs;
  if (
    j &&
    !j.cim &&
    !j.budama &&
    !j.ot &&
    !j.yaprak &&
    !j.dikim &&
    !j.saksi &&
    !j.tasima &&
    !j.sulama &&
    !j.duzen &&
    !j.diger
  ) {
    throw new ApiError(400, "En az bir hizmet türü seç.", "VALIDATION_ERROR");
  }
  const a = input.areas;
  if (a && !a.kucuk && !a.orta && !a.buyuk) {
    throw new ApiError(400, "En az bir alan / iş boyutu seç.", "VALIDATION_ERROR");
  }
}

export function listMyGardens(user: AuthUser) {
  requireProvider(user);
  return listGardens(user.id, false).map(toPublicGarden);
}

export function addMyGarden(user: AuthUser, input: GardenWrite) {
  const row = requireProvider(user);
  if ((row.category_id ?? "camasir") !== "bahce") {
    throw new ApiError(400, "Bahçe kartı yalnızca Bahçe & Bitki alanında.", "VALIDATION_ERROR");
  }
  assertGardenWrite(input);
  if (countGardens(user.id, false) >= MAX_GARDENS) {
    throw new ApiError(400, `En fazla ${MAX_GARDENS} hizmet.`, "VALIDATION_ERROR");
  }
  return toPublicGarden(
    insertGarden(user.id, {
      ...input,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      location: input.location?.trim() || null,
      notes: input.notes?.trim() || null,
      workHours: input.workHours?.trim() || null,
      canDo: input.canDo?.trim() || null,
      cannotDo: input.cannotDo?.trim() || null,
    }),
  );
}

export function patchMyGarden(user: AuthUser, gardenId: string, input: GardenWrite) {
  requireProvider(user);
  assertGardenWrite(input);
  const row = updateGarden(gardenId, user.id, {
    ...input,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    location: input.location?.trim() || null,
    notes: input.notes?.trim() || null,
    workHours: input.workHours?.trim() || null,
    canDo: input.canDo?.trim() || null,
    cannotDo: input.cannotDo?.trim() || null,
  });
  if (!row) throw new ApiError(404, "Hizmet bulunamadı.", "NOT_FOUND");
  return toPublicGarden(row);
}

export function removeMyGarden(user: AuthUser, gardenId: string) {
  requireProvider(user);
  if (!deactivateGarden(gardenId, user.id)) {
    throw new ApiError(404, "Hizmet bulunamadı.", "NOT_FOUND");
  }
  return { ok: true as const };
}

const MAX_CARGOS = 12;

function assertCargoWrite(input: CargoWrite) {
  if (input.price < 1) {
    throw new ApiError(400, "Fiyat 1 ₺ ve üzeri olsun.", "VALIDATION_ERROR");
  }
  const j = input.jobs;
  if (j && !j.subeAl && !j.subeBirak && !j.noktaNokta && !j.alNokta && !j.teslimSube) {
    throw new ApiError(400, "En az bir hizmet türü seç.", "VALIDATION_ERROR");
  }
  const s = input.sizes;
  if (s && !s.kucuk && !s.orta && !s.buyuk) {
    throw new ApiError(400, "En az bir paket boyutu seç.", "VALIDATION_ERROR");
  }
  const p = input.pickup;
  if (p && !p.sube && !p.adres && !p.nokta) {
    throw new ApiError(400, "En az bir teslim alma yöntemi seç.", "VALIDATION_ERROR");
  }
  const d = input.dropoff;
  if (d && !d.sube && !d.adres && !d.nokta) {
    throw new ApiError(400, "En az bir teslim etme yöntemi seç.", "VALIDATION_ERROR");
  }
  const k = input.confirm;
  if (k && !k.kod && !k.app) {
    throw new ApiError(400, "En az bir teslim doğrulama seç.", "VALIDATION_ERROR");
  }
}

export function listMyCargos(user: AuthUser) {
  requireProvider(user);
  return listCargos(user.id, false).map(toPublicCargo);
}

export function addMyCargo(user: AuthUser, input: CargoWrite) {
  const row = requireProvider(user);
  if ((row.category_id ?? "camasir") !== "kargo") {
    throw new ApiError(400, "Kargo kartı yalnızca Kargo & Paket alanında.", "VALIDATION_ERROR");
  }
  assertCargoWrite(input);
  if (countCargos(user.id, false) >= MAX_CARGOS) {
    throw new ApiError(400, `En fazla ${MAX_CARGOS} hizmet.`, "VALIDATION_ERROR");
  }
  return toPublicCargo(
    insertCargo(user.id, {
      ...input,
      name: input.name.trim(),
      branches: input.branches?.trim() || null,
      points: input.points?.trim() || null,
      workHours: input.workHours?.trim() || null,
      refuse: input.refuse?.trim() || null,
      notes: input.notes?.trim() || null,
    }),
  );
}

export function patchMyCargo(user: AuthUser, cargoId: string, input: CargoWrite) {
  requireProvider(user);
  assertCargoWrite(input);
  const row = updateCargo(cargoId, user.id, {
    ...input,
    name: input.name.trim(),
    branches: input.branches?.trim() || null,
    points: input.points?.trim() || null,
    workHours: input.workHours?.trim() || null,
    refuse: input.refuse?.trim() || null,
    notes: input.notes?.trim() || null,
  });
  if (!row) throw new ApiError(404, "Hizmet bulunamadı.", "NOT_FOUND");
  return toPublicCargo(row);
}

export function removeMyCargo(user: AuthUser, cargoId: string) {
  requireProvider(user);
  if (!deactivateCargo(cargoId, user.id)) {
    throw new ApiError(404, "Hizmet bulunamadı.", "NOT_FOUND");
  }
  return { ok: true as const };
}

const MAX_PRINTS = 12;

function assertPrintWrite(input: PrintWrite) {
  if (input.price < 1) {
    throw new ApiError(400, "Sayfa ücreti 1 ₺ ve üzeri olsun.", "VALIDATION_ERROR");
  }
  const c = input.colors;
  if (c && !c.bw && !c.color) {
    throw new ApiError(400, "En az bir baskı türü seç.", "VALIDATION_ERROR");
  }
  const p = input.paper;
  if (p && !p.a4) {
    throw new ApiError(400, "Kağıt boyutu seç.", "VALIDATION_ERROR");
  }
  const s = input.sides;
  if (s && !s.tek && !s.cift) {
    throw new ApiError(400, "En az bir baskı yüzü seç.", "VALIDATION_ERROR");
  }
  const f = input.files;
  if (f && !f.pdf && !f.word && !f.image && !f.other) {
    throw new ApiError(400, "En az bir dosya türü seç.", "VALIDATION_ERROR");
  }
  const g = input.send;
  if (g && !g.app && !g.email && !g.other) {
    throw new ApiError(400, "En az bir dosya gönderme yöntemi seç.", "VALIDATION_ERROR");
  }
  const k = input.pickup;
  if (k && !k.adres && !k.nokta) {
    throw new ApiError(400, "En az bir teslim alma yöntemi seç.", "VALIDATION_ERROR");
  }
}

export function listMyPrints(user: AuthUser) {
  requireProvider(user);
  return listPrints(user.id, false).map(toPublicPrint);
}

export function addMyPrint(user: AuthUser, input: PrintWrite) {
  const row = requireProvider(user);
  if ((row.category_id ?? "camasir") !== "cikti") {
    throw new ApiError(400, "Çıktı kartı yalnızca Evde Çıktı Alma alanında.", "VALIDATION_ERROR");
  }
  assertPrintWrite(input);
  if (countPrints(user.id, false) >= MAX_PRINTS) {
    throw new ApiError(400, `En fazla ${MAX_PRINTS} hizmet.`, "VALIDATION_ERROR");
  }
  return toPublicPrint(
    insertPrint(user.id, {
      ...input,
      name: input.name.trim(),
      workHours: input.workHours?.trim() || null,
      notes: input.notes?.trim() || null,
    }),
  );
}

export function patchMyPrint(user: AuthUser, printId: string, input: PrintWrite) {
  requireProvider(user);
  assertPrintWrite(input);
  const row = updatePrint(printId, user.id, {
    ...input,
    name: input.name.trim(),
    workHours: input.workHours?.trim() || null,
    notes: input.notes?.trim() || null,
  });
  if (!row) throw new ApiError(404, "Hizmet bulunamadı.", "NOT_FOUND");
  return toPublicPrint(row);
}

export function removeMyPrint(user: AuthUser, printId: string) {
  requireProvider(user);
  if (!deactivatePrint(printId, user.id)) {
    throw new ApiError(404, "Hizmet bulunamadı.", "NOT_FOUND");
  }
  return { ok: true as const };
}

const MAX_PRESERVES = 12;

function assertPreserveWrite(input: PreserveWrite) {
  if (input.price < 1) {
    throw new ApiError(400, "Fiyat 1 ₺ ve üzeri olsun.", "VALIDATION_ERROR");
  }
  const k = input.kinds;
  if (k && !k.salca && !k.tarhana && !k.eriste && !k.manti && !k.sarma && !k.dondurucu && !k.other) {
    throw new ApiError(400, "En az bir hazırlık türü seç.", "VALIDATION_ERROR");
  }
  const s = input.storage;
  if (s && !s.frozen && !s.fresh && !s.dried && !s.jarred) {
    throw new ApiError(400, "En az bir saklama / teslim durumu seç.", "VALIDATION_ERROR");
  }
  const p = input.pickup;
  if (p && !p.adres && !p.nokta) {
    throw new ApiError(400, "En az bir teslim alma yöntemi seç.", "VALIDATION_ERROR");
  }
}

export function listMyPreserves(user: AuthUser) {
  requireProvider(user);
  return listPreserves(user.id, false).map(toPublicPreserve);
}

export function addMyPreserve(user: AuthUser, input: PreserveWrite) {
  const row = requireProvider(user);
  if ((row.category_id ?? "camasir") !== "kislik") {
    throw new ApiError(400, "Kışlık kartı yalnızca Kışlık & Dondurucu Hazırlığı alanında.", "VALIDATION_ERROR");
  }
  assertPreserveWrite(input);
  if (countPreserves(user.id, false) >= MAX_PRESERVES) {
    throw new ApiError(400, `En fazla ${MAX_PRESERVES} hizmet.`, "VALIDATION_ERROR");
  }
  return toPublicPreserve(
    insertPreserve(user.id, {
      ...input,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      portion: input.portion?.trim() || null,
      ingredients: input.ingredients?.trim() || null,
      season: input.season?.trim() || null,
      allergens: input.allergens?.trim() || null,
      notes: input.notes?.trim() || null,
    }),
  );
}

export function patchMyPreserve(user: AuthUser, preserveId: string, input: PreserveWrite) {
  requireProvider(user);
  assertPreserveWrite(input);
  const row = updatePreserve(preserveId, user.id, {
    ...input,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    portion: input.portion?.trim() || null,
    ingredients: input.ingredients?.trim() || null,
    season: input.season?.trim() || null,
    allergens: input.allergens?.trim() || null,
    notes: input.notes?.trim() || null,
  });
  if (!row) throw new ApiError(404, "Hizmet bulunamadı.", "NOT_FOUND");
  return toPublicPreserve(row);
}

export function removeMyPreserve(user: AuthUser, preserveId: string) {
  requireProvider(user);
  if (!deactivatePreserve(preserveId, user.id)) {
    throw new ApiError(404, "Hizmet bulunamadı.", "NOT_FOUND");
  }
  return { ok: true as const };
}

const MAX_CARPETS = 12;

function assertCarpetWrite(input: CarpetWrite) {
  if (input.price < 1) {
    throw new ApiError(400, "Fiyat 1 ₺ ve üzeri olsun.", "VALIDATION_ERROR");
  }
  const k = input.kinds;
  if (k && !k.hali && !k.kilim && !k.yolluk && !k.other) {
    throw new ApiError(400, "En az bir hizmet türü seç.", "VALIDATION_ERROR");
  }
  const s = input.sizes;
  if (s && !s.kucuk && !s.orta && !s.buyuk && !s.xl) {
    throw new ApiError(400, "En az bir halı boyutu seç.", "VALIDATION_ERROR");
  }
  const c = input.cleans;
  if (c && !c.genel && !c.leke && !c.koku && !c.ozel) {
    throw new ApiError(400, "En az bir temizlik türü seç.", "VALIDATION_ERROR");
  }
  const p = input.pickup;
  if (p && !p.adres && !p.nokta) {
    throw new ApiError(400, "En az bir teslim alma yöntemi seç.", "VALIDATION_ERROR");
  }
}

export function listMyCarpets(user: AuthUser) {
  requireProvider(user);
  return listCarpets(user.id, false).map(toPublicCarpet);
}

export function addMyCarpet(user: AuthUser, input: CarpetWrite) {
  const row = requireProvider(user);
  if ((row.category_id ?? "camasir") !== "hali") {
    throw new ApiError(400, "Halı kartı yalnızca Halı Yıkama alanında.", "VALIDATION_ERROR");
  }
  assertCarpetWrite(input);
  if (countCarpets(user.id, false) >= MAX_CARPETS) {
    throw new ApiError(400, `En fazla ${MAX_CARPETS} hizmet.`, "VALIDATION_ERROR");
  }
  return toPublicCarpet(
    insertCarpet(user.id, {
      ...input,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      readyAt: input.readyAt?.trim() || null,
      products: input.products?.trim() || null,
      notes: input.notes?.trim() || null,
    }),
  );
}

export function patchMyCarpet(user: AuthUser, carpetId: string, input: CarpetWrite) {
  requireProvider(user);
  assertCarpetWrite(input);
  const row = updateCarpet(carpetId, user.id, {
    ...input,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    readyAt: input.readyAt?.trim() || null,
    products: input.products?.trim() || null,
    notes: input.notes?.trim() || null,
  });
  if (!row) throw new ApiError(404, "Hizmet bulunamadı.", "NOT_FOUND");
  return toPublicCarpet(row);
}

export function removeMyCarpet(user: AuthUser, carpetId: string) {
  requireProvider(user);
  if (!deactivateCarpet(carpetId, user.id)) {
    throw new ApiError(404, "Hizmet bulunamadı.", "NOT_FOUND");
  }
  return { ok: true as const };
}

const MAX_LESSONS = 12;

function assertLessonWrite(input: LessonWrite) {
  if (input.price < 1) {
    throw new ApiError(400, "Fiyat 1 ₺ ve üzeri olsun.", "VALIDATION_ERROR");
  }
  const k = input.kinds;
  if (k && !k.takip && !k.okuma && !k.eslik && !k.tekrar && !k.sinav && !k.other) {
    throw new ApiError(400, "En az bir hizmet türü seç.", "VALIDATION_ERROR");
  }
  const l = input.levels;
  if (l && !l.ilkokul && !l.ortaokul && !l.lise) {
    throw new ApiError(400, "En az bir eğitim seviyesi seç.", "VALIDATION_ERROR");
  }
  const s = input.subjects;
  if (s && !s.turkce && !s.matematik && !s.fen && !s.sosyal && !s.ingilizce && !s.all && !s.other) {
    throw new ApiError(400, "En az bir ders / alan seç.", "VALIDATION_ERROR");
  }
  if (s?.other && !input.subjectOther?.trim()) {
    throw new ApiError(400, "Diğer dersi yaz.", "VALIDATION_ERROR");
  }
  const d = input.durations;
  if (d && !d.m30 && !d.m45 && !d.m60 && !d.m90) {
    throw new ApiError(400, "En az bir ders süresi seç.", "VALIDATION_ERROR");
  }
  const p = input.place;
  if (p && !p.ev && !p.ortak && !p.online) {
    throw new ApiError(400, "En az bir ders yeri seç.", "VALIDATION_ERROR");
  }
  const m = input.materials;
  if (m && !m.student && !m.provider && !m.none) {
    throw new ApiError(400, "En az bir malzeme seçeneği seç.", "VALIDATION_ERROR");
  }
}

export function listMyLessons(user: AuthUser) {
  requireProvider(user);
  return listLessons(user.id, false).map(toPublicLesson);
}

export function addMyLesson(user: AuthUser, input: LessonWrite) {
  const row = requireProvider(user);
  if ((row.category_id ?? "camasir") !== "odev") {
    throw new ApiError(400, "Ödev kartı yalnızca İlkokul / Ortaokul Ödev Eşliği alanında.", "VALIDATION_ERROR");
  }
  assertLessonWrite(input);
  if (countLessons(user.id, false) >= MAX_LESSONS) {
    throw new ApiError(400, `En fazla ${MAX_LESSONS} hizmet.`, "VALIDATION_ERROR");
  }
  return toPublicLesson(
    insertLesson(user.id, {
      ...input,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      subjectOther: input.subjectOther?.trim() || null,
      notes: input.notes?.trim() || null,
    }),
  );
}

export function patchMyLesson(user: AuthUser, lessonId: string, input: LessonWrite) {
  requireProvider(user);
  assertLessonWrite(input);
  const row = updateLesson(lessonId, user.id, {
    ...input,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    subjectOther: input.subjectOther?.trim() || null,
    notes: input.notes?.trim() || null,
  });
  if (!row) throw new ApiError(404, "Hizmet bulunamadı.", "NOT_FOUND");
  return toPublicLesson(row);
}

export function removeMyLesson(user: AuthUser, lessonId: string) {
  requireProvider(user);
  if (!deactivateLesson(lessonId, user.id)) {
    throw new ApiError(404, "Hizmet bulunamadı.", "NOT_FOUND");
  }
  return { ok: true as const };
}

const MAX_TALKS = 12;

function assertTalkWrite(input: TalkWrite) {
  if (input.price < 1) {
    throw new ApiError(400, "Fiyat 1 ₺ ve üzeri olsun.", "VALIDATION_ERROR");
  }
  const l = input.langs;
  if (l && !l.en && !l.de && !l.es && !l.fr && !l.it && !l.ar && !l.other) {
    throw new ApiError(400, "En az bir dil seç.", "VALIDATION_ERROR");
  }
  if (l?.other && !input.langOther?.trim()) {
    throw new ApiError(400, "Diğer dili yaz.", "VALIDATION_ERROR");
  }
  const k = input.kinds;
  if (k && !k.speaking && !k.chat && !k.beginner && !k.vocab && !k.pronun && !k.grammar && !k.exam) {
    throw new ApiError(400, "En az bir hizmet türü seç.", "VALIDATION_ERROR");
  }
  const lv = input.levels;
  if (lv && !lv.a1 && !lv.a2 && !lv.b) {
    throw new ApiError(400, "En az bir seviye seç.", "VALIDATION_ERROR");
  }
  const d = input.durations;
  if (d && !d.m30 && !d.m45 && !d.m60) {
    throw new ApiError(400, "En az bir süre seç.", "VALIDATION_ERROR");
  }
  const p = input.place;
  if (p && !p.ev && !p.ortak && !p.online) {
    throw new ApiError(400, "En az bir görüşme yeri seç.", "VALIDATION_ERROR");
  }
  const m = input.materials;
  if (m && !m.provider && !m.student && !m.together) {
    throw new ApiError(400, "En az bir materyal seçeneği seç.", "VALIDATION_ERROR");
  }
}

export function listMyTalks(user: AuthUser) {
  requireProvider(user);
  return listTalks(user.id, false).map(toPublicTalk);
}

export function addMyTalk(user: AuthUser, input: TalkWrite) {
  const row = requireProvider(user);
  if ((row.category_id ?? "camasir") !== "dil") {
    throw new ApiError(400, "Dil kartı yalnızca Yabancı Dil Pratiği alanında.", "VALIDATION_ERROR");
  }
  assertTalkWrite(input);
  if (countTalks(user.id, false) >= MAX_TALKS) {
    throw new ApiError(400, `En fazla ${MAX_TALKS} hizmet.`, "VALIDATION_ERROR");
  }
  return toPublicTalk(
    insertTalk(user.id, {
      ...input,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      langOther: input.langOther?.trim() || null,
      notes: input.notes?.trim() || null,
    }),
  );
}

export function patchMyTalk(user: AuthUser, talkId: string, input: TalkWrite) {
  requireProvider(user);
  assertTalkWrite(input);
  const row = updateTalk(talkId, user.id, {
    ...input,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    langOther: input.langOther?.trim() || null,
    notes: input.notes?.trim() || null,
  });
  if (!row) throw new ApiError(404, "Hizmet bulunamadı.", "NOT_FOUND");
  return toPublicTalk(row);
}

export function removeMyTalk(user: AuthUser, talkId: string) {
  requireProvider(user);
  if (!deactivateTalk(talkId, user.id)) {
    throw new ApiError(404, "Hizmet bulunamadı.", "NOT_FOUND");
  }
  return { ok: true as const };
}

const MAX_GRAVES = 12;

function anyGraveFlag(obj?: Record<string, boolean> | null) {
  return Boolean(obj && Object.values(obj).some(Boolean));
}

function assertGraveWrite(input: GraveWrite) {
  if (input.kinds && !anyGraveFlag(input.kinds)) {
    throw new ApiError(400, "En az bir hizmet türü seç.", "VALIDATION_ERROR");
  }
  const cemetery = input.cemetery?.trim() ?? "";
  if (cemetery.length < 2) {
    throw new ApiError(400, "Mezarlık / bölge yaz.", "VALIDATION_ERROR");
  }
  if (input.radiusKm != null && (!Number.isInteger(input.radiusKm) || input.radiusKm < 1 || input.radiusKm > 50)) {
    throw new ApiError(400, "Hizmet alanı 1–50 km.", "VALIDATION_ERROR");
  }
  if (input.pricing && !anyGraveFlag(input.pricing)) {
    throw new ApiError(400, "En az bir fiyatlandırma seç.", "VALIDATION_ERROR");
  }
  if (input.flowers && !anyGraveFlag(input.flowers)) {
    throw new ApiError(400, "Çiçek / bitki seçeneği seç.", "VALIDATION_ERROR");
  }
  if (input.fees && !anyGraveFlag(input.fees)) {
    throw new ApiError(400, "Çiçek / malzeme ücretini seç.", "VALIDATION_ERROR");
  }
  if (
    input.durationMin != null &&
    (!Number.isInteger(input.durationMin) || input.durationMin < 1 || input.durationMin > 480)
  ) {
    throw new ApiError(400, "Süre 1–480 dakika.", "VALIDATION_ERROR");
  }
  if (input.photos && !anyGraveFlag(input.photos)) {
    throw new ApiError(400, "Fotoğraf gönderme seçeneği seç.", "VALIDATION_ERROR");
  }
  if (input.avails && !anyGraveFlag(input.avails)) {
    throw new ApiError(400, "En az bir müsaitlik seç.", "VALIDATION_ERROR");
  }
}

export function listMyGraves(user: AuthUser) {
  requireProvider(user);
  return listGraves(user.id, false).map(toPublicGrave);
}

export function addMyGrave(user: AuthUser, input: GraveWrite) {
  const row = requireProvider(user);
  if ((row.category_id ?? "camasir") !== "mezar") {
    throw new ApiError(400, "Mezar kartı yalnızca Mezar Bakımı & Çiçeklendirme alanında.", "VALIDATION_ERROR");
  }
  assertGraveWrite(input);
  if (countGraves(user.id, false) >= MAX_GRAVES) {
    throw new ApiError(400, `En fazla ${MAX_GRAVES} hizmet.`, "VALIDATION_ERROR");
  }
  return toPublicGrave(
    insertGrave(user.id, {
      ...input,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      cemetery: input.cemetery?.trim() || null,
      workHours: input.workHours?.trim() || null,
      notes: input.notes?.trim() || null,
    }),
  );
}

export function patchMyGrave(user: AuthUser, graveId: string, input: GraveWrite) {
  requireProvider(user);
  assertGraveWrite(input);
  const row = updateGrave(graveId, user.id, {
    ...input,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    cemetery: input.cemetery?.trim() || null,
    workHours: input.workHours?.trim() || null,
    notes: input.notes?.trim() || null,
  });
  if (!row) throw new ApiError(404, "Hizmet bulunamadı.", "NOT_FOUND");
  return toPublicGrave(row);
}

export function removeMyGrave(user: AuthUser, graveId: string) {
  requireProvider(user);
  if (!deactivateGrave(graveId, user.id)) {
    throw new ApiError(404, "Hizmet bulunamadı.", "NOT_FOUND");
  }
  return { ok: true as const };
}

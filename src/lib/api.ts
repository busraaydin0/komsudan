"use client";

import { useCallback, useEffect, useState } from "react";
import type { Account, AppNotification, CreateOrderInput, DropPoint, Order, Provider, ProviderCourier, ProviderProduct, ProviderRepair, ProviderService, ProviderTech, ProviderWash, Review, WorkPhoto } from "./types";
import type { Loyalty } from "./loyalty";

export type Catalog = {
  providers: Provider[];
  dropPoints: DropPoint[];
};

function errorMessage(data: { error?: unknown }) {
  if (typeof data.error === "string") return data.error;
  if (data.error && typeof data.error === "object" && "message" in data.error) {
    const message = (data.error as { message: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "İstek başarısız.";
}

async function readJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: unknown };
  if (!res.ok) throw new Error(errorMessage(data));
  return data;
}

function unwrap<T>(data: { data?: T } & Partial<T>): T {
  return (data.data ?? data) as T;
}

export function useCatalog(categoryIds?: string[]) {
  const [catalog, setCatalog] = useState<Catalog>({ providers: [], dropPoints: [] });
  const [ready, setReady] = useState(false);
  const filterKey = (categoryIds ?? []).join(",");

  const reload = useCallback(async () => {
    const qs = filterKey ? `?category_id=${encodeURIComponent(filterKey)}` : "";
    const data = await readJson<Catalog>(await fetch(`/api/catalog${qs}`));
    setCatalog({ providers: data.providers, dropPoints: data.dropPoints });
    setReady(true);
  }, [filterKey]);

  useEffect(() => {
    void reload();
    const t = setInterval(() => void reload(), 2500);
    return () => clearInterval(t);
  }, [reload]);

  return { ...catalog, ready, reload };
}

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    try {
      const data = unwrap(await readJson<{ data?: { orders: Order[] }; orders?: Order[] }>(await fetch("/api/orders")));
      setOrders(data.orders ?? []);
      setReady(true);
    } catch {
      setOrders([]);
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void reload();
    const t = setInterval(() => void reload(), 2500);
    return () => clearInterval(t);
  }, [reload]);

  return { orders, ready, reload };
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    try {
      const data = unwrap(
        await readJson<{
          data?: { notifications: AppNotification[]; unread: number };
          notifications?: AppNotification[];
          unread?: number;
        }>(await fetch("/api/notifications")),
      );
      setNotifications(data.notifications ?? []);
      setUnread(data.unread ?? 0);
      setReady(true);
    } catch {
      setNotifications([]);
      setUnread(0);
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void reload();
    const t = setInterval(() => void reload(), 2500);
    return () => clearInterval(t);
  }, [reload]);

  return { notifications, unread, ready, reload };
}

export async function markNotificationRead(id: string) {
  const data = unwrap(
    await readJson<{
      data?: { notifications: AppNotification[]; unread: number };
      notifications?: AppNotification[];
      unread?: number;
    }>(
      await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      }),
    ),
  );
  return { notifications: data.notifications ?? [], unread: data.unread ?? 0 };
}

export async function markAllNotificationsRead() {
  const data = unwrap(
    await readJson<{
      data?: { notifications: AppNotification[]; unread: number };
      notifications?: AppNotification[];
      unread?: number;
    }>(await fetch("/api/notifications/read-all", { method: "POST" })),
  );
  return { notifications: data.notifications ?? [], unread: data.unread ?? 0 };
}

export async function postOrder(input: CreateOrderInput) {
  const data = unwrap(
    await readJson<{ data?: { order: Order }; order?: Order }>(
      await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    ),
  );
  return data.order!;
}

export async function patchOrder(
  id: string,
  action: "accept" | "reject" | "advance" | "deliver",
  code?: string,
) {
  const data = unwrap(
    await readJson<{ data?: { order: Order }; order?: Order }>(
      await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, code }),
      }),
    ),
  );
  return data.order!;
}

export function useSession() {
  const [account, setAccount] = useState<Account | null>(null);
  const [loyalty, setLoyalty] = useState<Loyalty | null>(null);
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    try {
      const data = await readJson<{ account: Account | null; loyalty: Loyalty | null }>(
        await fetch("/api/auth/session", { signal: AbortSignal.timeout(8000) }),
      );
      setAccount(data.account);
      setLoyalty(data.loyalty);
    } catch {
      setAccount(null);
      setLoyalty(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { account, loyalty, ready, reload };
}

export async function requestOtp(phone: string) {
  return readJson<{ ok: boolean; sms: string; demoCode: string }>(
    await fetch("/api/auth/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    }),
  );
}

export async function verifyOtp(phone: string, code: string) {
  const data = await readJson<{ account: Account }>(
    await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code }),
    }),
  );
  return data.account;
}

export async function patchAccount(body: { name: string; identity?: boolean }) {
  return readJson<{ account: Account; loyalty: Loyalty }>(
    await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

export async function postPasskey(credentialId: string, assert = false) {
  return readJson<{ account: Account; loyalty: Loyalty }>(
    await fetch("/api/auth/passkey", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credentialId, assert }),
    }),
  );
}

export async function logoutSession() {
  await readJson<{ ok: boolean }>(await fetch("/api/auth/session", { method: "DELETE" }));
}

export async function deleteMyAccount() {
  await readJson<{ data?: { ok: boolean }; ok?: boolean }>(await fetch("/api/me", { method: "DELETE" }));
}

export async function fetchMyPhotos() {
  const data = await readJson<{ data: { photos: WorkPhoto[] } }>(await fetch("/api/me/photos"));
  return data.data.photos;
}

export async function uploadMyPhoto(file: File) {
  const body = new FormData();
  body.append("file", file);
  const data = await readJson<{ data: { photo: WorkPhoto; photos: WorkPhoto[] } }>(
    await fetch("/api/me/photos", { method: "POST", body }),
  );
  return data.data;
}

export async function deleteMyPhoto(id: string) {
  const data = await readJson<{ data: { photos: WorkPhoto[] } }>(
    await fetch(`/api/me/photos/${id}`, { method: "DELETE" }),
  );
  return data.data.photos;
}

export async function uploadMyAvatar(file: File) {
  const body = new FormData();
  body.append("file", file);
  const data = await readJson<{ data: { avatarUrl: string } }>(
    await fetch("/api/me/avatar", { method: "POST", body }),
  );
  return data.data.avatarUrl;
}

export async function uploadOrderPhoto(orderId: string, file: File) {
  const body = new FormData();
  body.append("file", file);
  const data = unwrap(
    await readJson<{ data?: { photo: WorkPhoto }; photo?: WorkPhoto }>(
      await fetch(`/api/orders/${orderId}/photos`, { method: "POST", body }),
    ),
  );
  return data.photo!;
}

export async function uploadPortfolioPhoto(providerId: string, file: File) {
  const body = new FormData();
  body.append("file", file);
  const data = await readJson<{ photo: WorkPhoto; photos: WorkPhoto[] }>(
    await fetch(`/api/providers/${providerId}/photos`, { method: "POST", body }),
  );
  return data;
}

export async function postReview(orderId: string, input: { rating: number; body: string; files: File[] }) {
  const body = new FormData();
  body.append("rating", String(input.rating));
  body.append("body", input.body);
  for (const file of input.files) body.append("file", file);
  const data = await readJson<{ review: Review }>(
    await fetch(`/api/orders/${orderId}/review`, { method: "POST", body }),
  );
  return data.review;
}

export type ServiceCategory = {
  id: string;
  name: string;
  icon: string;
  blurb: string;
  fulfillmentMode: string;
  pricingModel: string;
};

export async function fetchCategories() {
  const data = unwrap(
    await readJson<{ data?: { categories: ServiceCategory[] }; categories?: ServiceCategory[] }>(
      await fetch("/api/categories"),
    ),
  );
  return data.categories ?? [];
}

export async function patchPreferences(body: {
  intent?: "seek" | "offer" | "both" | null;
  categoryIds?: string[];
  homeLat?: number | null;
  homeLng?: number | null;
  homeNeighborhood?: string | null;
  completed?: boolean;
  skipped?: boolean;
}) {
  await readJson(
    await fetch("/api/me/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

export async function fetchMyProvider() {
  const data = unwrap(
    await readJson<{ data?: { provider: Record<string, unknown> }; provider?: Record<string, unknown> }>(
      await fetch("/api/providers/me/profile"),
    ),
  );
  return data.provider!;
}

export async function patchMyProviderProfile(body: {
  bio?: string;
  lat?: number;
  lng?: number;
  neighborhood?: string;
  hasDryer?: boolean;
  dryingType?: "makine" | "ip" | "ikisi";
  status?: "active" | "paused";
  categoryId?: string;
  express?: boolean;
  drops?: ("kapi" | "nokta")[];
  packages?: { id: "yikama" | "katlama" | "tam"; pricePerPiece: number }[];
}) {
  const data = unwrap(
    await readJson<{ data?: { provider: Record<string, unknown> }; provider?: Record<string, unknown> }>(
      await fetch("/api/providers/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    ),
  );
  return data.provider!;
}

export async function postMyOffer(body: {
  categoryId: "camasir" | "davet" | "dikis" | "tamir" | "teknoloji" | "araba" | "kurye";
  dryingType?: "makine" | "ip" | "ikisi";
  packages?: { id: "yikama" | "katlama" | "tam"; pricePerPiece: number }[];
  lat: number;
  lng: number;
  neighborhood: string;
}) {
  const data = unwrap(
    await readJson<{ data?: { provider: Record<string, unknown> }; provider?: Record<string, unknown> }>(
      await fetch("/api/providers/me/offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    ),
  );
  return data.provider!;
}

export async function postMyAvailability(body: {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  deliveryMode: "door" | "point" | "both";
}) {
  await readJson(
    await fetch("/api/providers/me/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

export async function postMyDropPoint(body: { label: string; lat: number; lng: number }) {
  await readJson(
    await fetch("/api/providers/me/drop-points", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

export async function postMyProduct(body: {
  name: string;
  pricePerPerson: number;
  description?: string | null;
  foodCategory?: "kisir" | "pasta" | "kurabiye" | "borek" | "salata" | "tatli" | "diger" | null;
  priceUnit?: "porsiyon" | "kg" | "adet" | "tepsi" | "kisi";
  minOrder?: number;
  maxQty?: number | null;
  leadHours?: number | null;
  delivery?: "kapi" | "nokta" | "ikisi";
  allergens?: string | null;
  isActive?: boolean;
}) {
  const data = unwrap(
    await readJson<{ data?: { product: ProviderProduct }; product?: ProviderProduct }>(
      await fetch("/api/providers/me/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    ),
  );
  return data.product!;
}

export async function fetchMyProducts() {
  const data = unwrap(
    await readJson<{ data?: { products: ProviderProduct[] }; products?: ProviderProduct[] }>(
      await fetch("/api/providers/me/products"),
    ),
  );
  return data.products ?? [];
}

export async function patchMyProduct(id: string, body: Parameters<typeof postMyProduct>[0]) {
  const data = unwrap(
    await readJson<{ data?: { product: ProviderProduct }; product?: ProviderProduct }>(
      await fetch(`/api/providers/me/products/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    ),
  );
  return data.product!;
}

export async function uploadMyProductPhoto(id: string, file: File) {
  const body = new FormData();
  body.append("file", file);
  const data = unwrap(
    await readJson<{ data?: { photoUrl: string; product: ProviderProduct }; photoUrl?: string; product?: ProviderProduct }>(
      await fetch(`/api/providers/me/products/${encodeURIComponent(id)}/photo`, { method: "POST", body }),
    ),
  );
  return data;
}

export async function deleteMyProduct(id: string) {
  await readJson(
    await fetch(`/api/providers/me/products/${encodeURIComponent(id)}`, { method: "DELETE" }),
  );
}

export async function postMyService(body: {
  name: string;
  description?: string | null;
  subcategory?: "kiyafet" | "tamir" | "ozel" | "tekstil" | "diger";
  price: number;
  priceUnit?: "adet" | "cift" | "metre" | "kg" | "parca" | "saat" | "proje";
  minOrder?: number;
  leadDays?: number | null;
  maxPerWeek?: number | null;
  delivery?: { adres: boolean; nokta: boolean; yakin: boolean };
  workRadiusKm?: number | null;
  notes?: string | null;
  material?: "customer" | "provider" | "either";
  isActive?: boolean;
}) {
  const data = unwrap(
    await readJson<{ data?: { service: ProviderService }; service?: ProviderService }>(
      await fetch("/api/providers/me/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    ),
  );
  return data.service!;
}

export async function fetchMyServices() {
  const data = unwrap(
    await readJson<{ data?: { services: ProviderService[] }; services?: ProviderService[] }>(
      await fetch("/api/providers/me/services"),
    ),
  );
  return data.services ?? [];
}

export async function patchMyService(id: string, body: Parameters<typeof postMyService>[0]) {
  const data = unwrap(
    await readJson<{ data?: { service: ProviderService }; service?: ProviderService }>(
      await fetch(`/api/providers/me/services/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    ),
  );
  return data.service!;
}

export async function uploadMyServicePhoto(id: string, file: File) {
  const body = new FormData();
  body.append("file", file);
  const data = unwrap(
    await readJson<{ data?: { photoUrl: string; service: ProviderService }; photoUrl?: string; service?: ProviderService }>(
      await fetch(`/api/providers/me/services/${encodeURIComponent(id)}/photo`, { method: "POST", body }),
    ),
  );
  return data;
}

export async function deleteMyService(id: string) {
  await readJson(
    await fetch(`/api/providers/me/services/${encodeURIComponent(id)}`, { method: "DELETE" }),
  );
}

export async function postMyRepair(body: {
  name: string;
  description?: string | null;
  kind?: "elektronik" | "ev" | "mobilya" | "bisiklet" | "oyuncak" | "aksesuar" | "diger";
  item?: string | null;
  job?: "onarim" | "parca" | "montaj" | "bakim" | "temizlik" | "diger";
  price: number;
  priceType?: "sabit" | "baslangic" | "inceleme";
  priceUnit?: "adet" | "parca" | "urun" | "saat" | "is";
  parts?: "included" | "extra" | "customer" | "either";
  leadDays?: number | null;
  maxPerWeek?: number | null;
  delivery?: { adres: boolean; nokta: boolean; yakin: boolean };
  workRadiusKm?: number | null;
  inspectRequired?: boolean;
  quoteFrom?: "photo" | "seen";
  warrantyDays?: number | null;
  notes?: string | null;
  workHours?: string | null;
  isActive?: boolean;
}) {
  const data = unwrap(
    await readJson<{ data?: { repair: ProviderRepair }; repair?: ProviderRepair }>(
      await fetch("/api/providers/me/repairs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    ),
  );
  return data.repair!;
}

export async function fetchMyRepairs() {
  const data = unwrap(
    await readJson<{ data?: { repairs: ProviderRepair[] }; repairs?: ProviderRepair[] }>(
      await fetch("/api/providers/me/repairs"),
    ),
  );
  return data.repairs ?? [];
}

export async function patchMyRepair(id: string, body: Parameters<typeof postMyRepair>[0]) {
  const data = unwrap(
    await readJson<{ data?: { repair: ProviderRepair }; repair?: ProviderRepair }>(
      await fetch(`/api/providers/me/repairs/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    ),
  );
  return data.repair!;
}

export async function uploadMyRepairPhoto(id: string, file: File) {
  const body = new FormData();
  body.append("file", file);
  const data = unwrap(
    await readJson<{ data?: { photoUrl: string; repair: ProviderRepair }; photoUrl?: string; repair?: ProviderRepair }>(
      await fetch(`/api/providers/me/repairs/${encodeURIComponent(id)}/photo`, { method: "POST", body }),
    ),
  );
  return data;
}

export async function deleteMyRepair(id: string) {
  await readJson(
    await fetch(`/api/providers/me/repairs/${encodeURIComponent(id)}`, { method: "DELETE" }),
  );
}

export async function postMyTech(body: {
  name: string;
  description?: string | null;
  kind?: "bilgisayar" | "telefon" | "yazici" | "konsol" | "tv" | "ag" | "diger";
  item?: string | null;
  job?: "kurulum" | "format" | "yazilim" | "veri" | "bakim" | "parca" | "sorun" | "diger";
  price: number;
  priceType?: "sabit" | "baslangic" | "inceleme";
  priceUnit?: "cihaz" | "islem" | "saat" | "paket";
  materials?: "provider" | "customer" | "included" | "extra" | "none";
  leadHours?: number | null;
  leadDays?: number | null;
  maxPerWeek?: number | null;
  delivery?: { adres: boolean; nokta: boolean; yakin: boolean; yerinde: boolean };
  inspectRequired?: boolean;
  quoteFromPhoto?: boolean;
  platform?: string | null;
  warrantyDays?: number | null;
  notes?: string | null;
  workHours?: string | null;
  isActive?: boolean;
}) {
  const data = unwrap(
    await readJson<{ data?: { tech: ProviderTech }; tech?: ProviderTech }>(
      await fetch("/api/providers/me/tech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    ),
  );
  return data.tech!;
}

export async function fetchMyTechs() {
  const data = unwrap(
    await readJson<{ data?: { techs: ProviderTech[] }; techs?: ProviderTech[] }>(
      await fetch("/api/providers/me/tech"),
    ),
  );
  return data.techs ?? [];
}

export async function patchMyTech(id: string, body: Parameters<typeof postMyTech>[0]) {
  const data = unwrap(
    await readJson<{ data?: { tech: ProviderTech }; tech?: ProviderTech }>(
      await fetch(`/api/providers/me/tech/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    ),
  );
  return data.tech!;
}

export async function uploadMyTechPhoto(id: string, file: File) {
  const body = new FormData();
  body.append("file", file);
  const data = unwrap(
    await readJson<{ data?: { photoUrl: string; tech: ProviderTech }; photoUrl?: string; tech?: ProviderTech }>(
      await fetch(`/api/providers/me/tech/${encodeURIComponent(id)}/photo`, { method: "POST", body }),
    ),
  );
  return data;
}

export async function deleteMyTech(id: string) {
  await readJson(
    await fetch(`/api/providers/me/tech/${encodeURIComponent(id)}`, { method: "DELETE" }),
  );
}

export async function postMyWash(body: {
  name: string;
  description?: string | null;
  job?: "dis" | "ic" | "icdis";
  vehicle?: "otomobil" | "suv" | "ticari" | "diger";
  price: number;
  includes?: {
    dis: boolean;
    supurme: boolean;
    cam: boolean;
    torpido: boolean;
    jant: boolean;
    kurulama: boolean;
  };
  durationMin?: number | null;
  maxPerDay?: number | null;
  booking?: "randevu" | "musait";
  location?: string | null;
  workHours?: string | null;
  materials?: "provider" | "customer";
  notes?: string | null;
  isActive?: boolean;
}) {
  const data = unwrap(
    await readJson<{ data?: { wash: ProviderWash }; wash?: ProviderWash }>(
      await fetch("/api/providers/me/washes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    ),
  );
  return data.wash!;
}

export async function fetchMyWashes() {
  const data = unwrap(
    await readJson<{ data?: { washes: ProviderWash[] }; washes?: ProviderWash[] }>(
      await fetch("/api/providers/me/washes"),
    ),
  );
  return data.washes ?? [];
}

export async function patchMyWash(id: string, body: Parameters<typeof postMyWash>[0]) {
  const data = unwrap(
    await readJson<{ data?: { wash: ProviderWash }; wash?: ProviderWash }>(
      await fetch(`/api/providers/me/washes/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    ),
  );
  return data.wash!;
}

export async function uploadMyWashPhoto(id: string, file: File) {
  const body = new FormData();
  body.append("file", file);
  const data = unwrap(
    await readJson<{ data?: { photoUrl: string; wash: ProviderWash }; photoUrl?: string; wash?: ProviderWash }>(
      await fetch(`/api/providers/me/washes/${encodeURIComponent(id)}/photo`, { method: "POST", body }),
    ),
  );
  return data;
}

export async function deleteMyWash(id: string) {
  await readJson(
    await fetch(`/api/providers/me/washes/${encodeURIComponent(id)}`, { method: "DELETE" }),
  );
}

export async function postMyCourier(body: {
  name: string;
  description?: string | null;
  transport?: {
    yaya: boolean;
    bisiklet: boolean;
    ebike: boolean;
    motor: boolean;
  };
  sizes?: { kucuk: boolean; orta: boolean; buyuk: boolean };
  maxKm?: number;
  price: number;
  priceType?: "sabit" | "mesafe";
  durationMin?: number | null;
  routes?: { adresAdres: boolean; noktaAdres: boolean; noktaNokta: boolean };
  avail?: "hemen" | "randevu" | "saat";
  workHours?: string | null;
  region?: string | null;
  carry?: {
    evrak: boolean;
    paket: boolean;
    kiyafet: boolean;
    anahtar: boolean;
    hediye: boolean;
    kisisel: boolean;
    diger: boolean;
  };
  carryOther?: string | null;
  refuse?: string | null;
  confirm?: { kod: boolean; app: boolean };
  notes?: string | null;
  isActive?: boolean;
}) {
  const data = unwrap(
    await readJson<{ data?: { courier: ProviderCourier }; courier?: ProviderCourier }>(
      await fetch("/api/providers/me/couriers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    ),
  );
  return data.courier!;
}

export async function fetchMyCouriers() {
  const data = unwrap(
    await readJson<{ data?: { couriers: ProviderCourier[] }; couriers?: ProviderCourier[] }>(
      await fetch("/api/providers/me/couriers"),
    ),
  );
  return data.couriers ?? [];
}

export async function patchMyCourier(id: string, body: Parameters<typeof postMyCourier>[0]) {
  const data = unwrap(
    await readJson<{ data?: { courier: ProviderCourier }; courier?: ProviderCourier }>(
      await fetch(`/api/providers/me/couriers/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    ),
  );
  return data.courier!;
}

export async function uploadMyCourierPhoto(id: string, file: File) {
  const body = new FormData();
  body.append("file", file);
  const data = unwrap(
    await readJson<{ data?: { photoUrl: string; courier: ProviderCourier }; photoUrl?: string; courier?: ProviderCourier }>(
      await fetch(`/api/providers/me/couriers/${encodeURIComponent(id)}/photo`, { method: "POST", body }),
    ),
  );
  return data;
}

export async function deleteMyCourier(id: string) {
  await readJson(
    await fetch(`/api/providers/me/couriers/${encodeURIComponent(id)}`, { method: "DELETE" }),
  );
}

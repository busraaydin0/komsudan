"use client";

import { useCallback, useEffect, useState } from "react";
import type { Account, AppNotification, CreateOrderInput, DropPoint, Order, Provider, Review, WorkPhoto } from "./types";
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

export async function postMyProduct(body: { name: string; pricePerPerson: number }) {
  const data = unwrap(
    await readJson<{ data?: { product: { id: string; name: string; pricePerPerson: number } }; product?: { id: string; name: string; pricePerPerson: number } }>(
      await fetch("/api/providers/me/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    ),
  );
  return data.product!;
}

export async function deleteMyProduct(id: string) {
  await readJson(
    await fetch(`/api/providers/me/products/${encodeURIComponent(id)}`, { method: "DELETE" }),
  );
}

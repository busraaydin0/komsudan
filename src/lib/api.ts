"use client";

import { useCallback, useEffect, useState } from "react";
import type { CategoryId } from "./categories/registry";
import type { Account, AppNotification, CreateOrderInput, DropPoint, MessageInboxThread, Order, OrderConversation, OrderMessage, Provider, ProviderWash, Review, WalletActivity, WalletSnapshot, WorkPhoto } from "./types";
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
    const t = setInterval(() => void reload(), 12000);
    return () => clearInterval(t);
  }, [reload]);

  return { ...catalog, ready, reload };
}

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState("");

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/orders", { credentials: "same-origin" });
      const data = unwrap(await readJson<{ data?: { orders: Order[] }; orders?: Order[] }>(res));
      const list = Array.isArray(data.orders) ? data.orders : [];
      setOrders(list);
      setErr("");
      setReady(true);
    } catch (e) {
      setOrders([]);
      setErr(e instanceof Error ? e.message : "Siparişler alınamadı.");
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void reload();
    const t = setInterval(() => void reload(), 8000);
    return () => clearInterval(t);
  }, [reload]);

  return { orders, ready, reload, err };
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

export function useInbox() {
  const [threads, setThreads] = useState<MessageInboxThread[]>([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    try {
      const data = unwrap(
        await readJson<{
          data?: { threads: MessageInboxThread[]; unreadTotal: number };
          threads?: MessageInboxThread[];
          unreadTotal?: number;
        }>(await fetch("/api/me/messages")),
      );
      setThreads(data.threads ?? []);
      setUnreadTotal(data.unreadTotal ?? 0);
      setReady(true);
    } catch {
      setThreads([]);
      setUnreadTotal(0);
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void reload();
    const t = setInterval(() => void reload(), 8000);
    return () => clearInterval(t);
  }, [reload]);

  return { threads, unreadTotal, ready, reload };
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

export async function fetchWallet(amount?: number) {
  const qs = amount != null && amount > 0 ? `?amount=${encodeURIComponent(String(amount))}` : "";
  const data = unwrap(
    await readJson<{
      data?: { wallet: WalletSnapshot; activity: WalletActivity[]; presets: number[] };
      wallet?: WalletSnapshot;
      activity?: WalletActivity[];
      presets?: number[];
    }>(await fetch(`/api/me/wallet${qs}`)),
  );
  return {
    wallet: data.wallet!,
    activity: data.activity ?? [],
    presets: data.presets ?? [100, 250, 500, 1000],
  };
}

export async function postWalletTopup(method: string, amount: number) {
  const data = unwrap(
    await readJson<{
      data?: { wallet: WalletSnapshot; activity: WalletActivity[] };
      wallet?: WalletSnapshot;
      activity?: WalletActivity[];
    }>(
      await fetch("/api/me/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, amount }),
      }),
    ),
  );
  return { wallet: data.wallet!, activity: data.activity ?? [] };
}

export async function postWalletPayout(method: string, amount: number) {
  const data = unwrap(
    await readJson<{
      data?: { wallet: WalletSnapshot; activity: WalletActivity[] };
      wallet?: WalletSnapshot;
      activity?: WalletActivity[];
    }>(
      await fetch("/api/me/wallet/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, amount }),
      }),
    ),
  );
  return { wallet: data.wallet!, activity: data.activity ?? [] };
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

export type OrderThread = {
  conversation: OrderConversation;
  messages: OrderMessage[];
  unreadCount: number;
};

export async function fetchOrderMessages(orderId: string) {
  return unwrap(
    await readJson<{ data?: OrderThread } & Partial<OrderThread>>(
      await fetch(`/api/orders/${orderId}/messages`),
    ),
  );
}

export async function postOrderMessage(orderId: string, body: string, clientMessageId: string) {
  return unwrap(
    await readJson<{ data?: { message: OrderMessage; warning: boolean }; message?: OrderMessage; warning?: boolean }>(
      await fetch(`/api/orders/${orderId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, clientMessageId }),
      }),
    ),
  );
}

export async function patchOrderMessagesRead(orderId: string) {
  return unwrap(
    await readJson<{ data?: OrderThread } & Partial<OrderThread>>(
      await fetch(`/api/orders/${orderId}/messages/read`, { method: "PATCH" }),
    ),
  );
}

export async function reportOrderMessage(orderId: string, messageId: string, reason: string) {
  return unwrap(
    await readJson<{ data?: { ok: true } }>(
      await fetch(`/api/orders/${orderId}/messages/${messageId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      }),
    ),
  );
}

export async function deleteOrderMessage(orderId: string, messageId: string) {
  return unwrap(
    await readJson<{ data?: { message: OrderMessage }; message?: OrderMessage }>(
      await fetch(`/api/orders/${orderId}/messages/${messageId}`, { method: "DELETE" }),
    ),
  );
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
      signal: AbortSignal.timeout(8000),
    }),
  );
}

export async function verifyOtp(phone: string, code: string) {
  const data = await readJson<{ account: Account }>(
    await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code }),
      signal: AbortSignal.timeout(8000),
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

export async function postReview(
  orderId: string,
  input: {
    rating: number;
    body: string;
    files: File[];
    quality?: number | null;
    timeliness?: number | null;
    communication?: number | null;
    wouldRepeat?: boolean | null;
  },
) {
  const body = new FormData();
  body.append("rating", String(input.rating));
  body.append("body", input.body);
  if (input.quality != null) body.append("quality", String(input.quality));
  if (input.timeliness != null) body.append("timeliness", String(input.timeliness));
  if (input.communication != null) body.append("communication", String(input.communication));
  if (input.wouldRepeat != null) body.append("wouldRepeat", input.wouldRepeat ? "yes" : "no");
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
  categoryId: CategoryId;
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


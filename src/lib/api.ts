"use client";

import { useCallback, useEffect, useState } from "react";
import type { Account, CreateOrderInput, DropPoint, Order, Provider, Review, WorkPhoto } from "./types";
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

export function useCatalog() {
  const [catalog, setCatalog] = useState<Catalog>({ providers: [], dropPoints: [] });
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    const data = await readJson<Catalog>(await fetch("/api/catalog"));
    setCatalog({ providers: data.providers, dropPoints: data.dropPoints });
    setReady(true);
  }, []);

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
      const data = await readJson<{ orders: Order[] }>(await fetch("/api/orders"));
      setOrders(data.orders);
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

export async function postOrder(input: CreateOrderInput) {
  const data = await readJson<{ order: Order }>(
    await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
  return data.order;
}

export async function patchOrder(
  id: string,
  action: "accept" | "reject" | "advance" | "deliver",
  code?: string,
) {
  const data = await readJson<{ order: Order }>(
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, code }),
    }),
  );
  return data.order;
}

export function useSession() {
  const [account, setAccount] = useState<Account | null>(null);
  const [loyalty, setLoyalty] = useState<Loyalty | null>(null);
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    const data = await readJson<{ account: Account | null; loyalty: Loyalty | null }>(
      await fetch("/api/auth/session"),
    );
    setAccount(data.account);
    setLoyalty(data.loyalty);
    setReady(true);
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
  const data = await readJson<{ photo: WorkPhoto; order: Order }>(
    await fetch(`/api/orders/${orderId}/photos`, { method: "POST", body }),
  );
  return data;
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

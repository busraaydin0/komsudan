"use client";

import { useCallback, useEffect, useState } from "react";
import type { Account, CreateOrderInput, DropPoint, Order, Provider } from "./types";
import type { Loyalty } from "./loyalty";

export type Catalog = {
  providers: Provider[];
  dropPoints: DropPoint[];
};

async function readJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "İstek başarısız.");
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

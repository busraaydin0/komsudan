"use client";

import { useCallback, useEffect, useState } from "react";
import type { CreateOrderInput, DropPoint, Order, Provider } from "./types";

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
    const data = await readJson<{ orders: Order[] }>(await fetch("/api/orders"));
    setOrders(data.orders);
    setReady(true);
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

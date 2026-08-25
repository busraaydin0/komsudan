"use client";

import { useSyncExternalStore } from "react";
import type { Order } from "./types";

const KEY = "komsudan-orders-v1";

let orders: Order[] = [];
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(orders));
  }
}

function load() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) orders = JSON.parse(raw) as Order[];
  } catch {
    orders = [];
  }
}

if (typeof window !== "undefined") load();

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const empty: Order[] = [];

export function useOrders() {
  return useSyncExternalStore(subscribe, () => orders, () => empty);
}

export function addOrder(order: Order) {
  orders = [order, ...orders];
  emit();
}

export function patchOrder(id: string, patch: Partial<Order>) {
  orders = orders.map((o) => (o.id === id ? { ...o, ...patch } : o));
  emit();
}

export function newOrderId() {
  return `k-${Date.now().toString(36)}`;
}

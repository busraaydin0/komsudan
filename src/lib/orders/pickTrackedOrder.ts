/** Sipariş sekmesinde hangi kaydın açılacağı. Yeni talep, hazır demoya yenilmemeli. */

const TERMINAL = new Set(["completed", "cancelled", "rejected", "disputed"]);

export function pickTrackedOrderId<T extends { id: string; status: string; createdAt?: string }>(
  orders: T[],
  currentId: string | null,
): string | null {
  const newest = (list: T[]) =>
    [...list].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))[0]?.id ?? null;
  const pendingList = orders.filter((o) => o.status === "pending");
  const pending = newest(pendingList);
  if (pending) {
    if (currentId && pendingList.some((o) => o.id === currentId)) return currentId;
    return pending;
  }
  if (currentId && orders.some((o) => o.id === currentId)) return currentId;
  const ready = newest(orders.filter((o) => o.status === "ready" || o.status === "admin_pending"));
  if (ready) return ready;
  const open = newest(orders.filter((o) => !TERMINAL.has(o.status)));
  if (open) return open;
  return orders[0]?.id ?? null;
}

import { randomUUID } from "node:crypto";
import {
  addonKey,
  parseAddonKey,
  type LaundrySize,
  type OrderAddonLine,
} from "@/lib/laundryModel";
import { db } from "./client";

export type OrderItemRow = {
  id: string;
  order_id: string;
  kind: "size" | "addon";
  variant: string;
  qty: number;
  unit_price: number;
};

export function insertOrderItem(input: Omit<OrderItemRow, "id"> & { id?: string }) {
  const id = input.id ?? randomUUID();
  db()
    .prepare(
      `INSERT INTO order_items (id, order_id, kind, variant, qty, unit_price)
       VALUES (@id, @order_id, @kind, @variant, @qty, @unit_price)`,
    )
    .run({ ...input, id });
  return id;
}

export function listOrderItems(orderId: string): OrderItemRow[] {
  return db()
    .prepare(`SELECT * FROM order_items WHERE order_id = ? ORDER BY kind, variant`)
    .all(orderId) as OrderItemRow[];
}

export function replaceAddonItems(orderId: string, addons: OrderAddonLine[], unitPrices: Map<string, number>) {
  db().prepare(`DELETE FROM order_items WHERE order_id = ? AND kind = 'addon'`).run(orderId);
  for (const a of addons) {
    if (a.qty < 1) continue;
    const key = addonKey(a.addon, a.variant);
    const price = unitPrices.get(key);
    if (price == null) continue;
    insertOrderItem({
      order_id: orderId,
      kind: "addon",
      variant: key,
      qty: a.qty,
      unit_price: price,
    });
  }
}

export function orderedSizeFromItems(items: OrderItemRow[]): LaundrySize | null {
  const row = items.find((i) => i.kind === "size");
  if (!row) return null;
  return row.variant as LaundrySize;
}

export function addonsFromItems(items: OrderItemRow[]): OrderAddonLine[] {
  const out: OrderAddonLine[] = [];
  for (const row of items.filter((i) => i.kind === "addon")) {
    const parsed = parseAddonKey(row.variant);
    if (!parsed) continue;
    out.push({ ...parsed, qty: row.qty });
  }
  return out;
}


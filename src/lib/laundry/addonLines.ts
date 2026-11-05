import type { OrderAddonLine } from "@/lib/laundryModel";

export function addonQty(
  addons: OrderAddonLine[],
  addon: OrderAddonLine["addon"],
  variant: OrderAddonLine["variant"],
) {
  return addons.find((a) => a.addon === addon && a.variant === variant)?.qty ?? 0;
}

export function setAddonQty(
  addons: OrderAddonLine[],
  addon: OrderAddonLine["addon"],
  variant: OrderAddonLine["variant"],
  qty: number,
): OrderAddonLine[] {
  const next = addons.filter((a) => !(a.addon === addon && a.variant === variant));
  if (qty > 0) next.push({ addon, variant, qty });
  return next;
}

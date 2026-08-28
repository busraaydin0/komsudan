import type { DryingType, Provider } from "./types";

export type { DryingType };

export const DRYING_OPTIONS: { id: DryingType; label: string; hint: string }[] = [
  { id: "makine", label: "Makine kurutucu", hint: "Müşteri listede kurutucu görür." },
  { id: "ip", label: "İpte", hint: "Makine yok; kurutma çamaşır ipinde." },
  { id: "ikisi", label: "İkisi de", hint: "Makine veya ip — sen seçersin." },
];

export function hasDryerFrom(type: DryingType) {
  return type !== "ip";
}

export function dryingFromProvider(p: Pick<Provider, "hasDryer" | "dryingType">): DryingType {
  if (p.dryingType === "makine" || p.dryingType === "ip" || p.dryingType === "ikisi") {
    return p.dryingType;
  }
  return p.hasDryer ? "makine" : "ip";
}

export function dryingBlurb(type: DryingType) {
  if (type === "ip") return "Kurutma ipte.";
  if (type === "ikisi") return "Makine kurutucu veya ipte kuruturum.";
  return "Makine kurutucu var.";
}

/** Yakındakiler satırındaki kısa etiket. */
export function dryingListLabel(p: Pick<Provider, "hasDryer" | "dryingType">) {
  if (p.dryingType === "ip") return "ipte";
  if (p.dryingType === "ikisi") return "makine veya ip";
  if (p.dryingType === "makine" || p.hasDryer) return "kurutucu";
  return "";
}

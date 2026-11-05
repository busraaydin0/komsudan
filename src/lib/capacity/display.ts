import { loadLabel, weekTone, type LoadTone } from "./loadTone";
import type { Provider } from "@/lib/types";

export function providerLoadDisplay(p: Provider): {
  tone: LoadTone;
  loadLabel: string | null;
  barFillPct: number;
  deliveryLine: string | null;
  weekBars: number[];
} {
  const cap = p.capacity;
  if (!cap?.configured) {
    return {
      tone: "full",
      loadLabel: "Kapasite yok",
      barFillPct: 100,
      deliveryLine: null,
      weekBars: [1, 1, 1, 1, 1, 1, 1],
    };
  }
  const freeRatios = cap.weekLoad.map((d) => d.freeRatio);
  const tone = weekTone(freeRatios);
  const avgUsed =
    cap.weekLoad.length > 0
      ? cap.weekLoad.reduce((s, d) => s + d.usedRatio, 0) / cap.weekLoad.length
      : 0;
  return {
    tone,
    loadLabel: loadLabel(tone),
    barFillPct: Math.max(tone === "full" ? 100 : 8, Math.round(avgUsed * 100)),
    deliveryLine: cap.earliestDeliveryLabel ? `En erken teslim: ${cap.earliestDeliveryLabel}` : null,
    weekBars: cap.weekLoad.map((d) => Math.round(d.usedRatio * 100)),
  };
}

export function sortKeyFreeSpace(p: Provider) {
  const cap = p.capacity;
  if (!cap?.configured || !cap.weekLoad.length) return -1;
  return Math.max(...cap.weekLoad.map((d) => d.freeRatio));
}

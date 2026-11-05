/** Doluluk çubuğu: boş oranı ≤ %33 → az yer; %0 boş → dolu. */
export type LoadTone = "ok" | "low" | "full";

export function loadToneFromFreeRatio(freeRatio: number): LoadTone {
  if (freeRatio <= 0) return "full";
  if (freeRatio <= 0.33) return "low";
  return "ok";
}

export function loadLabel(tone: LoadTone) {
  if (tone === "full") return "Dolu";
  if (tone === "low") return "Az yer";
  return null;
}

/** 7 günlük seriden en kötü ton (müşteri kartı). */
export function weekTone(freeRatios: number[]): LoadTone {
  if (!freeRatios.length) return "ok";
  const minFree = Math.min(...freeRatios);
  return loadToneFromFreeRatio(minFree);
}

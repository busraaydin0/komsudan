import { kmBetween } from "@/lib/geo";
import type { LngLat } from "@/lib/types";

export type GeoFailure = "denied" | "timeout" | "unavailable" | "unsupported" | "insecure";

export type LocationKind = "ok" | "outside-pilot" | GeoFailure;

export type ResolvedLocation = {
  origin: LngLat;
  kind: LocationKind;
  usedPilotCenter: boolean;
};

export function isInsecureGeoContext(isSecureContext: boolean): boolean {
  return !isSecureContext;
}

/** GeolocationPositionError.code: 1 denied, 2 unavailable, 3 timeout. */
export function classifyGeoError(code: number): Exclude<GeoFailure, "unsupported" | "insecure"> {
  if (code === 1) return "denied";
  if (code === 3) return "timeout";
  return "unavailable";
}

export function resolveLocationOrigin(
  loc: LngLat | null,
  failure: GeoFailure | null,
  center: LngLat,
  radiusKm: number,
): ResolvedLocation {
  if (loc) {
    if (kmBetween(loc, center) > radiusKm) {
      return { origin: center, kind: "outside-pilot", usedPilotCenter: true };
    }
    return { origin: loc, kind: "ok", usedPilotCenter: false };
  }
  return { origin: center, kind: failure ?? "unavailable", usedPilotCenter: true };
}

export const LOCATION_COPY = {
  loading: "Konum alınıyor…",
  ok: "Konumun bulundu. Yakındaki hizmet verenler gösteriliyor.",
  "outside-pilot": "Pilot yalnız Çukurambar'da. Çukurambar merkezi gösteriliyor.",
  denied: "Konum izni verilmedi. Çukurambar merkezi gösteriliyor.",
  deniedHow: "Adres çubuğundaki kilitten Konum’a izin ver, sonra yeniden dene.",
  insecure: "Konum için güvenli bağlantı (https) gerekir.",
  unsupported: "Bu tarayıcı konum vermiyor. Çukurambar merkezi gösteriliyor.",
  timeout: "Konum zaman aşımına uğradı. Çukurambar merkezi gösteriliyor.",
  unavailable: "Konum alınamadı. Çukurambar merkezi gösteriliyor.",
} as const;

export function locationFeedback(kind: LocationKind | "loading"): {
  message: string;
  hint?: string;
  retry: boolean;
} {
  if (kind === "loading") return { message: LOCATION_COPY.loading, retry: false };
  if (kind === "ok") return { message: LOCATION_COPY.ok, retry: false };
  if (kind === "outside-pilot") return { message: LOCATION_COPY["outside-pilot"], retry: false };
  if (kind === "denied") {
    return { message: LOCATION_COPY.denied, hint: LOCATION_COPY.deniedHow, retry: false };
  }
  if (kind === "insecure") return { message: LOCATION_COPY.insecure, retry: false };
  if (kind === "timeout") return { message: LOCATION_COPY.timeout, retry: true };
  if (kind === "unsupported") return { message: LOCATION_COPY.unsupported, retry: true };
  return { message: LOCATION_COPY.unavailable, retry: true };
}

export function rankByDistance<T extends { loc: LngLat }>(
  items: T[],
  origin: LngLat,
): { item: T; km: number }[] {
  return items
    .map((item) => ({ item, km: kmBetween(origin, item.loc) }))
    .sort((a, b) => a.km - b.km);
}

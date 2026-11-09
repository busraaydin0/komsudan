import { describe, expect, it } from "vitest";
import { PILOT_AREA } from "@/lib/laundry/pilot";
import {
  classifyGeoError,
  isInsecureGeoContext,
  locationFeedback,
  LOCATION_COPY,
  rankByDistance,
  resolveLocationOrigin,
} from "./locationOrigin";

const center = PILOT_AREA.center;
const cukurambar = { lat: 39.90313, lng: 32.80286 };
const kizilirmak = { lat: 39.9055, lng: 32.8091 };
const sogutozu = { lat: 39.9076, lng: 32.7902 };
const istanbul = { lat: 41.0082, lng: 28.9784 };

describe("konum yedek merkezi", () => {
  it("Çukurambar GPS’inde canlı origin kullanır", () => {
    const r = resolveLocationOrigin(cukurambar, null, center, PILOT_AREA.radiusKm);
    expect(r.kind).toBe("ok");
    expect(r.usedPilotCenter).toBe(false);
    expect(r.origin).toEqual(cukurambar);
    expect(locationFeedback(r.kind).message).toBe(LOCATION_COPY.ok);
  });

  it("pilot dışı GPS’te Çukurambar merkezine düşer", () => {
    const r = resolveLocationOrigin(istanbul, null, center, PILOT_AREA.radiusKm);
    expect(r.kind).toBe("outside-pilot");
    expect(r.usedPilotCenter).toBe(true);
    expect(r.origin).toEqual(center);
    expect(locationFeedback(r.kind).message).toBe(LOCATION_COPY["outside-pilot"]);
  });

  it("izin reddinde merkez + nasıl açılır notu", () => {
    const r = resolveLocationOrigin(null, "denied", center, PILOT_AREA.radiusKm);
    expect(r.origin).toEqual(center);
    const fb = locationFeedback(r.kind);
    expect(fb.message).toBe(LOCATION_COPY.denied);
    expect(fb.hint).toBe(LOCATION_COPY.deniedHow);
    expect(fb.retry).toBe(false);
  });

  it("güvenli olmayan bağlamda https mesajı", () => {
    expect(isInsecureGeoContext(false)).toBe(true);
    expect(isInsecureGeoContext(true)).toBe(false);
    const r = resolveLocationOrigin(null, "insecure", center, PILOT_AREA.radiusKm);
    expect(r.origin).toEqual(center);
    expect(locationFeedback(r.kind).message).toBe(LOCATION_COPY.insecure);
  });

  it("desteklenmiyor ve zaman aşımında yeniden dene", () => {
    expect(locationFeedback("timeout").retry).toBe(true);
    expect(locationFeedback("unsupported").retry).toBe(true);
    expect(locationFeedback("unavailable").retry).toBe(true);
    expect(resolveLocationOrigin(null, "timeout", center, PILOT_AREA.radiusKm).origin).toEqual(center);
  });

  it("Geolocation hata kodlarını ayırır", () => {
    expect(classifyGeoError(1)).toBe("denied");
    expect(classifyGeoError(3)).toBe("timeout");
    expect(classifyGeoError(2)).toBe("unavailable");
  });
});

describe("mesafe sıralaması", () => {
  const providers = [
    { id: "far", name: "Uzak", loc: sogutozu },
    { id: "near", name: "Yakın", loc: kizilirmak },
    { id: "mid", name: "Orta", loc: { lat: 39.904, lng: 32.8 } },
  ];

  it("origin’e göre yakından uzağa dizer", () => {
    const ranked = rankByDistance(providers, cukurambar);
    expect(ranked.map((r) => r.item.id)).toEqual(["mid", "near", "far"]);
    expect(ranked[0].km).toBeLessThan(ranked[1].km);
    expect(ranked[1].km).toBeLessThan(ranked[2].km);
  });

  it("yedek merkezde liste boş kalmaz", () => {
    const origin = resolveLocationOrigin(istanbul, null, center, PILOT_AREA.radiusKm).origin;
    const ranked = rankByDistance(providers, origin);
    expect(ranked).toHaveLength(providers.length);
  });
});

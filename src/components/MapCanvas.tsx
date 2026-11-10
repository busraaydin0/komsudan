"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MaplibreMap, Marker as MaplibreMarker } from "maplibre-gl";
import { PILOT_AREA } from "@/lib/laundry/pilot";
import { initials } from "@/lib/avatar";
import { providerLoadDisplay } from "@/lib/capacity/display";
import type { LngLat, MapMode, Provider } from "@/lib/types";

/** OpenFreeMap Liberty — anahtar yok. Carto raster Eyl 2026'dan beri anahtarsız filigran basıyor. */
const STYLE = "https://tiles.openfreemap.org/styles/liberty";

type Props = {
  mode: MapMode;
  selectedId: string | null;
  user: LngLat | null;
  meAvatar?: string | null;
  providers: Provider[];
  onSelect: (id: string) => void;
  visible?: boolean;
};

function tightBounds(): [[number, number], [number, number]] {
  return [
    [PILOT_AREA.bounds.west, PILOT_AREA.bounds.south],
    [PILOT_AREA.bounds.east, PILOT_AREA.bounds.north],
  ];
}

let cameraGen = 0;

function pinKey(providers: Provider[]) {
  return providers.map((p) => `${p.id}:${p.loc.lng}:${p.loc.lat}:${p.avatarUrl ?? ""}`).join("|");
}

export function MapCanvas({
  mode,
  selectedId,
  user,
  meAvatar,
  providers,
  onSelect,
  visible = true,
}: Props) {
  const root = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const MarkerRef = useRef<typeof MaplibreMarker | null>(null);
  const markers = useRef<MaplibreMarker[]>([]);
  const userMarker = useRef<MaplibreMarker | null>(null);
  const onSelectRef = useRef(onSelect);
  const modeRef = useRef(mode);
  const providersRef = useRef(providers);
  const selectedRef = useRef(selectedId);
  const [mapReady, setMapReady] = useState(false);
  onSelectRef.current = onSelect;
  modeRef.current = mode;
  providersRef.current = providers;
  selectedRef.current = selectedId;
  const pins = pinKey(providers);

  useEffect(() => {
    if (!root.current || mapRef.current) return;
    let cancelled = false;

    void import("maplibre-gl").then((ml) => {
      if (cancelled || !root.current || mapRef.current) return;
      ml.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      MarkerRef.current = ml.Marker;

      const map = new ml.Map({
        container: root.current,
        style: STYLE,
        center: [PILOT_AREA.center.lng, PILOT_AREA.center.lat],
        zoom: PILOT_AREA.zoom,
        minZoom: 13.2,
        maxZoom: 18,
        pitch: modeRef.current === "3d" ? 58 : 0,
        bearing: modeRef.current === "3d" ? -18 : 0,
        maxPitch: 75,
        pitchWithRotate: true,
        canvasContextAttributes: { antialias: true },
        ...(modeRef.current === "3d" ? {} : { maxBounds: tightBounds() }),
        attributionControl: { compact: true },
      });
      mapRef.current = map;
      setMapReady(true);

      const onReady = () => {
        map.resize();
        ensureBuildings(map, modeRef.current);
        syncMode(map, modeRef.current);
      };
      map.on("load", onReady);
      map.once("idle", () => syncMode(map, modeRef.current));
      map.on("sourcedata", (e) => {
        if (e.sourceId === "openmaptiles" && e.isSourceLoaded) {
          ensureBuildings(map, modeRef.current);
        }
      });
    });

    return () => {
      cancelled = true;
      setMapReady(false);
      markers.current.forEach((m) => m.remove());
      markers.current = [];
      userMarker.current?.remove();
      userMarker.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      MarkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    const Marker = MarkerRef.current;
    if (!Marker) return;
    markers.current.forEach((m) => m.remove());
    const next: MaplibreMarker[] = [];
    providers.forEach((p, i) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "katla-pin";
      el.dataset.id = p.id;
      el.dataset.load = providerLoadDisplay(p).tone;
      el.style.setProperty("--pin-delay", `${i * 40}ms`);
      el.setAttribute("aria-label", p.name);
      const face = document.createElement("span");
      face.className = "face";
      if (p.avatarUrl) {
        const img = document.createElement("img");
        img.src = p.avatarUrl;
        img.alt = "";
        img.loading = "lazy";
        img.decoding = "async";
        face.appendChild(img);
      } else {
        face.textContent = initials(p.name);
      }
      const rate = document.createElement("span");
      rate.className = "rate";
      rate.textContent = p.rating.toFixed(1);
      const stem = document.createElement("span");
      stem.className = "stem";
      el.append(face, rate, stem);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectRef.current(p.id);
      });
      next.push(
        new Marker({ element: el, anchor: "bottom" })
          .setLngLat([p.loc.lng, p.loc.lat])
          .addTo(map),
      );
    });
    markers.current = next;
    for (const m of next) {
      const el = m.getElement();
      el.classList.toggle("is-on", el.dataset.id === selectedRef.current);
    }
    return () => {
      next.forEach((m) => m.remove());
      if (markers.current === next) markers.current = [];
    };
    // pins: recreate only when ids/locations change, not on remaining polls
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, pins]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    syncMode(map, mode);
  }, [mode, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!visible || !map) return;
    map.resize();
  }, [visible]);

  useEffect(() => {
    for (const m of markers.current) {
      const el = m.getElement();
      const id = el.dataset.id;
      el.classList.toggle("is-on", id === selectedId);
    }
    const map = mapRef.current;
    if (!map) return;
    if (selectedId) {
      const p = providersRef.current.find((x) => x.id === selectedId);
      if (!p) return;
      map.easeTo({
        center: [p.loc.lng, p.loc.lat],
        zoom: Math.max(map.getZoom(), 16.2),
        duration: 650,
        offset: [0, -80],
        pitch: modeRef.current === "3d" ? Math.max(map.getPitch(), 52) : 0,
        bearing: modeRef.current === "3d" ? map.getBearing() : 0,
        essential: true,
      });
      return;
    }
  }, [selectedId]);

  useEffect(() => {
    for (const m of markers.current) {
      const el = m.getElement();
      const id = el.dataset.id;
      if (!id) continue;
      const p = providers.find((x) => x.id === id);
      if (p) el.dataset.load = providerLoadDisplay(p).tone;
    }
  }, [providers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !user) return;
    const inPilot =
      user.lng >= PILOT_AREA.bounds.west &&
      user.lng <= PILOT_AREA.bounds.east &&
      user.lat >= PILOT_AREA.bounds.south &&
      user.lat <= PILOT_AREA.bounds.north;
    if (!inPilot) return;
    const Marker = MarkerRef.current;
    if (!Marker) return;
    if (!userMarker.current) {
      const el = document.createElement("div");
      el.className = meAvatar ? "katla-me has-face" : "katla-me";
      if (meAvatar) {
        const img = document.createElement("img");
        img.src = meAvatar;
        img.alt = "";
        img.loading = "lazy";
        el.appendChild(img);
      } else {
        el.innerHTML = `<span></span>`;
      }
      userMarker.current = new Marker({ element: el, anchor: "center" })
        .setLngLat([user.lng, user.lat])
        .addTo(map);
    } else {
      userMarker.current.setLngLat([user.lng, user.lat]);
      const el = userMarker.current.getElement();
      const has = Boolean(meAvatar);
      el.classList.toggle("has-face", has);
      if (has) {
        let img = el.querySelector("img");
        if (!img) {
          el.innerHTML = "";
          img = document.createElement("img");
          img.alt = "";
          el.appendChild(img);
        }
        img.src = meAvatar!;
      } else if (!el.querySelector("span")) {
        el.innerHTML = `<span></span>`;
      }
    }
  }, [user, meAvatar]);

  return (
    <div className="absolute inset-x-0 top-0 bottom-[var(--tabbar)] z-0 isolate">
      <div ref={root} className="h-full w-full" />
    </div>
  );
}

function syncMode(map: MaplibreMap, mode: MapMode) {
  const three = mode === "3d";
  const gen = ++cameraGen;
  map.getContainer().dataset.view = mode;
  map.stop();
  if (three) map.setMaxBounds(null);
  else map.setPitch(0);

  const pitch = three ? 58 : 0;
  const bearing = three ? -18 : 0;
  map.setPitch(pitch);
  map.setBearing(bearing);
  if (map.loaded()) {
    map.easeTo({ pitch, bearing, duration: 720, essential: true });
  } else {
    map.jumpTo({ pitch, bearing });
  }

  if (three) {
    map.dragRotate.enable();
    map.touchZoomRotate.enableRotation();
    map.touchPitch.enable();
    try {
      map.setSky({ "atmosphere-blend": 0.6 });
    } catch {
      /* style not loaded yet */
    }
  } else {
    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();
    map.touchPitch.disable();
    try {
      map.setSky({ "atmosphere-blend": 0 });
    } catch {
      /* style not loaded yet */
    }
    map.once("moveend", () => {
      if (gen !== cameraGen) return;
      if (map.getContainer().dataset.view === "2d") map.setMaxBounds(tightBounds());
    });
  }
  ensureBuildings(map, mode);
}

function ensureBuildings(map: MaplibreMap, mode: MapMode) {
  if (!map.isStyleLoaded()) return;
  if (map.getLayer("building-3d")) {
    map.setLayoutProperty("building-3d", "visibility", mode === "3d" ? "visible" : "none");
  }
}

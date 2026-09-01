"use client";

import { useEffect, useRef, useState } from "react";
import { Map, Marker, setWorkerUrl, type StyleSpecification } from "maplibre-gl";
import { PILOT } from "@/lib/data";
import { initials } from "@/lib/avatar";
import { seatTone } from "@/lib/seat";
import type { DropPoint, LngLat, MapMode, Provider } from "@/lib/types";

/** Next/Turbopack does not emit the worker next to maplibre-gl-shared.mjs. */
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

/** OSM sokak haritası (Carto Voyager). 3D binalar yüklenince eklenir. */
const STYLE: StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      maxzoom: 20,
      attribution: "© OpenStreetMap © CARTO",
    },
  },
  layers: [{ id: "carto", type: "raster", source: "carto" }],
};

type Props = {
  mode: MapMode;
  selectedId: string | null;
  dropId: string | null;
  user: LngLat | null;
  meAvatar?: string | null;
  providers: Provider[];
  dropPoints: DropPoint[];
  onSelect: (id: string) => void;
  onSelectDrop: (id: string) => void;
  visible?: boolean;
};

function tightBounds(): [[number, number], [number, number]] {
  return [
    [PILOT.bounds.west, PILOT.bounds.south],
    [PILOT.bounds.east, PILOT.bounds.north],
  ];
}

let cameraGen = 0;

function pinKey(providers: Provider[], dropPoints: DropPoint[]) {
  return [
    ...providers.map((p) => `${p.id}:${p.loc.lng}:${p.loc.lat}:${p.avatarUrl ?? ""}`),
    ...dropPoints.map((d) => `${d.id}:${d.loc.lng}:${d.loc.lat}`),
  ].join("|");
}

export function MapCanvas({
  mode,
  selectedId,
  dropId,
  user,
  meAvatar,
  providers,
  dropPoints,
  onSelect,
  onSelectDrop,
  visible = true,
}: Props) {
  const root = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const markers = useRef<Marker[]>([]);
  const userMarker = useRef<Marker | null>(null);
  const onSelectRef = useRef(onSelect);
  const onSelectDropRef = useRef(onSelectDrop);
  const modeRef = useRef(mode);
  const providersRef = useRef(providers);
  const dropPointsRef = useRef(dropPoints);
  const selectedRef = useRef(selectedId);
  const dropIdRef = useRef(dropId);
  const [mapReady, setMapReady] = useState(false);
  onSelectRef.current = onSelect;
  onSelectDropRef.current = onSelectDrop;
  modeRef.current = mode;
  providersRef.current = providers;
  dropPointsRef.current = dropPoints;
  selectedRef.current = selectedId;
  dropIdRef.current = dropId;
  const pins = pinKey(providers, dropPoints);

  useEffect(() => {
    if (!root.current || mapRef.current) return;

    const map = new Map({
      container: root.current,
      style: STYLE,
      center: [PILOT.center.lng, PILOT.center.lat],
      zoom: PILOT.zoom,
      minZoom: 13.2,
      maxZoom: 18,
      pitch: mode === "3d" ? 58 : 0,
      bearing: mode === "3d" ? -18 : 0,
      maxPitch: 75,
      pitchWithRotate: true,
      canvasContextAttributes: { antialias: true },
      ...(mode === "3d" ? {} : { maxBounds: tightBounds() }),
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
      if (e.sourceId === "openfreemap" && e.isSourceLoaded) {
        ensureBuildings(map, modeRef.current);
      }
    });

    return () => {
      setMapReady(false);
      markers.current.forEach((m) => m.remove());
      markers.current = [];
      userMarker.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    markers.current.forEach((m) => m.remove());
    const next: Marker[] = [];
    providers.forEach((p, i) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "katla-pin";
      el.dataset.id = p.id;
      el.dataset.load = seatTone(p.remaining, p.capacity);
      el.style.setProperty("--pin-delay", `${i * 40}ms`);
      el.setAttribute("aria-label", p.name);
      const face = document.createElement("span");
      face.className = "face";
      if (p.avatarUrl) {
        const img = document.createElement("img");
        img.src = p.avatarUrl;
        img.alt = "";
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
    dropPoints.forEach((d, i) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "katla-drop";
      el.dataset.drop = d.id;
      el.title = d.name;
      el.setAttribute("aria-label", `Gel al noktası: ${d.name}`);
      el.style.setProperty("--pin-delay", `${80 + i * 40}ms`);
      const mark = document.createElement("span");
      mark.className = "mark";
      mark.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 7h10l-.8 11.2a2 2 0 0 1-2 1.8H9.8a2 2 0 0 1-2-1.8L7 7Z" stroke="currentColor" stroke-width="1.9"/><path d="M9 7V5.8A3 3 0 0 1 12 3a3 3 0 0 1 3 2.8V7" stroke="currentColor" stroke-width="1.9"/></svg>`;
      const stem = document.createElement("span");
      stem.className = "stem";
      el.append(mark, stem);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectDropRef.current(d.id);
      });
      next.push(
        new Marker({ element: el, anchor: "bottom" })
          .setLngLat([d.loc.lng, d.loc.lat])
          .addTo(map),
      );
    });
    markers.current = next;
    for (const m of next) {
      const el = m.getElement();
      el.classList.toggle(
        "is-on",
        el.dataset.id === selectedRef.current || el.dataset.drop === dropIdRef.current,
      );
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
      const drop = el.dataset.drop;
      el.classList.toggle("is-on", id === selectedId || drop === dropId);
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
    if (!dropId) return;
    const d = dropPointsRef.current.find((x) => x.id === dropId);
    if (!d) return;
    map.easeTo({
      center: [d.loc.lng, d.loc.lat],
      zoom: Math.max(map.getZoom(), 16),
      duration: 650,
      offset: [0, -64],
      pitch: modeRef.current === "3d" ? Math.max(map.getPitch(), 52) : 0,
      bearing: modeRef.current === "3d" ? map.getBearing() : 0,
      essential: true,
    });
  }, [selectedId, dropId]);

  useEffect(() => {
    for (const m of markers.current) {
      const el = m.getElement();
      const id = el.dataset.id;
      if (!id) continue;
      const p = providers.find((x) => x.id === id);
      if (p) el.dataset.load = seatTone(p.remaining, p.capacity);
    }
  }, [providers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !user) return;
    const inPilot =
      user.lng >= PILOT.bounds.west &&
      user.lng <= PILOT.bounds.east &&
      user.lat >= PILOT.bounds.south &&
      user.lat <= PILOT.bounds.north;
    if (!inPilot) return;
    if (!userMarker.current) {
      const el = document.createElement("div");
      el.className = meAvatar ? "katla-me has-face" : "katla-me";
      if (meAvatar) {
        const img = document.createElement("img");
        img.src = meAvatar;
        img.alt = "";
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
    <div className="absolute inset-0">
      <div ref={root} className="h-full w-full" />
    </div>
  );
}

function syncMode(map: Map, mode: MapMode) {
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

function ensureBuildings(map: Map, mode: MapMode) {
  if (!map.isStyleLoaded()) return;
  if (!map.getSource("openfreemap")) {
    try {
      map.addSource("openfreemap", {
        type: "vector",
        url: "https://tiles.openfreemap.org/planet",
      });
    } catch {
      /* already added */
    }
  }
  if (!map.getLayer("3d-buildings") && map.getSource("openfreemap")) {
    try {
      map.addLayer({
        id: "3d-buildings",
        source: "openfreemap",
        "source-layer": "building",
        type: "fill-extrusion",
        minzoom: 14,
        filter: ["!=", ["get", "hide_3d"], true],
        paint: {
          "fill-extrusion-color": "#8f7d64",
          "fill-extrusion-height": ["coalesce", ["get", "render_height"], 16],
          "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
          "fill-extrusion-opacity": 0.86,
          "fill-extrusion-vertical-gradient": true,
        },
      });
    } catch {
      /* TileJSON / source-layer not ready; sourcedata retries */
    }
  }
  if (map.getLayer("3d-buildings")) {
    map.setLayoutProperty("3d-buildings", "visibility", mode === "3d" ? "visible" : "none");
  }
}

"use client";

import { useEffect, useRef } from "react";
import { Map, Marker, type StyleSpecification } from "maplibre-gl";
import { DROP_POINTS, PILOT, PROVIDERS } from "@/lib/data";
import type { LngLat, MapMode } from "@/lib/types";

/** OSM sokak haritası (Carto Voyager) + 3D için bina vektörü. */
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
    buildings: {
      type: "vector",
      url: "https://tiles.openfreemap.org/planet",
      maxzoom: 14,
    },
  },
  layers: [{ id: "carto", type: "raster", source: "carto" }],
};

type Props = {
  mode: MapMode;
  selectedId: string | null;
  dropId: string | null;
  user: LngLat | null;
  onSelect: (id: string) => void;
  onSelectDrop: (id: string) => void;
};

export function MapCanvas({
  mode,
  selectedId,
  dropId,
  user,
  onSelect,
  onSelectDrop,
}: Props) {
  const root = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const markers = useRef<Marker[]>([]);
  const userMarker = useRef<Marker | null>(null);
  const onSelectRef = useRef(onSelect);
  const onSelectDropRef = useRef(onSelectDrop);
  const modeRef = useRef(mode);
  onSelectRef.current = onSelect;
  onSelectDropRef.current = onSelectDrop;
  modeRef.current = mode;

  useEffect(() => {
    if (!root.current || mapRef.current) return;

    const map = new Map({
      container: root.current,
      style: STYLE,
      center: [PILOT.center.lng, PILOT.center.lat],
      zoom: PILOT.zoom,
      minZoom: 13.2,
      maxZoom: 18,
      pitch: mode === "3d" ? 52 : 0,
      bearing: mode === "3d" ? -12 : 0,
      maxPitch: 62,
      maxBounds: [
        [PILOT.bounds.west, PILOT.bounds.south],
        [PILOT.bounds.east, PILOT.bounds.north],
      ],
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    map.on("load", () => {
      addBuildings(map);
      syncMode(map, modeRef.current);
      map.resize();
    });

    const pins: Marker[] = [];
    for (const p of PROVIDERS) {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "katla-pin";
      el.dataset.id = p.id;
      el.innerHTML = `<span class="dot">${p.rating.toFixed(1)}</span><span class="stem"></span>`;
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectRef.current(p.id);
      });
      pins.push(
        new Marker({ element: el, anchor: "bottom" })
          .setLngLat([p.loc.lng, p.loc.lat])
          .addTo(map),
      );
    }
    for (const d of DROP_POINTS) {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "katla-drop";
      el.dataset.drop = d.id;
      el.title = d.name;
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectDropRef.current(d.id);
      });
      pins.push(
        new Marker({ element: el, anchor: "bottom" })
          .setLngLat([d.loc.lng, d.loc.lat])
          .addTo(map),
      );
    }
    markers.current = pins;

    return () => {
      pins.forEach((m) => m.remove());
      userMarker.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => syncMode(map, mode);
    if (map.loaded()) apply();
    else map.once("load", apply);
  }, [mode]);

  useEffect(() => {
    for (const m of markers.current) {
      const el = m.getElement();
      const id = el.dataset.id;
      const drop = el.dataset.drop;
      el.classList.toggle("is-on", id === selectedId || drop === dropId);
    }
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const p = PROVIDERS.find((x) => x.id === selectedId);
    if (!p) return;
    map.easeTo({
      center: [p.loc.lng, p.loc.lat],
      zoom: Math.max(map.getZoom(), 16.2),
      duration: 650,
      offset: [0, -80],
    });
  }, [selectedId, dropId]);

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
      el.className = "katla-me";
      el.innerHTML = `<span></span>`;
      userMarker.current = new Marker({ element: el, anchor: "center" })
        .setLngLat([user.lng, user.lat])
        .addTo(map);
    } else {
      userMarker.current.setLngLat([user.lng, user.lat]);
    }
  }, [user]);

  return (
    <div className="absolute inset-0">
      <div ref={root} className="h-full w-full" />
    </div>
  );
}

function syncMode(map: Map, mode: MapMode) {
  if (mode === "3d") {
    map.easeTo({ pitch: 52, bearing: -12, duration: 800 });
    map.dragRotate.enable();
    map.touchZoomRotate.enableRotation();
    if (map.getLayer("3d-buildings")) {
      map.setLayoutProperty("3d-buildings", "visibility", "visible");
    }
  } else {
    map.easeTo({ pitch: 0, bearing: 0, duration: 800 });
    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();
    if (map.getLayer("3d-buildings")) {
      map.setLayoutProperty("3d-buildings", "visibility", "none");
    }
  }
}

function addBuildings(map: Map) {
  if (map.getLayer("3d-buildings") || !map.getSource("buildings")) return;
  try {
    map.addLayer({
      id: "3d-buildings",
      source: "buildings",
      "source-layer": "building",
      type: "fill-extrusion",
      minzoom: 14,
      paint: {
        "fill-extrusion-color": "#c9b79a",
        "fill-extrusion-height": [
          "coalesce",
          ["get", "render_height"],
          ["get", "height"],
          14,
        ],
        "fill-extrusion-base": [
          "coalesce",
          ["get", "render_min_height"],
          ["get", "min_height"],
          0,
        ],
        "fill-extrusion-opacity": 0.55,
      },
    });
  } catch {
    /* raster-only 3D (pitch) still works */
  }
}

"use client";

import { classifyGeoError, isInsecureGeoContext, type GeoFailure } from "./geo/locationOrigin";
import type { LngLat } from "./types";

export type PermState = "granted" | "denied" | "prompt" | "unsupported";

const ASKED_KEY = "komsu_perm_asked";

const locListeners = new Set<(loc: LngLat | null) => void>();

export function subscribeLocation(cb: (loc: LngLat | null) => void) {
  locListeners.add(cb);
  return () => {
    locListeners.delete(cb);
  };
}

function publishLocation(loc: LngLat | null) {
  for (const cb of locListeners) cb(loc);
}

export function permissionAsked() {
  try {
    return localStorage.getItem(ASKED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markPermissionAsked() {
  try {
    localStorage.setItem(ASKED_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearPermissionAsked() {
  try {
    localStorage.removeItem(ASKED_KEY);
    localStorage.removeItem("komsu_sms");
  } catch {
    /* ignore */
  }
}

function asState(value: PermissionState | string | undefined): PermState {
  if (value === "granted" || value === "denied" || value === "prompt") return value;
  return "prompt";
}

async function query(name: PermissionName | "camera" | "notifications"): Promise<PermState> {
  if (!("permissions" in navigator) || !navigator.permissions?.query) return "prompt";
  try {
    const status = await navigator.permissions.query({ name } as PermissionDescriptor);
    return asState(status.state);
  } catch {
    return "prompt";
  }
}

export async function locationState(): Promise<PermState> {
  if (!("geolocation" in navigator)) return "unsupported";
  return query("geolocation");
}

export async function notificationState(): Promise<PermState> {
  if (typeof Notification === "undefined") return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return query("notifications");
}

export async function cameraState(): Promise<PermState> {
  if (!navigator.mediaDevices?.getUserMedia) return "unsupported";
  return query("camera");
}

export type GeoAcquireResult = { status: "ok"; loc: LngLat } | { status: GeoFailure };

export async function acquireLocation(): Promise<GeoAcquireResult> {
  if (typeof window === "undefined" || !("geolocation" in navigator)) {
    return { status: "unsupported" };
  }
  if (isInsecureGeoContext(window.isSecureContext)) {
    return { status: "insecure" };
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lng: pos.coords.longitude, lat: pos.coords.latitude };
        publishLocation(loc);
        resolve({ status: "ok", loc });
      },
      (err) => resolve({ status: classifyGeoError(err.code) }),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    );
  });
}

export async function readLocationIfGranted(): Promise<LngLat | null> {
  if (!("geolocation" in navigator)) return null;
  if (typeof window !== "undefined" && isInsecureGeoContext(window.isSecureContext)) return null;
  const state = await locationState();
  if (state !== "granted") return null;
  const result = await acquireLocation();
  return result.status === "ok" ? result.loc : null;
}

export async function requestLocation(): Promise<PermState> {
  const result = await acquireLocation();
  if (result.status === "ok") return "granted";
  if (result.status === "unsupported") return "unsupported";
  if (result.status === "denied") return "denied";
  return "denied";
}

export async function requestNotifications(): Promise<PermState> {
  if (typeof Notification === "undefined") return "unsupported";
  try {
    const result = await Notification.requestPermission();
    return asState(result);
  } catch {
    return "denied";
  }
}

export async function requestCamera(): Promise<PermState> {
  if (!navigator.mediaDevices?.getUserMedia) return "unsupported";
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    for (const track of stream.getTracks()) track.stop();
    return "granted";
  } catch {
    const state = await cameraState();
    return state === "granted" ? "granted" : "denied";
  }
}

export async function requestAppPermissions() {
  const location = await requestLocation();
  const notifications = await requestNotifications();
  const camera = await requestCamera();
  markPermissionAsked();
  return { location, notifications, camera };
}

export function permLabel(state: PermState) {
  if (state === "granted") return "Açık";
  if (state === "denied") return "Kapalı";
  if (state === "unsupported") return "Yok";
  return "İstenmedi";
}

export function showAppNotification(title: string, body: string, tag?: string) {
  if (typeof Notification === "undefined") return false;
  if (Notification.permission !== "granted") return false;
  try {
    const opts: NotificationOptions = { body, tag: tag ?? "komsudan", icon: "/icon" };
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "notify",
        title,
        ...opts,
      });
      return true;
    }
    new Notification(title, opts);
    return true;
  } catch {
    return false;
  }
}

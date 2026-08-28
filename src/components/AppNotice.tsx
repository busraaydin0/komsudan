"use client";

import { useEffect, useRef, useState } from "react";
import type { AppNotification } from "@/lib/types";
import { useNotifications } from "@/lib/api";
import { showAppNotification } from "@/lib/permissions";

const FRESH_MS = 20_000;

export function AppNotice({ onOpen }: { onOpen: (n: AppNotification) => void }) {
  const { notifications } = useNotifications();
  const [toast, setToast] = useState<AppNotification | null>(null);
  const seen = useRef(new Set<string>());
  const started = useRef(Date.now());

  useEffect(() => {
    const fresh = notifications.filter((n) => {
      if (n.readAt) return false;
      if (seen.current.has(n.id)) return false;
      return Date.parse(n.createdAt) >= started.current - FRESH_MS;
    });
    for (const n of notifications) seen.current.add(n.id);
    if (!fresh.length) return;
    const newest = fresh[0]!;
    setToast(newest);
    const hidden = typeof document !== "undefined" && document.visibilityState === "hidden";
    if (hidden || newest.type === "nudge") {
      showAppNotification(newest.title, newest.body, newest.id);
    }
  }, [notifications]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 6500);
    return () => window.clearTimeout(t);
  }, [toast]);

  if (!toast) return null;

  return (
    <button
      type="button"
      onClick={() => {
        onOpen(toast);
        setToast(null);
      }}
      className="k-rise absolute inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-50 mx-auto w-[min(100%-1.5rem,28rem)] rounded-2xl bg-[var(--card)] p-3.5 text-left shadow-[var(--shadow-pop)] ring-1 ring-[var(--line)]"
    >
      <p className="text-[11px] font-medium tracking-[0.14em] text-[var(--teal)] uppercase">Komşudan</p>
      <p className="mt-0.5 font-[family-name:var(--font-display)] text-lg leading-snug">{toast.title}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">{toast.body}</p>
    </button>
  );
}

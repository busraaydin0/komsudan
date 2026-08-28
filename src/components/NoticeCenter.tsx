"use client";

import { useEffect, useState } from "react";
import type { AppNotification } from "@/lib/types";
import { markAllNotificationsRead, markNotificationRead, useNotifications, useSession } from "@/lib/api";
import { pickNudgeCopy } from "@/lib/noticeCopy";
import { requestNotifications, showAppNotification } from "@/lib/permissions";

function when(iso: string) {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NoticeCenter({ onOpen }: { onOpen: (n: AppNotification) => void }) {
  const { notifications, unread, reload } = useNotifications();
  const { account } = useSession();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sample, setSample] = useState<{ title: string; body: string } | null>(null);

  useEffect(() => {
    if (!sample) return;
    const t = window.setTimeout(() => setSample(null), 5500);
    return () => window.clearTimeout(t);
  }, [sample]);

  async function readOne(n: AppNotification) {
    if (busy) return;
    setBusy(true);
    try {
      if (!n.readAt) {
        await markNotificationRead(n.id);
        await reload();
      }
      setOpen(false);
      onOpen(n);
    } finally {
      setBusy(false);
    }
  }

  async function readAll() {
    if (busy || unread === 0) return;
    setBusy(true);
    try {
      await markAllNotificationsRead();
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function trySample() {
    const copy = pickNudgeCopy(undefined, account?.preferredCategoryIds);
    await requestNotifications();
    showAppNotification(copy.title, copy.body, "komsu-demo");
    setSample(copy);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={unread ? `${unread} okunmamış bildirim` : "Bildirimler"}
        className="k-glass absolute top-[max(0.75rem,env(safe-area-inset-top))] right-3 z-[46] grid h-11 w-11 place-items-center rounded-full ring-1 ring-[var(--line)]"
      >
        <BellIcon />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-4 rounded-full bg-[var(--clay)] px-1 text-[10px] font-semibold leading-4 text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute inset-0 z-[55]">
          <button
            type="button"
            aria-label="Bildirimleri kapat"
            className="absolute inset-0 bg-[rgba(28,23,18,0.28)]"
            onClick={() => setOpen(false)}
          />
          <section className="k-rise absolute inset-x-0 top-0 mx-auto max-w-lg rounded-b-3xl bg-[var(--card)] shadow-[var(--shadow-pop)] ring-1 ring-[var(--line)]">
            <div className="flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-2">
              <div>
                <p className="text-[11px] font-medium tracking-[0.14em] text-[var(--teal)] uppercase">
                  Bildirimler
                </p>
                <h2 className="font-[family-name:var(--font-display)] text-2xl">Gelen kutusu</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-sm text-[var(--muted)]">
                Kapat
              </button>
            </div>
            <p className="px-5 pb-3 text-xs text-[var(--muted)]">
              Telefon gibi buradan bak. İzin açıksa kilit ekranı bildirimi de gider; gerçek push yok.
            </p>
            <div className="flex gap-2 px-5 pb-3">
              <button
                type="button"
                onClick={() => void trySample()}
                className="k-press rounded-full bg-[var(--ink)] px-3 py-1.5 text-xs font-medium text-[var(--paper)]"
              >
                Örnek bildirimi göster
              </button>
              {unread > 0 && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void readAll()}
                  className="rounded-full px-3 py-1.5 text-xs text-[var(--clay)]"
                >
                  Tümünü oku
                </button>
              )}
            </div>
            <ul className="max-h-[min(58vh,24rem)] space-y-2 overflow-y-auto px-5 pb-[1.25rem]">
              {notifications.length === 0 ? (
                <li className="rounded-2xl bg-[var(--paper)] px-4 py-6 text-sm text-[var(--muted)]">
                  Henüz bildirim yok. Müşteri hesabında açık sipariş yoksa seçtiğin alana göre hatırlatma düşer.
                </li>
              ) : (
                notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void readOne(n)}
                      className={`w-full rounded-2xl px-3.5 py-3 text-left ring-1 ring-[var(--line)] ${
                        n.readAt ? "bg-[var(--paper)] opacity-70" : "bg-[var(--sand)]"
                      }`}
                    >
                      <span className="flex items-start gap-2">
                        <span
                          className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                            n.readAt ? "bg-transparent" : "bg-[var(--clay)]"
                          }`}
                        />
                        <span className="min-w-0">
                          <span className="block text-sm">{n.title}</span>
                          <span className="mt-0.5 block text-xs text-[var(--muted)]">{n.body}</span>
                          <span className="mt-1 block text-[11px] text-[var(--muted)]">{when(n.createdAt)}</span>
                        </span>
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
      )}

      {sample && (
        <div className="pointer-events-none absolute inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-[56] mx-auto w-[min(100%-1.5rem,22rem)]">
          <div className="rounded-[1.35rem] bg-[color-mix(in_srgb,var(--card)_92%,transparent)] p-3 shadow-[var(--shadow-pop)] ring-1 ring-[var(--line)] backdrop-blur-md">
            <p className="flex items-center gap-2 text-[11px] text-[var(--muted)]">
              <span className="grid h-5 w-5 place-items-center rounded-md bg-[var(--teal)] text-[9px] font-semibold text-[var(--paper)]">
                K
              </span>
              Komşudan · şimdi
            </p>
            <p className="mt-1 text-sm font-medium">{sample.title}</p>
            <p className="text-xs text-[var(--muted)]">{sample.body}</p>
          </div>
        </div>
      )}
    </>
  );
}

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 9.5A6 6 0 0 1 18 9.5c0 5 1.2 6.5 1.2 6.5H4.8S6 14.5 6 9.5Z"
        stroke="var(--ink)"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M10 18.2a2 2 0 0 0 4 0" stroke="var(--ink)" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

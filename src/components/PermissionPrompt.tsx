"use client";

import { useState } from "react";
import { markPermissionAsked, requestAppPermissions } from "@/lib/permissions";

export function PermissionPrompt({
  variant = "overlay",
  onDone,
}: {
  variant?: "overlay" | "card" | "inline";
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function grant() {
    setBusy(true);
    try {
      await requestAppPermissions();
    } finally {
      setBusy(false);
      onDone();
    }
  }

  function skip() {
    markPermissionAsked();
    onDone();
  }

  const body = (
    <>
      {variant !== "inline" && (
        <p className="text-[11px] font-medium tracking-[0.14em] text-[var(--teal)] uppercase">İzinler</p>
      )}
      <h1
        className={`font-[family-name:var(--font-display)] text-2xl leading-tight sm:text-3xl ${
          variant === "inline" ? "" : "mt-1.5"
        }`}
      >
        Konum, bildirim ve kamera
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Yakındaki komşular için konum, sipariş ve hatırlatma için bildirim, iş fotoğrafı
        için kamera. İstediğin zaman Hesap’tan değiştirirsin.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => void grant()}
        className="k-press k-cta mt-4 w-full rounded-full bg-[var(--clay)] px-5 py-2.5 text-sm font-medium text-white shadow-[0_8px_20px_rgba(196,92,38,0.28)]"
      >
        {busy ? "İsteniyor…" : "İzin ver"}
      </button>
      <button type="button" disabled={busy} onClick={skip} className="mt-3 w-full text-xs text-[var(--muted)]">
        Şimdi değil
      </button>
    </>
  );

  if (variant === "inline") return <div>{body}</div>;

  const card = (
    <div className="k-welcome k-glass rounded-3xl p-5 shadow-[var(--shadow-pop)] ring-1 ring-[var(--line)]">{body}</div>
  );

  if (variant === "card") return card;

  return (
    <div className="absolute inset-0 z-50">
      <div className="k-welcome-dim absolute inset-0 bg-[rgba(28,23,18,0.28)]" />
      <div className="absolute inset-x-0 top-[22%] z-10 mx-auto max-w-md px-4">{card}</div>
    </div>
  );
}

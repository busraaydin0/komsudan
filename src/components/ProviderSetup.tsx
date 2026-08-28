"use client";

import { useState } from "react";
import { PILOT } from "@/lib/data";
import {
  fetchMyProvider,
  patchMyProviderProfile,
  postMyAvailability,
  postMyDropPoint,
} from "@/lib/api";
import type { Account } from "@/lib/types";

export function ProviderSetup({
  account,
  categoryId,
  home,
  onDone,
  onSkip,
}: {
  account: Account;
  categoryId: string | null;
  home: { lat: number; lng: number; neighborhood: string } | null;
  onDone: () => void;
  onSkip: () => void;
}) {
  const [bio, setBio] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [packages, setPackages] = useState<string[]>([]);

  async function save() {
    setErr("");
    setBusy(true);
    try {
      await patchMyProviderProfile({
        bio: bio.trim() || undefined,
        lat: home?.lat ?? PILOT.center.lat,
        lng: home?.lng ?? PILOT.center.lng,
        neighborhood: home?.neighborhood ?? PILOT.label,
        categoryId: categoryId ?? undefined,
      });
      const me = await fetchMyProvider();
      const packs = (me.packages as { name?: string }[] | undefined) ?? [];
      setPackages(packs.map((p) => p.name).filter((n): n is string => Boolean(n)));
      try {
        await postMyAvailability({
          dayOfWeek: 1,
          startTime: "18:00",
          endTime: "19:00",
          deliveryMode: "both",
        });
      } catch {
        /* slot zaten olabilir */
      }
      if (home) {
        try {
          await postMyDropPoint({
            label: `${home.neighborhood} nokta`,
            lat: home.lat,
            lng: home.lng,
          });
        } catch {
          /* nokta zaten olabilir */
        }
      }
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Profil kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="font-[family-name:var(--font-display)] text-2xl">Hizmet veren profili</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        {account.name}.{" "}
        {categoryId === "davet"
          ? "Menünü (kısır, pasta, kurabiye ve fiyat) masadan kendin eklersin. Herkes her şeyi sunmaz."
          : "Mevcut paket, müsaitlik ve nokta uçları bu adımda birleşir. Yeni doğrulama yok."}
      </p>
      <label className="mt-4 block text-xs text-[var(--muted)]">Kısa tanıtım</label>
      <textarea
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        rows={3}
        maxLength={500}
        placeholder="Ne yapıyorsun, nasıl teslim ediyorsun?"
        className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-3 text-sm ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
      />
      {packages.length > 0 && (
        <p className="mt-3 text-xs text-[var(--muted)]">Paketler: {packages.join(" · ")}</p>
      )}
      {err && <p className="mt-3 text-sm text-[var(--load-full)]">{err}</p>}
      <button
        type="button"
        disabled={busy}
        onClick={() => void save()}
        className="k-press k-cta mt-4 w-full rounded-full bg-[var(--clay)] py-3 text-sm font-medium text-white"
      >
        {busy ? "Kaydediliyor…" : "Profili kaydet"}
      </button>
      <button type="button" disabled={busy} onClick={onSkip} className="mt-3 w-full text-xs text-[var(--muted)]">
        Şimdi değil
      </button>
    </>
  );
}

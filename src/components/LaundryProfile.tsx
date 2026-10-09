"use client";

import { useEffect, useState } from "react";
import { LAUNDRY_PACKAGES } from "@/lib/laundry/packages";
import { trustLabel } from "@/lib/laundry/pilot";
import { DRYING_OPTIONS, dryingFromProvider } from "@/lib/drying";
import { patchMyProviderProfile } from "@/lib/api";
import { tl } from "@/lib/pricing";
import { providerLoadDisplay } from "@/lib/capacity/display";
import { Avatar } from "@/components/Avatar";
import { PhotoStrip, ReviewList } from "@/components/Photos";
import type { DryingType, PackageId, Provider } from "@/lib/types";

export function LaundryProfile({
  me,
  onChanged,
}: {
  me: Provider | undefined;
  onChanged: () => void;
}) {
  const [bio, setBio] = useState("");
  const [dryingType, setDryingType] = useState<DryingType>("makine");
  const [express, setExpress] = useState(false);
  const [offered, setOffered] = useState<PackageId[]>(["yikama", "katlama", "tam"]);
  const [prices, setPrices] = useState<Record<PackageId, number>>({
    yikama: 9,
    katlama: 13,
    tam: 18,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    if (!me || (me.categoryId && me.categoryId !== "camasir")) return;
    setBio(me.bio);
    setDryingType(dryingFromProvider(me));
    setExpress(me.express);
    const ids = me.packages.map((p) => p.id);
    setOffered(ids.length ? ids : ["katlama"]);
    setPrices({
      yikama: me.packages.find((p) => p.id === "yikama")?.pricePerPiece ?? 9,
      katlama: me.packages.find((p) => p.id === "katlama")?.pricePerPiece ?? 13,
      tam: me.packages.find((p) => p.id === "tam")?.pricePerPiece ?? 18,
    });
  }, [me]);

  if (!me || (me.categoryId && me.categoryId !== "camasir")) return null;

  const loadMeta = providerLoadDisplay(me);
  const tone = loadMeta.tone;

  function togglePack(id: PackageId) {
    setOffered((prev) => {
      if (prev.includes(id)) return prev.length === 1 ? prev : prev.filter((x) => x !== id);
      return [...LAUNDRY_PACKAGES.map((p) => p.id).filter((x) => x === id || prev.includes(x))];
    });
    setOk("");
  }

  async function save() {
    if (offered.length === 0) {
      setErr("En az bir paket açık olsun.");
      return;
    }
    setBusy(true);
    setErr("");
    setOk("");
    try {
      await patchMyProviderProfile({
        bio: bio.trim(),
        dryingType,
        hasDryer: dryingType !== "ip",
        express,
        drops: ["kapi"],
        packages: offered.map((id) => ({ id, pricePerPiece: prices[id] })),
      });
      setOk("Müşterinin göreceği profil kaydedildi.");
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Profil kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="k-rise mt-8 rounded-3xl bg-[var(--card)] p-4 ring-1 ring-[var(--line)]">
      <p className="text-[11px] font-medium tracking-[0.14em] text-[var(--teal)] uppercase">
        Müşterinin gördüğü profil
      </p>
      <div className="mt-2 flex items-start gap-3">
        <Avatar name={me.name} url={me.avatarUrl} size="lg" />
        <div className="min-w-0">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">{me.name}</h2>
          <p className="text-sm text-[var(--muted)]">
            {me.neighborhood} · {trustLabel(me.trust)} · {me.rating} ({me.reviews} yorum) ·{" "}
            <span
              className={
                tone === "full"
                  ? "text-[var(--load-full)]"
                  : tone === "low"
                    ? "text-[var(--load-low)]"
                    : ""
              }
            >
              {loadMeta.deliveryLine ?? loadMeta.loadLabel ?? "Kapasite"}
            </span>
          </p>
        </div>
      </div>

      <textarea
        value={bio}
        onChange={(e) => {
          setBio(e.target.value);
          setOk("");
        }}
        rows={3}
        maxLength={500}
        placeholder="Kurutucu, ütü, kapı teslim — müşteri bunu okur."
        className="mt-3 w-full resize-none rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm leading-relaxed ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
      />

      {(me.workPhotos.length > 0 || me.recentReviews.length > 0) && (
        <>
          <h3 className="mt-4 text-sm font-medium">Yorumlar</h3>
          {me.workPhotos.length > 0 && <PhotoStrip photos={me.workPhotos} />}
          <ReviewList reviews={me.recentReviews} />
        </>
      )}

      <div className="mt-4 grid gap-2">
        {LAUNDRY_PACKAGES.map((pack) => {
          const on = offered.includes(pack.id);
          return (
            <div
              key={pack.id}
              className={`rounded-2xl px-3 py-3 ring-1 ${
                on
                  ? "bg-[var(--sand)] ring-[var(--clay)] shadow-[0_0_0_1px_rgba(196,92,38,0.12)]"
                  : "bg-[var(--paper)] ring-[var(--line)]"
              }`}
            >
              <button type="button" onClick={() => togglePack(pack.id)} className="flex w-full justify-between text-left font-medium">
                {pack.title}
                <span className="tabular-nums text-sm font-normal text-[var(--muted)]">
                  {on ? `${tl(prices[pack.id])}/orta` : "kapalı"}
                </span>
              </button>
              <span className="mt-0.5 block text-xs text-[var(--muted)]">{pack.blurb}</span>
              {on && (
                <label className="mt-2 flex items-center gap-2 text-xs text-[var(--muted)]">
                  ₺/orta boy · 3–5 makine = orta × adet
                  <input
                    inputMode="numeric"
                    value={prices[pack.id]}
                    onChange={(e) => {
                      const n = Number(e.target.value.replace(/\D/g, "").slice(0, 2));
                      setPrices((prev) => ({ ...prev, [pack.id]: n || 1 }));
                      setOk("");
                    }}
                    className="w-14 rounded-full bg-[var(--paper)] px-2 py-1 text-center tabular-nums ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
                  />
                </label>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {DRYING_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => {
              setDryingType(opt.id);
              setOk("");
            }}
            className={`k-chip rounded-full px-3 py-1.5 text-sm ring-1 ${
              dryingType === opt.id ? "bg-[var(--teal)] text-white ring-[var(--teal)]" : "ring-[var(--line)]"
            }`}
          >
            {opt.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setExpress((v) => !v);
            setOk("");
          }}
          className={`k-chip rounded-full px-3 py-1.5 text-sm ring-1 ${
            express ? "bg-[var(--teal)] text-white ring-[var(--teal)]" : "ring-[var(--line)]"
          }`}
        >
          Aynı gün
        </button>
        <span className="k-chip rounded-full px-3 py-1.5 text-sm ring-1 bg-[var(--teal)] text-white ring-[var(--teal)]">
          Kapı teslim
        </span>
      </div>

      {err && <p className="mt-3 text-sm text-[var(--clay)]">{err}</p>}
      {ok && <p className="mt-3 text-sm text-[var(--teal)]">{ok}</p>}
      <button
        type="button"
        disabled={busy}
        onClick={() => void save()}
        className="k-press k-cta mt-4 w-full rounded-full bg-[var(--clay)] py-3 text-sm font-medium text-white shadow-[0_8px_20px_rgba(196,92,38,0.22)]"
      >
        {busy ? "Kaydediliyor…" : "Profili kaydet"}
      </button>
    </div>
  );
}

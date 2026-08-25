"use client";

import { useEffect, useState } from "react";
import type { Loyalty } from "@/lib/loyalty";
import type { Account, WorkPhoto } from "@/lib/types";
import { formatPhone } from "@/lib/phone";
import { fetchMyPhotos, logoutSession, patchAccount, uploadMyPhoto } from "@/lib/api";
import { tl } from "@/lib/pricing";
import { PhotoAdd, PhotoStrip } from "@/components/Photos";

export function AccountScreen({
  account,
  loyalty,
  onLogout,
  onRefresh,
}: {
  account: Account;
  loyalty: Loyalty | null;
  onLogout: () => void;
  onRefresh: () => Promise<void> | void;
}) {
  const [name, setName] = useState(account.name);
  const [sms, setSms] = useState(true);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [photos, setPhotos] = useState<WorkPhoto[]>([]);
  const [photoErr, setPhotoErr] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);

  useEffect(() => {
    setName(account.name);
    const stored = localStorage.getItem("komsu_sms");
    if (stored === "0") setSms(false);
  }, [account.name]);

  useEffect(() => {
    void fetchMyPhotos()
      .then(setPhotos)
      .catch(() => setPhotos([]));
  }, []);

  const nextNeed = loyalty && loyalty.nextAt != null ? Math.max(0, loyalty.nextAt - loyalty.delivered) : 0;

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      await patchAccount({ name });
      localStorage.setItem("komsu_sms", sms ? "1" : "0");
      await onRefresh();
      setMsg("Kaydedildi.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  }

  async function addPhoto(file: File) {
    setPhotoBusy(true);
    setPhotoErr("");
    try {
      const res = await uploadMyPhoto(file);
      setPhotos(res.photos);
    } catch (e) {
      setPhotoErr(e instanceof Error ? e.message : "Fotoğraf yüklenemedi.");
    } finally {
      setPhotoBusy(false);
    }
  }

  async function out() {
    await logoutSession();
    onLogout();
  }

  return (
    <div className="min-h-full bg-[var(--paper)]">
      <header className="mx-auto max-w-lg px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <p className="flex items-center gap-1.5 font-[family-name:var(--font-display)] text-2xl">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--teal)]" />
          Hesap
        </p>
        <p className="text-xs text-[var(--muted)]">{formatPhone(account.phone)}</p>
      </header>

      <main className="mx-auto max-w-lg space-y-4 px-5 pt-5 pb-[calc(var(--tabbar)+1.5rem)]">
        {loyalty && (
          <section className="k-rise overflow-hidden rounded-3xl bg-[var(--teal)] p-5 text-[var(--paper)] shadow-[var(--shadow-card)]">
            <p className="text-[11px] font-medium tracking-[0.18em] uppercase opacity-80">Sadakat</p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl">{loyalty.label}</h2>
            <p className="mt-1 text-sm opacity-90">{loyalty.perk}</p>
            <p className="mt-4 text-xs opacity-80">
              {loyalty.delivered} teslim
              {loyalty.nextLabel
                ? ` · ${loyalty.nextLabel} için ${nextNeed} teslim kaldı`
                : " · en üst kademe"}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-[var(--paper)]"
                style={{
                  width: `${
                    loyalty.nextAt
                      ? Math.min(100, (loyalty.delivered / loyalty.nextAt) * 100)
                      : 100
                  }%`,
                }}
              />
            </div>
            <p className="mt-4 text-sm">
              Damga {loyalty.stamps}/{loyalty.stampGoal}
              {loyalty.stamps === 0 && loyalty.delivered > 0
                ? ` · bu tur doldu, sonraki siparişte ${tl(50)} kupon`
                : ` · ${loyalty.stampGoal} teslimde ${tl(50)} kupon`}
            </p>
            <div className="mt-2 flex gap-1">
              {Array.from({ length: loyalty.stampGoal }, (_, i) => (
                <span
                  key={i}
                    className={`h-2 flex-1 rounded-full ${
                      i < loyalty.stamps ? "bg-[var(--paper)]" : "bg-white/25"
                    }`}
                />
              ))}
            </div>
          </section>
        )}

        <section className="rounded-3xl bg-[var(--card)] p-5 ring-1 ring-[var(--line)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-xl">Profilim</h2>
              <p className="mt-1 text-sm">{account.name || "Ad soyad"}</p>
              <p className="text-xs text-[var(--muted)]">{formatPhone(account.phone)}</p>
            </div>
            <PhotoAdd label="Fotoğraf ekle" busy={photoBusy} onPick={(file) => void addPhoto(file)} />
          </div>
          <p className="mt-3 text-xs text-[var(--muted)]">
            İş karelerin burada. Hizmet veren kartında yorumların yanında görünür.
          </p>
          {photos.length ? (
            <PhotoStrip photos={photos} />
          ) : (
            <p className="mt-3 text-sm text-[var(--muted)]">Henüz fotoğraf yok.</p>
          )}
          {photoErr && <p className="mt-2 text-xs text-[var(--clay)]">{photoErr}</p>}
        </section>

        <section className="rounded-3xl bg-[var(--card)] p-5 ring-1 ring-[var(--line)]">
          <h2 className="font-[family-name:var(--font-display)] text-xl">Ayarlar</h2>
          <label className="mt-3 block text-xs text-[var(--muted)]">Ad soyad</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2.5 text-sm ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
          />
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={sms} onChange={(e) => setSms(e.target.checked)} />
            SMS simülasyonu (kod ve durum)
          </label>
          <ul className="mt-4 space-y-1.5 text-sm">
            <li className="flex justify-between">
              <span className="text-[var(--muted)]">Kimlik</span>
              <span>{account.identityVerified ? "Doğrulandı" : "Eksik"}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-[var(--muted)]">Yüz / cihaz kilidi</span>
              <span>{account.passkeyEnabled ? "Açık" : "Kapalı"}</span>
            </li>
          </ul>
          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className="k-press k-cta mt-4 w-full rounded-full bg-[var(--ink)] py-2.5 text-sm font-medium text-[var(--paper)]"
          >
            {busy ? "Kaydediliyor…" : "Kaydet"}
          </button>
          {msg && <p className="mt-2 text-xs text-[var(--muted)]">{msg}</p>}
        </section>

        <button
          type="button"
          onClick={() => void out()}
          className="w-full py-2 text-sm text-[var(--clay)]"
        >
          Çıkış yap
        </button>
      </main>
    </div>
  );
}

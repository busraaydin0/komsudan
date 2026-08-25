"use client";

import { useCallback, useEffect, useState } from "react";
import type { Loyalty } from "@/lib/loyalty";
import type { Account, WorkPhoto } from "@/lib/types";
import { formatPhone } from "@/lib/phone";
import { deleteMyAccount, fetchMyPhotos, logoutSession, patchAccount, uploadMyPhoto } from "@/lib/api";
import {
  cameraState,
  clearPermissionAsked,
  locationState,
  notificationState,
  permLabel,
  requestCamera,
  requestLocation,
  requestNotifications,
  type PermState,
} from "@/lib/permissions";
import { tl } from "@/lib/pricing";
import { PhotoAdd, PhotoStrip } from "@/components/Photos";

function PermRow({
  title,
  hint,
  state,
  busy,
  onAsk,
}: {
  title: string;
  hint: string;
  state: PermState;
  busy: boolean;
  onAsk: () => void;
}) {
  const open = state === "granted";
  return (
    <li className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
      <div>
        <p className="text-sm">{title}</p>
        <p className="text-xs text-[var(--muted)]">{hint}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className={`text-sm ${open ? "text-[var(--teal)]" : "text-[var(--muted)]"}`}>
          {permLabel(state)}
        </span>
        {state !== "granted" && state !== "unsupported" && (
          <button
            type="button"
            disabled={busy}
            onClick={onAsk}
            className="text-xs text-[var(--clay)]"
          >
            İzin ver
          </button>
        )}
      </div>
    </li>
  );
}

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
  const [geo, setGeo] = useState<PermState>("prompt");
  const [push, setPush] = useState<PermState>("prompt");
  const [cam, setCam] = useState<PermState>("prompt");
  const [permBusy, setPermBusy] = useState<"geo" | "push" | "cam" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteErr, setDeleteErr] = useState("");

  const locked = account.role === "provider" || account.role === "admin";

  const refreshPerms = useCallback(async () => {
    const [g, n, c] = await Promise.all([locationState(), notificationState(), cameraState()]);
    setGeo(g);
    setPush(n);
    setCam(c);
  }, []);

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

  useEffect(() => {
    void refreshPerms();
  }, [refreshPerms]);

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

  async function ask(kind: "geo" | "push" | "cam") {
    setPermBusy(kind);
    try {
      if (kind === "geo") await requestLocation();
      if (kind === "push") await requestNotifications();
      if (kind === "cam") await requestCamera();
      await refreshPerms();
    } finally {
      setPermBusy(null);
    }
  }

  async function out() {
    await logoutSession();
    onLogout();
  }

  async function removeAccount() {
    setDeleteBusy(true);
    setDeleteErr("");
    try {
      await deleteMyAccount();
      clearPermissionAsked();
      onLogout();
    } catch (e) {
      setDeleteErr(e instanceof Error ? e.message : "Hesap silinemedi.");
      setDeleteBusy(false);
    }
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

      <main className="mx-auto max-w-lg space-y-4 px-5 pt-5 pb-[calc(var(--tabbar)+2.75rem)]">
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
          <h2 className="font-[family-name:var(--font-display)] text-xl">İzinler</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Kapalıysa tarayıcı veya telefon ayarından yeniden açılır.
          </p>
          <ul className="mt-3 divide-y divide-[var(--line)]">
            <PermRow
              title="Konum"
              hint="Haritada yakındaki komşular"
              state={geo}
              busy={permBusy === "geo"}
              onAsk={() => void ask("geo")}
            />
            <PermRow
              title="Bildirim"
              hint="Sipariş durumu"
              state={push}
              busy={permBusy === "push"}
              onAsk={() => void ask("push")}
            />
            <PermRow
              title="Kamera"
              hint="İş fotoğrafı"
              state={cam}
              busy={permBusy === "cam"}
              onAsk={() => void ask("cam")}
            />
          </ul>
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

        <section className="scroll-mb-[var(--tabbar)] rounded-3xl bg-[var(--card)] p-5 ring-1 ring-[var(--line)]">
          <h2 className="font-[family-name:var(--font-display)] text-xl">Hesabı kapat</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Telefonun, oturumun ve profilin silinir. Geçmiş siparişler hizmet verende kalır; adın
            kalkar. Bu geri alınmaz.
          </p>
          {locked ? (
            <p className="mt-3 text-sm text-[var(--muted)]">Pilot hizmet veren hesabı silinmez.</p>
          ) : confirmDelete ? (
            <div className="mt-4 space-y-2">
              <button
                type="button"
                disabled={deleteBusy}
                onClick={() => void removeAccount()}
                className="k-press w-full rounded-full bg-[var(--load-full)] py-2.5 text-sm font-medium text-white"
              >
                {deleteBusy ? "Siliniyor…" : "Evet, hesabımı sil"}
              </button>
              <button
                type="button"
                disabled={deleteBusy}
                onClick={() => setConfirmDelete(false)}
                className="w-full py-2 text-xs text-[var(--muted)]"
              >
                Vazgeç
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="mt-4 w-full py-2 text-sm text-[var(--load-full)]"
            >
              Hesabımı sil
            </button>
          )}
          {deleteErr && <p className="mt-2 text-xs text-[var(--clay)]">{deleteErr}</p>}
        </section>
      </main>
    </div>
  );
}

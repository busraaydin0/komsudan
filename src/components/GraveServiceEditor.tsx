"use client";

import { useEffect, useRef, useState } from "react";
import {
  deleteMyGrave,
  fetchMyGraves,
  patchMyGrave,
  postMyGrave,
  uploadMyGravePhoto,
} from "@/lib/api";
import {
  GRAVE_AVAILS,
  GRAVE_FEES,
  GRAVE_FLOWERS,
  GRAVE_KINDS,
  GRAVE_PHOTOS,
  GRAVE_PRICES,
  graveKindList,
  graveUnitMeta,
} from "@/lib/grave";
import { tl } from "@/lib/pricing";
import type {
  GraveAvail,
  GraveFee,
  GraveFlower,
  GraveKind,
  GravePhotoSend,
  GravePrice,
  Provider,
  ProviderGrave,
} from "@/lib/types";

type Draft = {
  name: string;
  kinds: GraveKind;
  description: string;
  cemetery: string;
  radiusKm: string;
  price: string;
  pricing: GravePrice;
  flowers: GraveFlower;
  fees: GraveFee;
  durationMin: string;
  photos: GravePhotoSend;
  avails: GraveAvail;
  workHours: string;
  notes: string;
  isActive: boolean;
};

const emptyKinds = (): GraveKind => ({
  temizlik: true,
  cicek: false,
  sulama: false,
  ot: false,
  cevre: false,
  ziyaret: false,
  other: false,
});
const emptyPricing = (): GravePrice => ({ visit: true, job: false, monthly: false, other: false });
const emptyFlowers = (): GraveFlower => ({ customer: false, provider: true, together: false });
const emptyFees = (): GraveFee => ({ included: true, extra: false });
const emptyPhotos = (): GravePhotoSend => ({ beforeAfter: false, after: true, none: false });
const emptyAvails = (): GraveAvail => ({ once: true, weekly: false, monthly: false, days: false });

const emptyDraft = (): Draft => ({
  name: "",
  kinds: emptyKinds(),
  description: "",
  cemetery: "",
  radiusKm: "10",
  price: "",
  pricing: emptyPricing(),
  flowers: emptyFlowers(),
  fees: emptyFees(),
  durationMin: "45",
  photos: emptyPhotos(),
  avails: emptyAvails(),
  workHours: "",
  notes: "",
  isActive: true,
});

function fromGrave(c: ProviderGrave): Draft {
  return {
    name: c.name,
    kinds: { ...emptyKinds(), ...c.kinds },
    description: c.description ?? "",
    cemetery: c.cemetery ?? "",
    radiusKm: c.radiusKm != null ? String(c.radiusKm) : "10",
    price: c.price ? String(c.price) : "",
    pricing: { ...emptyPricing(), ...c.pricing },
    flowers: { ...emptyFlowers(), ...c.flowers },
    fees: { ...emptyFees(), ...c.fees },
    durationMin: c.durationMin != null ? String(c.durationMin) : "",
    photos: { ...emptyPhotos(), ...c.photos },
    avails: { ...emptyAvails(), ...c.avails },
    workHours: c.workHours ?? "",
    notes: c.notes ?? "",
    isActive: c.isActive !== false,
  };
}

function anyTrue(obj: Record<string, boolean>) {
  return Object.values(obj).some(Boolean);
}

export function GraveServiceEditor({
  me,
  onChanged,
}: {
  me: Provider | undefined;
  onChanged: () => void;
}) {
  const [items, setItems] = useState<ProviderGrave[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function reloadMine() {
    try {
      setItems(await fetchMyGraves());
    } catch {
      setItems(me?.graves ?? []);
    }
  }

  useEffect(() => {
    if (!me || me.categoryId !== "mezar") return;
    void fetchMyGraves()
      .then(setItems)
      .catch(() => setItems(me.graves ?? []));
  }, [me?.id, me?.categoryId]);

  if (!me || me.categoryId !== "mezar") return null;

  function patch<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setErr("");
  }

  function toggle<T extends Record<string, boolean>>(
    key: "kinds" | "pricing" | "flowers" | "fees" | "photos" | "avails",
    id: keyof T,
  ) {
    setDraft((prev) => ({
      ...prev,
      [key]: { ...prev[key], [id]: !prev[key][id as keyof (typeof prev)[typeof key]] },
    }));
    setErr("");
  }

  function startNew() {
    setEditId(null);
    setDraft(emptyDraft());
    setPhoto(null);
    setPreview("");
    setOpen(true);
    setErr("");
  }

  function startEdit(item: ProviderGrave) {
    setEditId(item.id);
    setDraft(fromGrave(item));
    setPhoto(null);
    setPreview(item.photoUrl ?? "");
    setOpen(true);
    setErr("");
  }

  function onPickPhoto(file: File | null) {
    setPhoto(file);
    if (file) setPreview(URL.createObjectURL(file));
  }

  function payload() {
    const n = Number(draft.price) || 0;
    const radiusKm = draft.radiusKm.trim() ? Number(draft.radiusKm) : 10;
    const durationMin = draft.durationMin.trim() ? Number(draft.durationMin) : null;
    return {
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      kinds: draft.kinds,
      cemetery: draft.cemetery.trim() || null,
      radiusKm,
      price: n,
      pricing: draft.pricing,
      flowers: draft.flowers,
      fees: draft.fees,
      durationMin,
      photos: draft.photos,
      avails: draft.avails,
      workHours: draft.workHours.trim() || null,
      notes: draft.notes.trim() || null,
      isActive: draft.isActive,
    };
  }

  async function save() {
    const body = payload();
    if (body.name.length < 2) {
      setErr("Hizmet adı yaz.");
      return;
    }
    if (!anyTrue(body.kinds)) {
      setErr("En az bir hizmet türü seç.");
      return;
    }
    if (!body.cemetery || body.cemetery.length < 2) {
      setErr("Mezarlık / bölge yaz.");
      return;
    }
    if (!Number.isInteger(body.radiusKm) || body.radiusKm < 1) {
      setErr("Hizmet alanı 1 km ve üzeri olsun.");
      return;
    }
    if (!Number.isInteger(body.price) || body.price < 1) {
      setErr("Fiyat tam sayı ₺ olsun.");
      return;
    }
    if (!anyTrue(body.pricing)) {
      setErr("En az bir fiyatlandırma seç.");
      return;
    }
    if (!anyTrue(body.flowers)) {
      setErr("Çiçek / bitki seçeneği seç.");
      return;
    }
    if (!anyTrue(body.fees)) {
      setErr("Çiçek / malzeme ücretini seç.");
      return;
    }
    if (body.durationMin != null && (!Number.isInteger(body.durationMin) || body.durationMin < 1)) {
      setErr("Süre dakika olarak 1 ve üzeri olsun.");
      return;
    }
    if (!anyTrue(body.photos)) {
      setErr("Fotoğraf gönderme seçeneği seç.");
      return;
    }
    if (!anyTrue(body.avails)) {
      setErr("En az bir müsaitlik seç.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const saved = editId ? await patchMyGrave(editId, body) : await postMyGrave(body);
      if (photo) await uploadMyGravePhoto(saved.id, photo);
      setOpen(false);
      setPhoto(null);
      await reloadMine();
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Hizmet kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setErr("");
    try {
      await deleteMyGrave(id);
      if (editId === id) setOpen(false);
      await reloadMine();
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Kaldırılamadı.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="k-rise mt-8 rounded-3xl bg-[var(--card)] p-4 ring-1 ring-[var(--line)]">
      <h2 className="font-[family-name:var(--font-display)] text-xl">Hizmetlerim</h2>
      <p className="mt-1 text-xs text-[var(--muted)]">Mezar kartı. İşlem başı tutar sunucuda çarpılır.</p>
      <ul className="mt-3 space-y-2">
        {items.length === 0 && <li className="text-sm text-[var(--muted)]">Henüz hizmet yok.</li>}
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-2 rounded-2xl bg-[var(--paper)] px-2 py-2 ring-1 ring-[var(--line)]">
            {item.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.photoUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
            ) : (
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[var(--card)] text-lg" aria-hidden>
                🪦
              </span>
            )}
            <button type="button" onClick={() => startEdit(item)} className="min-w-0 flex-1 text-left text-sm">
              <span className="block font-medium">{item.name}</span>
              <span className="text-xs text-[var(--muted)]">
                {tl(item.price)}/{graveUnitMeta(item.pricing).qty}
                {graveKindList(item.kinds).length ? ` · ${graveKindList(item.kinds).join(", ")}` : ""}
                {item.isActive === false ? " · pasif" : ""}
              </span>
            </button>
            <button type="button" disabled={busy} onClick={() => void remove(item.id)} className="text-xs text-[var(--clay)]">
              Kaldır
            </button>
          </li>
        ))}
      </ul>

      {!open && (
        <button type="button" onClick={startNew} className="k-press mt-3 w-full rounded-full bg-[var(--ink)] py-2.5 text-sm font-medium text-[var(--paper)]">
          + Hizmet ekle
        </button>
      )}

      {open && (
        <form
          className="mt-4 grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <p className="text-sm font-medium">{editId ? "Hizmeti düzenle" : "Mezar Bakımı & Çiçeklendirme — Hizmet Ekle"}</p>

          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => onPickPhoto(e.target.files?.[0] ?? null)} />
          <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-3 rounded-2xl bg-[var(--paper)] px-3 py-3 text-left text-sm ring-1 ring-[var(--line)]">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="h-14 w-14 rounded-xl object-cover" />
            ) : (
              <span className="grid h-14 w-14 place-items-center rounded-xl bg-[var(--card)] text-xl">📷</span>
            )}
            <span>
              <span className="block font-medium">Hizmet Fotoğrafı</span>
              <span className="text-xs text-[var(--muted)]">+ Fotoğraf Ekle · JPEG, PNG veya WebP</span>
            </span>
          </button>

          <label className="block text-xs text-[var(--muted)]">
            Hizmet Adı
            <input
              value={draft.name}
              onChange={(e) => patch("name", e.target.value)}
              maxLength={80}
              placeholder="Mezar bakımı, çiçeklendirme…"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Hizmet Türü</legend>
            <div className="mt-1.5 grid gap-1.5">
              {GRAVE_KINDS.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={draft.kinds[row.id]} onChange={() => toggle<GraveKind>("kinds", row.id)} />
                  {row.label}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block text-xs text-[var(--muted)]">
            Kısaca Hizmetini Anlat
            <textarea
              value={draft.description}
              onChange={(e) => patch("description", e.target.value)}
              maxLength={400}
              rows={2}
              placeholder="Nasıl bakıyorsun, hangi mezarlıklar, çiçek tercihi…"
              className="mt-1 w-full resize-none rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <label className="block text-xs text-[var(--muted)]">
            Mezar Konumu
            <input
              value={draft.cemetery}
              onChange={(e) => patch("cemetery", e.target.value)}
              maxLength={120}
              placeholder="Mezarlık / Bölge"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <label className="block text-xs text-[var(--muted)]">
            Hizmet Alanı
            <input
              inputMode="numeric"
              value={draft.radiusKm}
              onChange={(e) => patch("radiusKm", e.target.value.replace(/\D/g, "").slice(0, 3))}
              placeholder="km"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm tabular-nums text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
            <span className="mt-0.5 block">km&apos;ye kadar</span>
          </label>

          <label className="block text-xs text-[var(--muted)]">
            Fiyat
            <input
              inputMode="numeric"
              value={draft.price}
              onChange={(e) => patch("price", e.target.value.replace(/\D/g, "").slice(0, 5))}
              placeholder="₺"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm tabular-nums text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Fiyatlandırma</legend>
            <div className="mt-1.5 grid gap-1.5">
              {GRAVE_PRICES.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={draft.pricing[row.id]} onChange={() => toggle<GravePrice>("pricing", row.id)} />
                  {row.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Çiçek / Bitki</legend>
            <div className="mt-1.5 grid gap-1.5">
              {GRAVE_FLOWERS.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={draft.flowers[row.id]} onChange={() => toggle<GraveFlower>("flowers", row.id)} />
                  {row.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Çiçek / Malzeme Ücreti</legend>
            <div className="mt-1.5 grid gap-1.5">
              {GRAVE_FEES.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={draft.fees[row.id]} onChange={() => toggle<GraveFee>("fees", row.id)} />
                  {row.label}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block text-xs text-[var(--muted)]">
            Tahmini Hizmet Süresi
            <input
              inputMode="numeric"
              value={draft.durationMin}
              onChange={(e) => patch("durationMin", e.target.value.replace(/\D/g, "").slice(0, 3))}
              placeholder="dakika"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm tabular-nums text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
            <span className="mt-0.5 block">dakika</span>
          </label>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Fotoğraf Gönderme</legend>
            <div className="mt-1.5 grid gap-1.5">
              {GRAVE_PHOTOS.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={draft.photos[row.id]} onChange={() => toggle<GravePhotoSend>("photos", row.id)} />
                  {row.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Müsaitlik</legend>
            <div className="mt-1.5 grid gap-1.5">
              {GRAVE_AVAILS.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={draft.avails[row.id]} onChange={() => toggle<GraveAvail>("avails", row.id)} />
                  {row.label}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block text-xs text-[var(--muted)]">
            Çalışma Günleri / Saatleri
            <input
              value={draft.workHours}
              onChange={(e) => patch("workHours", e.target.value)}
              maxLength={80}
              placeholder="Hafta içi 09:00–16:00…"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <label className="block text-xs text-[var(--muted)]">
            Özel Notlar
            <textarea
              value={draft.notes}
              onChange={(e) => patch("notes", e.target.value)}
              maxLength={400}
              rows={2}
              placeholder="Parsel no, çiçek tercihi, yağmur…"
              className="mt-1 w-full resize-none rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Aktif Hizmet</legend>
            <div className="mt-1.5 flex gap-2">
              <button
                type="button"
                onClick={() => patch("isActive", true)}
                className={`k-chip rounded-full px-3 py-1.5 text-sm ring-1 ${
                  draft.isActive ? "bg-[var(--teal)] text-white ring-[var(--teal)]" : "ring-[var(--line)]"
                }`}
              >
                Aktif
              </button>
              <button
                type="button"
                onClick={() => patch("isActive", false)}
                className={`k-chip rounded-full px-3 py-1.5 text-sm ring-1 ${
                  !draft.isActive ? "bg-[var(--clay)] text-white ring-[var(--clay)]" : "ring-[var(--line)]"
                }`}
              >
                Pasif
              </button>
            </div>
          </fieldset>

          {err && <p className="text-sm text-[var(--clay)]">{err}</p>}
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => setOpen(false)} className="flex-1 rounded-full py-2.5 text-sm ring-1 ring-[var(--line)]">
              Vazgeç
            </button>
            <button type="submit" disabled={busy} className="k-press k-cta flex-1 rounded-full bg-[var(--clay)] py-2.5 text-sm font-medium text-white">
              {busy ? "Kaydediliyor…" : editId ? "Kaydet" : "Hizmeti Yayınla"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

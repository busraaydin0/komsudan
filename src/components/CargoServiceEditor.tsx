"use client";

import { useEffect, useRef, useState } from "react";
import {
  deleteMyCargo,
  fetchMyCargos,
  patchMyCargo,
  postMyCargo,
  uploadMyCargoPhoto,
} from "@/lib/api";
import {
  CARGO_AVAILS,
  CARGO_CONFIRMS,
  CARGO_DROPS,
  CARGO_JOBS,
  CARGO_PICKUPS,
  CARGO_PRICE_TYPES,
  CARGO_SIZES,
  cargoJobList,
} from "@/lib/cargo";
import { tl } from "@/lib/pricing";
import type {
  CargoAvail,
  CargoConfirm,
  CargoDrop,
  CargoJobs,
  CargoPickup,
  CargoPriceType,
  CargoSize,
  Provider,
  ProviderCargo,
} from "@/lib/types";

type Draft = {
  name: string;
  jobs: CargoJobs;
  sizes: CargoSize;
  maxKm: string;
  branches: string;
  points: string;
  price: string;
  priceType: CargoPriceType;
  durationMin: string;
  avail: CargoAvail;
  workHours: string;
  pickup: CargoPickup;
  dropoff: CargoDrop;
  confirm: CargoConfirm;
  refuse: string;
  notes: string;
  isActive: boolean;
};

const emptyJobs = (): CargoJobs => ({
  subeAl: true,
  subeBirak: false,
  noktaNokta: false,
  alNokta: false,
  teslimSube: false,
});
const emptySizes = (): CargoSize => ({ kucuk: true, orta: true, buyuk: false });
const emptyPickup = (): CargoPickup => ({ sube: true, adres: false, nokta: false });
const emptyDropoff = (): CargoDrop => ({ sube: false, adres: true, nokta: false });
const emptyConfirm = (): CargoConfirm => ({ kod: true, app: false });

const emptyDraft = (): Draft => ({
  name: "",
  jobs: emptyJobs(),
  sizes: emptySizes(),
  maxKm: "5",
  branches: "",
  points: "",
  price: "",
  priceType: "sabit",
  durationMin: "30",
  avail: "hemen",
  workHours: "",
  pickup: emptyPickup(),
  dropoff: emptyDropoff(),
  confirm: emptyConfirm(),
  refuse: "",
  notes: "",
  isActive: true,
});

function fromCargo(c: ProviderCargo): Draft {
  return {
    name: c.name,
    jobs: { ...emptyJobs(), ...c.jobs },
    sizes: { ...emptySizes(), ...c.sizes },
    maxKm: c.maxKm != null ? String(c.maxKm) : "",
    branches: c.branches ?? "",
    points: c.points ?? "",
    price: c.price ? String(c.price) : "",
    priceType: c.priceType ?? "sabit",
    durationMin: c.durationMin != null ? String(c.durationMin) : "",
    avail: c.avail ?? "hemen",
    workHours: c.workHours ?? "",
    pickup: { ...emptyPickup(), ...c.pickup },
    dropoff: { ...emptyDropoff(), ...c.dropoff },
    confirm: { ...emptyConfirm(), ...c.confirm },
    refuse: c.refuse ?? "",
    notes: c.notes ?? "",
    isActive: c.isActive !== false,
  };
}

function anyTrue(obj: Record<string, boolean>) {
  return Object.values(obj).some(Boolean);
}

export function CargoServiceEditor({
  me,
  onChanged,
}: {
  me: Provider | undefined;
  onChanged: () => void;
}) {
  const [items, setItems] = useState<ProviderCargo[]>([]);
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
      setItems(await fetchMyCargos());
    } catch {
      setItems(me?.cargos ?? []);
    }
  }

  useEffect(() => {
    if (!me || me.categoryId !== "kargo") return;
    void fetchMyCargos()
      .then(setItems)
      .catch(() => setItems(me.cargos ?? []));
  }, [me?.id, me?.categoryId]);

  if (!me || me.categoryId !== "kargo") return null;

  function patch<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setErr("");
  }

  function toggle<T extends Record<string, boolean>>(key: "jobs" | "sizes" | "pickup" | "dropoff" | "confirm", id: keyof T) {
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

  function startEdit(item: ProviderCargo) {
    setEditId(item.id);
    setDraft(fromCargo(item));
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
    const maxKm = draft.maxKm.trim() ? Number(draft.maxKm) : 5;
    const durationMin = draft.durationMin.trim() ? Number(draft.durationMin) : null;
    return {
      name: draft.name.trim(),
      jobs: draft.jobs,
      sizes: draft.sizes,
      maxKm,
      branches: draft.branches.trim() || null,
      points: draft.points.trim() || null,
      price: n,
      priceType: draft.priceType,
      durationMin,
      avail: draft.avail,
      workHours: draft.workHours.trim() || null,
      pickup: draft.pickup,
      dropoff: draft.dropoff,
      confirm: draft.confirm,
      refuse: draft.refuse.trim() || null,
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
    if (!anyTrue(body.jobs)) {
      setErr("En az bir hizmet türü seç.");
      return;
    }
    if (!anyTrue(body.sizes)) {
      setErr("En az bir paket boyutu seç.");
      return;
    }
    if (!Number.isInteger(body.maxKm) || body.maxKm < 1) {
      setErr("Bölge 1 km ve üzeri olsun.");
      return;
    }
    if (!Number.isInteger(body.price) || body.price < 1) {
      setErr("Fiyat tam sayı ₺ olsun.");
      return;
    }
    if (!anyTrue(body.pickup)) {
      setErr("En az bir teslim alma yöntemi seç.");
      return;
    }
    if (!anyTrue(body.dropoff)) {
      setErr("En az bir teslim etme yöntemi seç.");
      return;
    }
    if (!anyTrue(body.confirm)) {
      setErr("En az bir teslim doğrulama seç.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const saved = editId ? await patchMyCargo(editId, body) : await postMyCargo(body);
      if (photo) await uploadMyCargoPhoto(saved.id, photo);
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
      await deleteMyCargo(id);
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
      <p className="mt-1 text-xs text-[var(--muted)]">
        Kargo ve paket kartı. Şubeden al, noktaya bırak. Tutar sunucuda çarpılır.
      </p>
      <ul className="mt-3 space-y-2">
        {items.length === 0 && <li className="text-sm text-[var(--muted)]">Henüz hizmet yok.</li>}
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-2 rounded-2xl bg-[var(--paper)] px-2 py-2 ring-1 ring-[var(--line)]">
            {item.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.photoUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
            ) : (
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[var(--card)] text-lg" aria-hidden>
                📦
              </span>
            )}
            <button type="button" onClick={() => startEdit(item)} className="min-w-0 flex-1 text-left text-sm">
              <span className="block font-medium">{item.name}</span>
              <span className="text-xs text-[var(--muted)]">
                {item.priceType === "mesafe" ? `${tl(item.price)}'den` : `${tl(item.price)}/paket`}
                {cargoJobList(item.jobs).length ? ` · ${cargoJobList(item.jobs)[0]}` : ""}
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
          <p className="text-sm font-medium">{editId ? "Hizmeti düzenle" : "Kargo & Paket — Hizmet Ekle"}</p>

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
              placeholder="Şubeden al, noktaya bırak…"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Hizmet Türü</legend>
            <div className="mt-1.5 grid gap-1.5">
              {CARGO_JOBS.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={draft.jobs[row.id]} onChange={() => toggle<CargoJobs>("jobs", row.id)} />
                  {row.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Paket Boyutu</legend>
            <div className="mt-1.5 grid gap-1.5">
              {CARGO_SIZES.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={draft.sizes[row.id]} onChange={() => toggle<CargoSize>("sizes", row.id)} />
                  {row.label}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block text-xs text-[var(--muted)]">
            Hizmet Bölgesi
            <input
              inputMode="numeric"
              value={draft.maxKm}
              onChange={(e) => patch("maxKm", e.target.value.replace(/\D/g, "").slice(0, 2))}
              placeholder="km"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm tabular-nums text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
            <span className="mt-0.5 block">km çevresinde</span>
          </label>

          <label className="block text-xs text-[var(--muted)]">
            Kargo Şubeleri
            <input
              value={draft.branches}
              onChange={(e) => patch("branches", e.target.value)}
              maxLength={160}
              placeholder="Hizmet verebildiğim şubeler: Yurtiçi Çukurambar, PTT…"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <label className="block text-xs text-[var(--muted)]">
            Teslim / Alma Noktaları
            <textarea
              value={draft.points}
              onChange={(e) => patch("points", e.target.value)}
              maxLength={400}
              rows={2}
              placeholder="Site kapısı, AVM giriş, nötr nokta…"
              className="mt-1 w-full resize-none rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <label className="block text-xs text-[var(--muted)]">
            Hizmet Ücreti
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
              {CARGO_PRICE_TYPES.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input type="radio" name="cargo-price-type" checked={draft.priceType === row.id} onChange={() => patch("priceType", row.id)} />
                  {row.label}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block text-xs text-[var(--muted)]">
            Tahmini Süre
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
            <legend className="text-xs text-[var(--muted)]">Müsaitlik</legend>
            <div className="mt-1.5 grid gap-1.5">
              {CARGO_AVAILS.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input type="radio" name="cargo-avail" checked={draft.avail === row.id} onChange={() => patch("avail", row.id)} />
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
              placeholder="Hafta içi 09:00–18:00"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Paket Teslim Alma</legend>
            <div className="mt-1.5 grid gap-1.5">
              {CARGO_PICKUPS.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={draft.pickup[row.id]} onChange={() => toggle<CargoPickup>("pickup", row.id)} />
                  {row.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Paket Teslim Etme</legend>
            <div className="mt-1.5 grid gap-1.5">
              {CARGO_DROPS.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={draft.dropoff[row.id]} onChange={() => toggle<CargoDrop>("dropoff", row.id)} />
                  {row.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Teslim Doğrulama</legend>
            <div className="mt-1.5 grid gap-1.5">
              {CARGO_CONFIRMS.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={draft.confirm[row.id]} onChange={() => toggle<CargoConfirm>("confirm", row.id)} />
                  {row.label}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block text-xs text-[var(--muted)]">
            Taşımadığım Paketler / Ürünler
            <textarea
              value={draft.refuse}
              onChange={(e) => patch("refuse", e.target.value)}
              maxLength={400}
              rows={2}
              placeholder="Kırılgan cam, canlı hayvan, tehlikeli madde…"
              className="mt-1 w-full resize-none rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <label className="block text-xs text-[var(--muted)]">
            Özel Notlar
            <textarea
              value={draft.notes}
              onChange={(e) => patch("notes", e.target.value)}
              maxLength={400}
              rows={2}
              placeholder="Takip no, kapı kodu, bekletme…"
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

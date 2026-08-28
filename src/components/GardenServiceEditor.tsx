"use client";

import { useEffect, useRef, useState } from "react";
import {
  deleteMyGarden,
  fetchMyGardens,
  patchMyGarden,
  postMyGarden,
  uploadMyGardenPhoto,
} from "@/lib/api";
import {
  GARDEN_AREAS,
  GARDEN_AVAILS,
  GARDEN_EQUIPMENT,
  GARDEN_JOBS,
  GARDEN_PRICE_TYPES,
  gardenJobList,
} from "@/lib/garden";
import { tl } from "@/lib/pricing";
import type {
  GardenArea,
  GardenAvail,
  GardenEquipment,
  GardenJobs,
  GardenPriceType,
  Provider,
  ProviderGarden,
} from "@/lib/types";

type DurationUnit = "dakika" | "saat";

type Draft = {
  name: string;
  description: string;
  jobs: GardenJobs;
  areas: GardenArea;
  price: string;
  priceType: GardenPriceType;
  duration: string;
  durationUnit: DurationUnit;
  equipment: GardenEquipment;
  location: string;
  maxKm: string;
  avail: GardenAvail;
  workHours: string;
  canDo: string;
  cannotDo: string;
  notes: string;
  isActive: boolean;
};

const emptyJobs = (): GardenJobs => ({
  cim: true,
  budama: false,
  ot: false,
  yaprak: false,
  dikim: false,
  saksi: false,
  tasima: false,
  sulama: false,
  duzen: false,
  diger: false,
});

const emptyAreas = (): GardenArea => ({ kucuk: true, orta: false, buyuk: false });

const emptyDraft = (): Draft => ({
  name: "",
  description: "",
  jobs: emptyJobs(),
  areas: emptyAreas(),
  price: "",
  priceType: "sabit",
  duration: "60",
  durationUnit: "dakika",
  equipment: "provider",
  location: "",
  maxKm: "5",
  avail: "randevu",
  workHours: "",
  canDo: "",
  cannotDo: "",
  notes: "",
  isActive: true,
});

function durationFromMin(min?: number | null): { duration: string; durationUnit: DurationUnit } {
  if (min == null || min < 0) return { duration: "", durationUnit: "dakika" };
  if (min >= 60 && min % 60 === 0) return { duration: String(min / 60), durationUnit: "saat" };
  return { duration: String(min), durationUnit: "dakika" };
}

function fromGarden(g: ProviderGarden): Draft {
  const d = durationFromMin(g.durationMin);
  return {
    name: g.name,
    description: g.description ?? "",
    jobs: { ...emptyJobs(), ...g.jobs },
    areas: { ...emptyAreas(), ...g.areas },
    price: g.price ? String(g.price) : "",
    priceType: g.priceType ?? "sabit",
    duration: d.duration,
    durationUnit: d.durationUnit,
    equipment: g.equipment ?? "provider",
    location: g.location ?? "",
    maxKm: g.maxKm != null ? String(g.maxKm) : "",
    avail: g.avail ?? "randevu",
    workHours: g.workHours ?? "",
    canDo: g.canDo ?? "",
    cannotDo: g.cannotDo ?? "",
    notes: g.notes ?? "",
    isActive: g.isActive !== false,
  };
}

function anyTrue(obj: Record<string, boolean>) {
  return Object.values(obj).some(Boolean);
}

export function GardenServiceEditor({
  me,
  onChanged,
}: {
  me: Provider | undefined;
  onChanged: () => void;
}) {
  const [items, setItems] = useState<ProviderGarden[]>([]);
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
      setItems(await fetchMyGardens());
    } catch {
      setItems(me?.gardens ?? []);
    }
  }

  useEffect(() => {
    if (!me || me.categoryId !== "bahce") return;
    void fetchMyGardens()
      .then(setItems)
      .catch(() => setItems(me.gardens ?? []));
  }, [me?.id, me?.categoryId]);

  if (!me || me.categoryId !== "bahce") return null;

  function patch<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setErr("");
  }

  function toggleJob(id: keyof GardenJobs) {
    setDraft((prev) => ({ ...prev, jobs: { ...prev.jobs, [id]: !prev.jobs[id] } }));
    setErr("");
  }

  function toggleArea(id: keyof GardenArea) {
    setDraft((prev) => ({ ...prev, areas: { ...prev.areas, [id]: !prev.areas[id] } }));
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

  function startEdit(item: ProviderGarden) {
    setEditId(item.id);
    setDraft(fromGarden(item));
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
    const raw = draft.duration.trim() ? Number(draft.duration) : null;
    const durationMin =
      raw == null || !Number.isFinite(raw)
        ? null
        : draft.durationUnit === "saat"
          ? Math.round(raw * 60)
          : Math.round(raw);
    return {
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      jobs: draft.jobs,
      areas: draft.areas,
      price: n,
      priceType: draft.priceType,
      durationMin,
      equipment: draft.equipment,
      location: draft.location.trim() || null,
      maxKm,
      avail: draft.avail,
      workHours: draft.workHours.trim() || null,
      canDo: draft.canDo.trim() || null,
      cannotDo: draft.cannotDo.trim() || null,
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
    if (!anyTrue(body.areas)) {
      setErr("En az bir alan / iş boyutu seç.");
      return;
    }
    if (!Number.isInteger(body.price) || body.price < 1) {
      setErr("Fiyat tam sayı ₺ olsun.");
      return;
    }
    if (!Number.isInteger(body.maxKm) || body.maxKm < 1) {
      setErr("Mesafe 1 km ve üzeri olsun.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const saved = editId ? await patchMyGarden(editId, body) : await postMyGarden(body);
      if (photo) await uploadMyGardenPhoto(saved.id, photo);
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
      await deleteMyGarden(id);
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
        Bahçe ve bitki kartı. İş bahçede yapılır. Tutar sunucuda çarpılır.
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
                🌱
              </span>
            )}
            <button type="button" onClick={() => startEdit(item)} className="min-w-0 flex-1 text-left text-sm">
              <span className="block font-medium">{item.name}</span>
              <span className="text-xs text-[var(--muted)]">
                {item.priceType === "sabit" ? `${tl(item.price)}/iş` : `${tl(item.price)}'den`}
                {gardenJobList(item.jobs).length ? ` · ${gardenJobList(item.jobs).slice(0, 2).join(", ")}` : ""}
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
        <button
          type="button"
          onClick={startNew}
          className="k-press mt-3 w-full rounded-full bg-[var(--ink)] py-2.5 text-sm font-medium text-[var(--paper)]"
        >
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
          <p className="text-sm font-medium">{editId ? "Hizmeti düzenle" : "Bahçe & Bitki — Hizmet Ekle"}</p>

          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => onPickPhoto(e.target.files?.[0] ?? null)} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-3 rounded-2xl bg-[var(--paper)] px-3 py-3 text-left text-sm ring-1 ring-[var(--line)]"
          >
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
              placeholder="Çim biçme, budama, saksı…"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Hizmet Türü</legend>
            <div className="mt-1.5 grid gap-1.5">
              {GARDEN_JOBS.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={draft.jobs[row.id]} onChange={() => toggleJob(row.id)} />
                  {row.label}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block text-xs text-[var(--muted)]">
            Hizmet Açıklaması
            <textarea
              value={draft.description}
              onChange={(e) => patch("description", e.target.value)}
              maxLength={400}
              rows={2}
              placeholder="Hangi bahçe, hangi bitki, nelere bakmazsın…"
              className="mt-1 w-full resize-none rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Alan / İş Boyutu</legend>
            <div className="mt-1.5 grid gap-1.5">
              {GARDEN_AREAS.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={draft.areas[row.id]} onChange={() => toggleArea(row.id)} />
                  {row.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Fiyatlandırma</legend>
            <div className="mt-1.5 grid gap-1.5">
              {GARDEN_PRICE_TYPES.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="garden-price-type"
                    checked={draft.priceType === row.id}
                    onChange={() => patch("priceType", row.id)}
                  />
                  {row.label}
                </label>
              ))}
            </div>
          </fieldset>

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
            <legend className="text-xs text-[var(--muted)]">Tahmini Süre</legend>
            <input
              inputMode="numeric"
              value={draft.duration}
              onChange={(e) => patch("duration", e.target.value.replace(/\D/g, "").slice(0, 3))}
              placeholder={draft.durationUnit === "saat" ? "saat" : "dakika"}
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm tabular-nums text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
            <div className="mt-1.5 flex gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="garden-duration-unit"
                  checked={draft.durationUnit === "dakika"}
                  onChange={() => patch("durationUnit", "dakika")}
                />
                dakika
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="garden-duration-unit"
                  checked={draft.durationUnit === "saat"}
                  onChange={() => patch("durationUnit", "saat")}
                />
                saat
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Gerekli Ekipman</legend>
            <div className="mt-1.5 grid gap-1.5">
              {GARDEN_EQUIPMENT.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="garden-equipment"
                    checked={draft.equipment === row.id}
                    onChange={() => patch("equipment", row.id)}
                  />
                  {row.label}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block text-xs text-[var(--muted)]">
            Hizmet Konumu
            <input
              value={draft.location}
              onChange={(e) => patch("location", e.target.value)}
              maxLength={120}
              placeholder="Site bahçesi, teras, balkon…"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <label className="block text-xs text-[var(--muted)]">
            Ulaşım Mesafesi
            <input
              inputMode="numeric"
              value={draft.maxKm}
              onChange={(e) => patch("maxKm", e.target.value.replace(/\D/g, "").slice(0, 2))}
              placeholder="km"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm tabular-nums text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
            <span className="mt-0.5 block">km&apos;ye kadar</span>
          </label>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Müsaitlik</legend>
            <div className="mt-1.5 grid gap-1.5">
              {GARDEN_AVAILS.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="garden-avail"
                    checked={draft.avail === row.id}
                    onChange={() => patch("avail", row.id)}
                  />
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
              placeholder="Hafta içi 09:00–18:00, cumartesi sabah"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <label className="block text-xs text-[var(--muted)]">
            Yapabileceğim İşler
            <textarea
              value={draft.canDo}
              onChange={(e) => patch("canDo", e.target.value)}
              maxLength={400}
              rows={2}
              placeholder="Çim, budama, saksı taşıma…"
              className="mt-1 w-full resize-none rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <label className="block text-xs text-[var(--muted)]">
            Yapamayacağım İşler
            <textarea
              value={draft.cannotDo}
              onChange={(e) => patch("cannotDo", e.target.value)}
              maxLength={400}
              rows={2}
              placeholder="Ağaç kesimi, ilaçlama, havuz…"
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
              placeholder="Su musluğu, otopark, kapı kodu…"
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
            <button
              type="button"
              disabled={busy}
              onClick={() => setOpen(false)}
              className="flex-1 rounded-full py-2.5 text-sm ring-1 ring-[var(--line)]"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={busy}
              className="k-press k-cta flex-1 rounded-full bg-[var(--clay)] py-2.5 text-sm font-medium text-white"
            >
              {busy ? "Kaydediliyor…" : editId ? "Kaydet" : "Hizmeti Yayınla"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

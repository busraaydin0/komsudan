"use client";

import { useEffect, useRef, useState } from "react";
import {
  deleteMyWash,
  fetchMyWashes,
  patchMyWash,
  postMyWash,
  uploadMyWashPhoto,
} from "@/lib/api";
import {
  WASH_BOOKINGS,
  WASH_INCLUDES,
  WASH_JOBS,
  WASH_MATERIALS,
  WASH_VEHICLES,
  washJobLabel,
} from "@/lib/wash";
import { tl } from "@/lib/pricing";
import type {
  Provider,
  ProviderWash,
  WashBooking,
  WashIncludes,
  WashJob,
  WashMaterials,
  WashVehicle,
} from "@/lib/types";

type Draft = {
  name: string;
  description: string;
  job: WashJob;
  vehicle: WashVehicle;
  price: string;
  includes: WashIncludes;
  durationMin: string;
  maxPerDay: string;
  booking: WashBooking;
  location: string;
  workHours: string;
  materials: WashMaterials;
  notes: string;
  isActive: boolean;
};

const emptyIncludes = (): WashIncludes => ({
  dis: true,
  supurme: false,
  cam: false,
  torpido: false,
  jant: false,
  kurulama: true,
});

const emptyDraft = (): Draft => ({
  name: "",
  description: "",
  job: "dis",
  vehicle: "otomobil",
  price: "",
  includes: emptyIncludes(),
  durationMin: "30",
  maxPerDay: "",
  booking: "musait",
  location: "",
  workHours: "",
  materials: "provider",
  notes: "",
  isActive: true,
});

function fromWash(w: ProviderWash): Draft {
  return {
    name: w.name,
    description: w.description ?? "",
    job: w.job ?? "dis",
    vehicle: w.vehicle ?? "otomobil",
    price: w.price ? String(w.price) : "",
    includes: {
      dis: Boolean(w.includes?.dis),
      supurme: Boolean(w.includes?.supurme),
      cam: Boolean(w.includes?.cam),
      torpido: Boolean(w.includes?.torpido),
      jant: Boolean(w.includes?.jant),
      kurulama: Boolean(w.includes?.kurulama),
    },
    durationMin: w.durationMin != null ? String(w.durationMin) : "",
    maxPerDay: w.maxPerDay != null ? String(w.maxPerDay) : "",
    booking: w.booking ?? "musait",
    location: w.location ?? "",
    workHours: w.workHours ?? "",
    materials: w.materials ?? "provider",
    notes: w.notes ?? "",
    isActive: w.isActive !== false,
  };
}

export function WashServiceEditor({
  me,
  onChanged,
}: {
  me: Provider | undefined;
  onChanged: () => void;
}) {
  const [items, setItems] = useState<ProviderWash[]>([]);
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
      setItems(await fetchMyWashes());
    } catch {
      setItems(me?.washes ?? []);
    }
  }

  useEffect(() => {
    if (!me || me.categoryId !== "araba") return;
    void fetchMyWashes()
      .then(setItems)
      .catch(() => setItems(me.washes ?? []));
  }, [me?.id, me?.categoryId]);

  if (!me || me.categoryId !== "araba") return null;

  function patch<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setErr("");
  }

  function toggleInclude(id: keyof WashIncludes) {
    setDraft((prev) => ({
      ...prev,
      includes: { ...prev.includes, [id]: !prev.includes[id] },
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

  function startEdit(item: ProviderWash) {
    setEditId(item.id);
    setDraft(fromWash(item));
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
    const durationMin = draft.durationMin.trim() ? Number(draft.durationMin) : null;
    const maxPerDay = draft.maxPerDay.trim() ? Number(draft.maxPerDay) : null;
    return {
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      job: draft.job,
      vehicle: draft.vehicle,
      price: n,
      includes: draft.includes,
      durationMin,
      maxPerDay,
      booking: draft.booking,
      location: draft.location.trim() || null,
      workHours: draft.workHours.trim() || null,
      materials: draft.materials,
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
    if (!Number.isInteger(body.price) || body.price < 1) {
      setErr("Fiyat tam sayı ₺ olsun.");
      return;
    }
    const inc = body.includes;
    if (!inc.dis && !inc.supurme && !inc.cam && !inc.torpido && !inc.jant && !inc.kurulama) {
      setErr("En az bir dahil kalem seç.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const saved = editId ? await patchMyWash(editId, body) : await postMyWash(body);
      if (photo) await uploadMyWashPhoto(saved.id, photo);
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
      await deleteMyWash(id);
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
        Araba yıkama kartı. Araç getirilir, yıkanır, alınır. Tutar sunucuda çarpılır.
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
                🚗
              </span>
            )}
            <button type="button" onClick={() => startEdit(item)} className="min-w-0 flex-1 text-left text-sm">
              <span className="block font-medium">{item.name}</span>
              <span className="text-xs text-[var(--muted)]">
                {tl(item.price)}/araç
                {washJobLabel(item.job) ? ` · ${washJobLabel(item.job)}` : ""}
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
          <p className="text-sm font-medium">{editId ? "Hizmeti düzenle" : "Araba Yıkama — Hizmet Ekle"}</p>

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
              placeholder="Dış yıkama, iç-dış, SUV paketi…"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Hizmet Türü</legend>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {WASH_JOBS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => patch("job", c.id)}
                  className={`k-chip rounded-full px-3 py-1.5 text-sm ring-1 ${
                    draft.job === c.id ? "bg-[var(--teal)] text-white ring-[var(--teal)]" : "ring-[var(--line)]"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Araç Türü</legend>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {WASH_VEHICLES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => patch("vehicle", c.id)}
                  className={`k-chip rounded-full px-3 py-1.5 text-sm ring-1 ${
                    draft.vehicle === c.id ? "bg-[var(--teal)] text-white ring-[var(--teal)]" : "ring-[var(--line)]"
                  }`}
                >
                  {c.label}
                </button>
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
              placeholder="Köpük, el yıkama, iç detay, nelere bakmazsın…"
              className="mt-1 w-full resize-none rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
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
            <span className="mt-0.5 block">₺ / araç</span>
          </label>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Hizmete Dahil Olanlar</legend>
            <div className="mt-1.5 grid gap-1.5">
              {WASH_INCLUDES.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.includes[row.id]}
                    onChange={() => toggleInclude(row.id)}
                  />
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

          <label className="block text-xs text-[var(--muted)]">
            Günlük Kapasite
            <input
              inputMode="numeric"
              value={draft.maxPerDay}
              onChange={(e) => patch("maxPerDay", e.target.value.replace(/\D/g, "").slice(0, 2))}
              placeholder="sınır yok"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm tabular-nums text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
            <span className="mt-0.5 block">araç</span>
          </label>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Randevu</legend>
            <div className="mt-1.5 grid gap-1.5">
              {WASH_BOOKINGS.map((b) => (
                <label key={b.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="wash-booking"
                    checked={draft.booking === b.id}
                    onChange={() => patch("booking", b.id)}
                  />
                  {b.label}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block text-xs text-[var(--muted)]">
            Hizmet Verme Konumu
            <input
              value={draft.location}
              onChange={(e) => patch("location", e.target.value)}
              maxLength={120}
              placeholder="Site otoparkı, 1427. Cadde önü…"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

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
            <legend className="text-xs text-[var(--muted)]">Kullanılan Malzemeler</legend>
            <div className="mt-1.5 grid gap-1.5">
              {WASH_MATERIALS.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="wash-materials"
                    checked={draft.materials === p.id}
                    onChange={() => patch("materials", p.id)}
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block text-xs text-[var(--muted)]">
            Özel Notlar
            <textarea
              value={draft.notes}
              onChange={(e) => patch("notes", e.target.value)}
              maxLength={400}
              rows={2}
              placeholder="Su yoksa gelme, kış lastiği, kapı kodu…"
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

"use client";

import { useEffect, useRef, useState } from "react";
import {
  deleteMyPreserve,
  fetchMyPreserves,
  patchMyPreserve,
  postMyPreserve,
  uploadMyPreservePhoto,
} from "@/lib/api";
import {
  PRESERVE_KINDS,
  PRESERVE_MATERIALS,
  PRESERVE_PICKUPS,
  PRESERVE_PRICE_UNITS,
  PRESERVE_STORAGES,
  preserveKindList,
  preserveUnitMeta,
} from "@/lib/preserve";
import { tl } from "@/lib/pricing";
import type {
  PreserveKind,
  PreserveMaterial,
  PreservePickup,
  PreservePriceUnit,
  PreserveStorage,
  Provider,
  ProviderPreserve,
} from "@/lib/types";

type Draft = {
  name: string;
  description: string;
  kinds: PreserveKind;
  portion: string;
  ingredients: string;
  material: PreserveMaterial;
  price: string;
  priceUnit: PreservePriceUnit;
  minOrder: string;
  leadDays: string;
  noticeDays: string;
  storage: PreserveStorage;
  pickup: PreservePickup;
  season: string;
  allergens: string;
  notes: string;
  isActive: boolean;
};

const emptyKinds = (): PreserveKind => ({
  salca: true,
  tarhana: false,
  eriste: false,
  manti: false,
  sarma: false,
  dondurucu: false,
  other: false,
});
const emptyStorage = (): PreserveStorage => ({ frozen: false, fresh: false, dried: false, jarred: true });
const emptyPickup = (): PreservePickup => ({ adres: true, nokta: false });

const emptyDraft = (): Draft => ({
  name: "",
  description: "",
  kinds: emptyKinds(),
  portion: "",
  ingredients: "",
  material: "provider",
  price: "",
  priceUnit: "kg",
  minOrder: "1",
  leadDays: "7",
  noticeDays: "3",
  storage: emptyStorage(),
  pickup: emptyPickup(),
  season: "",
  allergens: "",
  notes: "",
  isActive: true,
});

function fromPreserve(c: ProviderPreserve): Draft {
  return {
    name: c.name,
    description: c.description ?? "",
    kinds: { ...emptyKinds(), ...c.kinds },
    portion: c.portion ?? "",
    ingredients: c.ingredients ?? "",
    material: c.material ?? "provider",
    price: c.price ? String(c.price) : "",
    priceUnit: c.priceUnit ?? "kg",
    minOrder: c.minOrder != null ? String(c.minOrder) : "1",
    leadDays: c.leadDays != null ? String(c.leadDays) : "",
    noticeDays: c.noticeDays != null ? String(c.noticeDays) : "",
    storage: { ...emptyStorage(), ...c.storage },
    pickup: { ...emptyPickup(), ...c.pickup },
    season: c.season ?? "",
    allergens: c.allergens ?? "",
    notes: c.notes ?? "",
    isActive: c.isActive !== false,
  };
}

function anyTrue(obj: Record<string, boolean>) {
  return Object.values(obj).some(Boolean);
}

export function PreserveServiceEditor({
  me,
  onChanged,
}: {
  me: Provider | undefined;
  onChanged: () => void;
}) {
  const [items, setItems] = useState<ProviderPreserve[]>([]);
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
      setItems(await fetchMyPreserves());
    } catch {
      setItems(me?.preserves ?? []);
    }
  }

  useEffect(() => {
    if (!me || me.categoryId !== "kislik") return;
    void fetchMyPreserves()
      .then(setItems)
      .catch(() => setItems(me.preserves ?? []));
  }, [me?.id, me?.categoryId]);

  if (!me || me.categoryId !== "kislik") return null;

  function patch<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setErr("");
  }

  function toggle<T extends Record<string, boolean>>(key: "kinds" | "storage" | "pickup", id: keyof T) {
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

  function startEdit(item: ProviderPreserve) {
    setEditId(item.id);
    setDraft(fromPreserve(item));
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
    const minOrder = draft.minOrder.trim() ? Number(draft.minOrder) : 1;
    const leadDays = draft.leadDays.trim() ? Number(draft.leadDays) : null;
    const noticeDays = draft.noticeDays.trim() ? Number(draft.noticeDays) : null;
    return {
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      kinds: draft.kinds,
      portion: draft.portion.trim() || null,
      ingredients: draft.ingredients.trim() || null,
      material: draft.material,
      price: n,
      priceUnit: draft.priceUnit,
      minOrder,
      leadDays,
      noticeDays,
      storage: draft.storage,
      pickup: draft.pickup,
      season: draft.season.trim() || null,
      allergens: draft.allergens.trim() || null,
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
      setErr("En az bir hazırlık türü seç.");
      return;
    }
    if (!Number.isInteger(body.price) || body.price < 1) {
      setErr("Fiyat tam sayı ₺ olsun.");
      return;
    }
    if (!Number.isInteger(body.minOrder) || body.minOrder < 1) {
      setErr("Minimum sipariş 1 ve üzeri olsun.");
      return;
    }
    if (!anyTrue(body.storage)) {
      setErr("En az bir saklama / teslim durumu seç.");
      return;
    }
    if (!anyTrue(body.pickup)) {
      setErr("En az bir teslim alma yöntemi seç.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const saved = editId ? await patchMyPreserve(editId, body) : await postMyPreserve(body);
      if (photo) await uploadMyPreservePhoto(saved.id, photo);
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
      await deleteMyPreserve(id);
      if (editId === id) setOpen(false);
      await reloadMine();
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Kaldırılamadı.");
    } finally {
      setBusy(false);
    }
  }

  const unit = preserveUnitMeta(draft.priceUnit);

  return (
    <div className="k-rise mt-8 rounded-3xl bg-[var(--card)] p-4 ring-1 ring-[var(--line)]">
      <h2 className="font-[family-name:var(--font-display)] text-xl">Hizmetlerim</h2>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Kışlık kartı. Birim başı tutar sunucuda çarpılır.
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
                🥫
              </span>
            )}
            <button type="button" onClick={() => startEdit(item)} className="min-w-0 flex-1 text-left text-sm">
              <span className="block font-medium">{item.name}</span>
              <span className="text-xs text-[var(--muted)]">
                {tl(item.price)}/{preserveUnitMeta(item.priceUnit).qty}
                {preserveKindList(item.kinds).length ? ` · ${preserveKindList(item.kinds).join(", ")}` : ""}
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
          <p className="text-sm font-medium">{editId ? "Hizmeti düzenle" : "Kışlık & Dondurucu Hazırlığı — Hizmet Ekle"}</p>

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
              placeholder="Domates salçası, ev tarhanası…"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Hazırlık Türü</legend>
            <div className="mt-1.5 grid gap-1.5">
              {PRESERVE_KINDS.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={draft.kinds[row.id]} onChange={() => toggle<PreserveKind>("kinds", row.id)} />
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
              placeholder="Nasıl hazırlıyorsun, ne kadara yetiyor…"
              className="mt-1 w-full resize-none rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <label className="block text-xs text-[var(--muted)]">
            Porsiyon / Miktar
            <input
              value={draft.portion}
              onChange={(e) => patch("portion", e.target.value)}
              maxLength={80}
              placeholder="1 kg kavanoz, tepsi 20 dilim…"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <label className="block text-xs text-[var(--muted)]">
            İçerik / Malzemeler
            <textarea
              value={draft.ingredients}
              onChange={(e) => patch("ingredients", e.target.value)}
              maxLength={400}
              rows={2}
              placeholder="Domates, tuz, zeytinyağı…"
              className="mt-1 w-full resize-none rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Malzeme Durumu</legend>
            <div className="mt-1.5 grid gap-1.5">
              {PRESERVE_MATERIALS.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input type="radio" name="preserve-material" checked={draft.material === row.id} onChange={() => patch("material", row.id)} />
                  {row.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Fiyatlandırma</legend>
            <div className="mt-1.5 grid gap-1.5">
              {PRESERVE_PRICE_UNITS.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input type="radio" name="preserve-unit" checked={draft.priceUnit === row.id} onChange={() => patch("priceUnit", row.id)} />
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
              onChange={(e) => patch("price", e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="₺"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm tabular-nums text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
            <span className="mt-0.5 block">₺ / {unit.qty}</span>
          </label>

          <label className="block text-xs text-[var(--muted)]">
            Minimum Sipariş
            <input
              inputMode="numeric"
              value={draft.minOrder}
              onChange={(e) => patch("minOrder", e.target.value.replace(/\D/g, "").slice(0, 3))}
              placeholder={unit.qty}
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm tabular-nums text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
            <span className="mt-0.5 block">{unit.qty}</span>
          </label>

          <label className="block text-xs text-[var(--muted)]">
            Hazırlama Süresi
            <input
              inputMode="numeric"
              value={draft.leadDays}
              onChange={(e) => patch("leadDays", e.target.value.replace(/\D/g, "").slice(0, 2))}
              placeholder="gün"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm tabular-nums text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
            <span className="mt-0.5 block">gün</span>
          </label>

          <label className="block text-xs text-[var(--muted)]">
            Sipariş İçin Önceden Bildirim
            <input
              inputMode="numeric"
              value={draft.noticeDays}
              onChange={(e) => patch("noticeDays", e.target.value.replace(/\D/g, "").slice(0, 2))}
              placeholder="gün önce"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm tabular-nums text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
            <span className="mt-0.5 block">gün önce</span>
          </label>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Saklama / Teslim Durumu</legend>
            <div className="mt-1.5 grid gap-1.5">
              {PRESERVE_STORAGES.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={draft.storage[row.id]} onChange={() => toggle<PreserveStorage>("storage", row.id)} />
                  {row.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Teslim Alma</legend>
            <div className="mt-1.5 grid gap-1.5">
              {PRESERVE_PICKUPS.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={draft.pickup[row.id]} onChange={() => toggle<PreservePickup>("pickup", row.id)} />
                  {row.label}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block text-xs text-[var(--muted)]">
            Müsaitlik / Sipariş Dönemi
            <input
              value={draft.season}
              onChange={(e) => patch("season", e.target.value)}
              maxLength={80}
              placeholder="Ağustos–Ekim, kış öncesi…"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <label className="block text-xs text-[var(--muted)]">
            Alerjen / İçerik Bilgisi
            <textarea
              value={draft.allergens}
              onChange={(e) => patch("allergens", e.target.value)}
              maxLength={300}
              rows={2}
              placeholder="Gluten, fındık, süt…"
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
              placeholder="Kavanozu sen getir, buzdolabı şart…"
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

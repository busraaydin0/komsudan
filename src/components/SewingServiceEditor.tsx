"use client";

import { useEffect, useRef, useState } from "react";
import {
  deleteMyService,
  fetchMyServices,
  patchMyService,
  postMyService,
  uploadMyServicePhoto,
} from "@/lib/api";
import {
  SEWING_DELIVERIES,
  SEWING_MATERIALS,
  SEWING_PRICE_UNITS,
  SEWING_SUBCATEGORIES,
  sewingSubcategoryLabel,
  sewingUnitMeta,
} from "@/lib/sewing";
import { tl } from "@/lib/pricing";
import type {
  Provider,
  ProviderService,
  SewingDelivery,
  SewingMaterial,
  SewingPriceUnit,
  SewingSubcategory,
} from "@/lib/types";

type Draft = {
  name: string;
  description: string;
  subcategory: SewingSubcategory;
  price: string;
  priceUnit: SewingPriceUnit;
  minOrder: string;
  leadDays: string;
  maxPerWeek: string;
  delivery: SewingDelivery;
  workRadiusKm: string;
  notes: string;
  material: SewingMaterial;
  isActive: boolean;
};

const emptyDraft = (): Draft => ({
  name: "",
  description: "",
  subcategory: "kiyafet",
  price: "",
  priceUnit: "adet",
  minOrder: "1",
  leadDays: "3",
  maxPerWeek: "",
  delivery: { adres: true, nokta: true, yakin: false },
  workRadiusKm: "",
  notes: "",
  material: "customer",
  isActive: true,
});

function fromService(s: ProviderService): Draft {
  return {
    name: s.name,
    description: s.description ?? "",
    subcategory: s.subcategory ?? "diger",
    price: String(s.price),
    priceUnit: s.priceUnit ?? "adet",
    minOrder: String(s.minOrder ?? 1),
    leadDays: s.leadDays != null ? String(s.leadDays) : "",
    maxPerWeek: s.maxPerWeek != null ? String(s.maxPerWeek) : "",
    delivery: {
      adres: s.delivery?.adres !== false,
      nokta: s.delivery?.nokta !== false,
      yakin: Boolean(s.delivery?.yakin),
    },
    workRadiusKm: s.workRadiusKm != null ? String(s.workRadiusKm) : "",
    notes: s.notes ?? "",
    material: s.material ?? "customer",
    isActive: s.isActive !== false,
  };
}

export function SewingServiceEditor({
  me,
  onChanged,
}: {
  me: Provider | undefined;
  onChanged: () => void;
}) {
  const [items, setItems] = useState<ProviderService[]>([]);
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
      setItems(await fetchMyServices());
    } catch {
      setItems(me?.services ?? []);
    }
  }

  useEffect(() => {
    if (!me || me.categoryId !== "dikis") return;
    void fetchMyServices()
      .then(setItems)
      .catch(() => setItems(me.services ?? []));
  }, [me?.id, me?.categoryId]);

  if (!me || me.categoryId !== "dikis") return null;

  function patch<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setErr("");
  }

  function toggleDelivery(id: keyof SewingDelivery) {
    setDraft((prev) => ({
      ...prev,
      delivery: { ...prev.delivery, [id]: !prev.delivery[id] },
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

  function startEdit(item: ProviderService) {
    setEditId(item.id);
    setDraft(fromService(item));
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
    const n = Number(draft.price);
    const minOrder = Number(draft.minOrder) || 1;
    const leadDays = draft.leadDays.trim() ? Number(draft.leadDays) : null;
    const maxPerWeek = draft.maxPerWeek.trim() ? Number(draft.maxPerWeek) : null;
    const workRadiusKm = draft.workRadiusKm.trim() ? Number(draft.workRadiusKm) : null;
    return {
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      subcategory: draft.subcategory,
      price: n,
      priceUnit: draft.priceUnit,
      minOrder,
      leadDays,
      maxPerWeek,
      delivery: draft.delivery,
      workRadiusKm,
      notes: draft.notes.trim() || null,
      material: draft.material,
      isActive: draft.isActive,
    };
  }

  async function save() {
    const body = payload();
    if (body.name.length < 2 || !Number.isInteger(body.price) || body.price < 1) {
      setErr("Ad ve fiyat (tam sayı ₺) yaz.");
      return;
    }
    if (!body.delivery.adres && !body.delivery.nokta && !body.delivery.yakin) {
      setErr("En az bir teslim yöntemi seç.");
      return;
    }
    if (body.maxPerWeek != null && body.maxPerWeek < body.minOrder) {
      setErr("Haftalık kapasite, minimum siparişten küçük olamaz.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const saved = editId ? await patchMyService(editId, body) : await postMyService(body);
      if (photo) await uploadMyServicePhoto(saved.id, photo);
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
      await deleteMyService(id);
      if (editId === id) setOpen(false);
      await reloadMine();
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Kaldırılamadı.");
    } finally {
      setBusy(false);
    }
  }

  const unit = sewingUnitMeta(draft.priceUnit);

  return (
    <div className="k-rise mt-8 rounded-3xl bg-[var(--card)] p-4 ring-1 ring-[var(--line)]">
      <h2 className="font-[family-name:var(--font-display)] text-xl">Hizmetlerim</h2>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Dikiş ve tadilat kartı. Fiyat seçtiğin birim başı; siparişte sunucu çarpar.
      </p>
      <ul className="mt-3 space-y-2">
        {items.length === 0 && <li className="text-sm text-[var(--muted)]">Henüz hizmet yok.</li>}
        {items.map((item) => {
          const u = sewingUnitMeta(item.priceUnit);
          return (
            <li key={item.id} className="flex items-center gap-2 rounded-2xl bg-[var(--paper)] px-2 py-2 ring-1 ring-[var(--line)]">
              {item.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.photoUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
              ) : (
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[var(--card)] text-lg" aria-hidden>
                  🧵
                </span>
              )}
              <button type="button" onClick={() => startEdit(item)} className="min-w-0 flex-1 text-left text-sm">
                <span className="block font-medium">{item.name}</span>
                <span className="text-xs text-[var(--muted)]">
                  {tl(item.price)}/{u.label.toLowerCase()}
                  {sewingSubcategoryLabel(item.subcategory) ? ` · ${sewingSubcategoryLabel(item.subcategory)}` : ""}
                  {item.isActive === false ? " · pasif" : ""}
                </span>
              </button>
              <button type="button" disabled={busy} onClick={() => void remove(item.id)} className="text-xs text-[var(--clay)]">
                Kaldır
              </button>
            </li>
          );
        })}
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
          <p className="text-sm font-medium">{editId ? "Hizmeti düzenle" : "Hizmet Ekleme"}</p>

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
              placeholder="Pantolon paça, fermuar, perde…"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Hizmet Kategorisi</legend>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {SEWING_SUBCATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => patch("subcategory", c.id)}
                  className={`k-chip rounded-full px-3 py-1.5 text-sm ring-1 ${
                    draft.subcategory === c.id ? "bg-[var(--teal)] text-white ring-[var(--teal)]" : "ring-[var(--line)]"
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
              placeholder="Kumaş, ölçü, işlem detayı…"
              className="mt-1 w-full resize-none rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Fiyatlandırma</legend>
            <label className="mt-1.5 block text-xs text-[var(--muted)]">
              Fiyat
              <input
                inputMode="numeric"
                value={draft.price}
                onChange={(e) => patch("price", e.target.value.replace(/\D/g, "").slice(0, 5))}
                placeholder="₺"
                className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm tabular-nums text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
              />
            </label>
            <p className="mt-2 text-xs text-[var(--muted)]">Birim</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {SEWING_PRICE_UNITS.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => patch("priceUnit", u.id)}
                  className={`k-chip rounded-full px-3 py-1.5 text-sm ring-1 ${
                    draft.priceUnit === u.id ? "bg-[var(--teal)] text-white ring-[var(--teal)]" : "ring-[var(--line)]"
                  }`}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="block text-xs text-[var(--muted)]">
            Minimum Sipariş
            <input
              inputMode="numeric"
              value={draft.minOrder}
              onChange={(e) => patch("minOrder", e.target.value.replace(/\D/g, "").slice(0, 2))}
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm tabular-nums text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
            <span className="mt-0.5 block">{unit.qty}</span>
          </label>

          <label className="block text-xs text-[var(--muted)]">
            Tahmini Hazırlama Süresi
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
            Maksimum Sipariş Kapasitesi
            <input
              inputMode="numeric"
              value={draft.maxPerWeek}
              onChange={(e) => patch("maxPerWeek", e.target.value.replace(/\D/g, "").slice(0, 2))}
              placeholder="sınır yok"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm tabular-nums text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
            <span className="mt-0.5 block">adet / hafta</span>
          </label>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Teslim Yöntemi</legend>
            <div className="mt-1.5 grid gap-1.5">
              {SEWING_DELIVERIES.map((d) => (
                <label key={d.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.delivery[d.id]}
                    onChange={() => toggleDelivery(d.id)}
                  />
                  {d.label}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block text-xs text-[var(--muted)]">
            Çalışma Alanı
            <input
              inputMode="numeric"
              value={draft.workRadiusKm}
              onChange={(e) => patch("workRadiusKm", e.target.value.replace(/\D/g, "").slice(0, 2))}
              placeholder="km"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm tabular-nums text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
            <span className="mt-0.5 block">km</span>
          </label>

          <label className="block text-xs text-[var(--muted)]">
            Özel Notlar
            <textarea
              value={draft.notes}
              onChange={(e) => patch("notes", e.target.value)}
              maxLength={400}
              rows={2}
              placeholder="Ölçü, kumaş, randevu…"
              className="mt-1 w-full resize-none rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Malzeme Durumu</legend>
            <div className="mt-1.5 grid gap-1.5">
              {SEWING_MATERIALS.map((m) => (
                <label key={m.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="sewing-material"
                    checked={draft.material === m.id}
                    onChange={() => patch("material", m.id)}
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </fieldset>

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
              {busy ? "Kaydediliyor…" : "Kaydet"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

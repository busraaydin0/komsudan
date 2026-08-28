"use client";

import { useEffect, useRef, useState } from "react";
import {
  deleteMyProduct,
  fetchMyProducts,
  patchMyProduct,
  postMyProduct,
  uploadMyProductPhoto,
} from "@/lib/api";
import {
  FOOD_CATEGORIES,
  FOOD_DELIVERIES,
  FOOD_LEAD_PRESETS,
  FOOD_PRICE_UNITS,
  foodCategoryLabel,
  foodUnitMeta,
} from "@/lib/food";
import { tl } from "@/lib/pricing";
import type {
  FoodCategory,
  FoodDelivery,
  FoodPriceUnit,
  Provider,
  ProviderProduct,
} from "@/lib/types";

type Draft = {
  name: string;
  description: string;
  foodCategory: FoodCategory;
  price: string;
  priceUnit: FoodPriceUnit;
  minOrder: string;
  maxQty: string;
  leadHours: number | null;
  delivery: FoodDelivery;
  allergens: string;
  isActive: boolean;
};

const emptyDraft = (): Draft => ({
  name: "",
  description: "",
  foodCategory: "diger",
  price: "",
  priceUnit: "kisi",
  minOrder: "1",
  maxQty: "",
  leadHours: 24,
  delivery: "ikisi",
  allergens: "",
  isActive: true,
});

function fromProduct(p: ProviderProduct): Draft {
  return {
    name: p.name,
    description: p.description ?? "",
    foodCategory: p.foodCategory ?? "diger",
    price: String(p.pricePerPerson),
    priceUnit: p.priceUnit ?? "kisi",
    minOrder: String(p.minOrder ?? 1),
    maxQty: p.maxQty != null ? String(p.maxQty) : "",
    leadHours: p.leadHours ?? null,
    delivery: p.delivery ?? "ikisi",
    allergens: p.allergens ?? "",
    isActive: p.isActive !== false,
  };
}

export function FoodMenuEditor({
  me,
  onChanged,
}: {
  me: Provider | undefined;
  onChanged: () => void;
}) {
  const [items, setItems] = useState<ProviderProduct[]>([]);
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
      setItems(await fetchMyProducts());
    } catch {
      setItems(me?.products ?? []);
    }
  }

  useEffect(() => {
    if (!me || me.categoryId !== "davet") return;
    void fetchMyProducts()
      .then(setItems)
      .catch(() => setItems(me.products ?? []));
  }, [me?.id, me?.categoryId]);

  if (!me || me.categoryId !== "davet") return null;

  function patch<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
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

  function startEdit(item: ProviderProduct) {
    setEditId(item.id);
    setDraft(fromProduct(item));
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
    const maxQty = draft.maxQty.trim() ? Number(draft.maxQty) : null;
    return {
      name: draft.name.trim(),
      pricePerPerson: n,
      description: draft.description.trim() || null,
      foodCategory: draft.foodCategory,
      priceUnit: draft.priceUnit,
      minOrder,
      maxQty,
      leadHours: draft.leadHours,
      delivery: draft.delivery,
      allergens: draft.allergens.trim() || null,
      isActive: draft.isActive,
    };
  }

  async function save() {
    const body = payload();
    if (body.name.length < 2 || !Number.isInteger(body.pricePerPerson) || body.pricePerPerson < 1) {
      setErr("Ad ve fiyat (tam sayı ₺) yaz.");
      return;
    }
    if (body.maxQty != null && body.maxQty < body.minOrder) {
      setErr("Maksimum, minimum siparişten küçük olamaz.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const saved = editId ? await patchMyProduct(editId, body) : await postMyProduct(body);
      if (photo) await uploadMyProductPhoto(saved.id, photo);
      setOpen(false);
      setPhoto(null);
      await reloadMine();
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ürün kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setErr("");
    try {
      await deleteMyProduct(id);
      if (editId === id) setOpen(false);
      await reloadMine();
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Kaldırılamadı.");
    } finally {
      setBusy(false);
    }
  }

  const unit = foodUnitMeta(draft.priceUnit);

  return (
    <div className="k-rise mt-8 rounded-3xl bg-[var(--card)] p-4 ring-1 ring-[var(--line)]">
      <h2 className="font-[family-name:var(--font-display)] text-xl">Ürünlerim</h2>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Yalnızca yaptığın yemekleri ekle. Fiyat seçtiğin birim başı; siparişte sunucu çarpar.
      </p>
      <ul className="mt-3 space-y-2">
        {items.length === 0 && <li className="text-sm text-[var(--muted)]">Henüz ürün yok.</li>}
        {items.map((item) => {
          const u = foodUnitMeta(item.priceUnit);
          return (
            <li key={item.id} className="flex items-center gap-2 rounded-2xl bg-[var(--paper)] px-2 py-2 ring-1 ring-[var(--line)]">
              {item.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.photoUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
              ) : (
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[var(--card)] text-lg" aria-hidden>
                  📷
                </span>
              )}
              <button type="button" onClick={() => startEdit(item)} className="min-w-0 flex-1 text-left text-sm">
                <span className="block font-medium">{item.name}</span>
                <span className="text-xs text-[var(--muted)]">
                  {tl(item.pricePerPerson)}/{u.label}
                  {foodCategoryLabel(item.foodCategory) ? ` · ${foodCategoryLabel(item.foodCategory)}` : ""}
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
          + Yeni ürün ekle
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
          <p className="text-sm font-medium">{editId ? "Ürünü düzenle" : "Yeni ürün"}</p>

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
              <span className="block font-medium">Ürün fotoğrafı</span>
              <span className="text-xs text-[var(--muted)]">JPEG, PNG veya WebP · en fazla 2,5 MB</span>
            </span>
          </button>

          <label className="block text-xs text-[var(--muted)]">
            Ürün adı
            <input
              value={draft.name}
              onChange={(e) => patch("name", e.target.value)}
              maxLength={80}
              placeholder="Kısır, pasta…"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <label className="block text-xs text-[var(--muted)]">
            Açıklama
            <textarea
              value={draft.description}
              onChange={(e) => patch("description", e.target.value)}
              maxLength={400}
              rows={2}
              placeholder="Ev yapımı, cevizli, 8–10 kişilik tepsi…"
              className="mt-1 w-full resize-none rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Kategori</legend>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {FOOD_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => patch("foodCategory", c.id)}
                  className={`k-chip rounded-full px-3 py-1.5 text-sm ring-1 ${
                    draft.foodCategory === c.id ? "bg-[var(--teal)] text-white ring-[var(--teal)]" : "ring-[var(--line)]"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="block text-xs text-[var(--muted)]">
            Fiyat
            <input
              inputMode="numeric"
              value={draft.price}
              onChange={(e) => patch("price", e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder={`₺/${unit.label}`}
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm tabular-nums text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Fiyat birimi</legend>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {FOOD_PRICE_UNITS.map((u) => (
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

          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs text-[var(--muted)]">
              Minimum sipariş
              <input
                inputMode="numeric"
                value={draft.minOrder}
                onChange={(e) => patch("minOrder", e.target.value.replace(/\D/g, "").slice(0, 2))}
                className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm tabular-nums text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
              />
              <span className="mt-0.5 block">{unit.qty}</span>
            </label>
            <label className="block text-xs text-[var(--muted)]">
              Maksimum hazırlayabileceği miktar
              <input
                inputMode="numeric"
                value={draft.maxQty}
                onChange={(e) => patch("maxQty", e.target.value.replace(/\D/g, "").slice(0, 2))}
                placeholder="sınır yok"
                className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm tabular-nums text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
              />
              <span className="mt-0.5 block">{unit.qty}</span>
            </label>
          </div>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Sipariş için minimum süre</legend>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {FOOD_LEAD_PRESETS.map((p) => (
                <button
                  key={p.hours}
                  type="button"
                  onClick={() => patch("leadHours", p.hours)}
                  className={`k-chip rounded-full px-3 py-1.5 text-sm ring-1 ${
                    draft.leadHours === p.hours ? "bg-[var(--teal)] text-white ring-[var(--teal)]" : "ring-[var(--line)]"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Teslimat seçeneği</legend>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {FOOD_DELIVERIES.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => patch("delivery", d.id)}
                  className={`k-chip rounded-full px-3 py-1.5 text-sm ring-1 ${
                    draft.delivery === d.id ? "bg-[var(--teal)] text-white ring-[var(--teal)]" : "ring-[var(--line)]"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="block text-xs text-[var(--muted)]">
            İçerik / alerjen bilgisi
            <textarea
              value={draft.allergens}
              onChange={(e) => patch("allergens", e.target.value)}
              maxLength={400}
              rows={2}
              placeholder="Gluten, ceviz, süt… yoksa “yok” yaz."
              className="mt-1 w-full resize-none rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Aktif / pasif</legend>
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

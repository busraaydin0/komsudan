"use client";

import { useEffect, useRef, useState } from "react";
import {
  deleteMyCarpet,
  fetchMyCarpets,
  patchMyCarpet,
  postMyCarpet,
  uploadMyCarpetPhoto,
} from "@/lib/api";
import {
  CARPET_CLEANS,
  CARPET_KINDS,
  CARPET_PICKUPS,
  CARPET_SIZES,
  carpetKindList,
} from "@/lib/carpet";
import { tl } from "@/lib/pricing";
import type {
  CarpetClean,
  CarpetKind,
  CarpetPickup,
  CarpetSize,
  Provider,
  ProviderCarpet,
} from "@/lib/types";

type Draft = {
  name: string;
  kinds: CarpetKind;
  sizes: CarpetSize;
  minOrder: string;
  description: string;
  cleans: CarpetClean;
  price: string;
  leadDays: string;
  pickup: CarpetPickup;
  readyAt: string;
  products: string;
  noticeDays: string;
  notes: string;
  isActive: boolean;
};

const emptyKinds = (): CarpetKind => ({ hali: true, kilim: false, yolluk: false, other: false });
const emptySizes = (): CarpetSize => ({ kucuk: true, orta: true, buyuk: false, xl: false });
const emptyCleans = (): CarpetClean => ({ genel: true, leke: false, koku: false, ozel: false });
const emptyPickup = (): CarpetPickup => ({ adres: true, nokta: false });

const emptyDraft = (): Draft => ({
  name: "",
  kinds: emptyKinds(),
  sizes: emptySizes(),
  minOrder: "1",
  description: "",
  cleans: emptyCleans(),
  price: "",
  leadDays: "3",
  pickup: emptyPickup(),
  readyAt: "",
  products: "",
  noticeDays: "1",
  notes: "",
  isActive: true,
});

function fromCarpet(c: ProviderCarpet): Draft {
  return {
    name: c.name,
    kinds: { ...emptyKinds(), ...c.kinds },
    sizes: { ...emptySizes(), ...c.sizes },
    minOrder: c.minOrder != null ? String(c.minOrder) : "1",
    description: c.description ?? "",
    cleans: { ...emptyCleans(), ...c.cleans },
    price: c.price ? String(c.price) : "",
    leadDays: c.leadDays != null ? String(c.leadDays) : "",
    pickup: { ...emptyPickup(), ...c.pickup },
    readyAt: c.readyAt ?? "",
    products: c.products ?? "",
    noticeDays: c.noticeDays != null ? String(c.noticeDays) : "",
    notes: c.notes ?? "",
    isActive: c.isActive !== false,
  };
}

function anyTrue(obj: Record<string, boolean>) {
  return Object.values(obj).some(Boolean);
}

export function CarpetServiceEditor({
  me,
  onChanged,
}: {
  me: Provider | undefined;
  onChanged: () => void;
}) {
  const [items, setItems] = useState<ProviderCarpet[]>([]);
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
      setItems(await fetchMyCarpets());
    } catch {
      setItems(me?.carpets ?? []);
    }
  }

  useEffect(() => {
    if (!me || me.categoryId !== "hali") return;
    void fetchMyCarpets()
      .then(setItems)
      .catch(() => setItems(me.carpets ?? []));
  }, [me?.id, me?.categoryId]);

  if (!me || me.categoryId !== "hali") return null;

  function patch<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setErr("");
  }

  function toggle<T extends Record<string, boolean>>(key: "kinds" | "sizes" | "cleans" | "pickup", id: keyof T) {
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

  function startEdit(item: ProviderCarpet) {
    setEditId(item.id);
    setDraft(fromCarpet(item));
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
      sizes: draft.sizes,
      minOrder,
      cleans: draft.cleans,
      price: n,
      leadDays,
      pickup: draft.pickup,
      readyAt: draft.readyAt.trim() || null,
      products: draft.products.trim() || null,
      noticeDays,
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
    if (!anyTrue(body.sizes)) {
      setErr("En az bir halı boyutu seç.");
      return;
    }
    if (!anyTrue(body.cleans)) {
      setErr("En az bir temizlik türü seç.");
      return;
    }
    if (!Number.isInteger(body.price) || body.price < 1) {
      setErr("Fiyat tam sayı ₺ olsun.");
      return;
    }
    if (!Number.isInteger(body.minOrder) || body.minOrder < 1) {
      setErr("Adet 1 ve üzeri olsun.");
      return;
    }
    if (!anyTrue(body.pickup)) {
      setErr("En az bir teslim alma yöntemi seç.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const saved = editId ? await patchMyCarpet(editId, body) : await postMyCarpet(body);
      if (photo) await uploadMyCarpetPhoto(saved.id, photo);
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
      await deleteMyCarpet(id);
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
      <p className="mt-1 text-xs text-[var(--muted)]">Halı kartı. Adet başı tutar sunucuda çarpılır.</p>
      <ul className="mt-3 space-y-2">
        {items.length === 0 && <li className="text-sm text-[var(--muted)]">Henüz hizmet yok.</li>}
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-2 rounded-2xl bg-[var(--paper)] px-2 py-2 ring-1 ring-[var(--line)]">
            {item.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.photoUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
            ) : (
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[var(--card)] text-lg" aria-hidden>
                🧼
              </span>
            )}
            <button type="button" onClick={() => startEdit(item)} className="min-w-0 flex-1 text-left text-sm">
              <span className="block font-medium">{item.name}</span>
              <span className="text-xs text-[var(--muted)]">
                {tl(item.price)}/adet
                {carpetKindList(item.kinds).length ? ` · ${carpetKindList(item.kinds).join(", ")}` : ""}
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
          <p className="text-sm font-medium">{editId ? "Hizmeti düzenle" : "Halı Yıkama — Hizmet Ekle"}</p>

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
              placeholder="Salon halısı, yolluk, kilim…"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Hizmet Türü</legend>
            <div className="mt-1.5 grid gap-1.5">
              {CARPET_KINDS.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={draft.kinds[row.id]} onChange={() => toggle<CarpetKind>("kinds", row.id)} />
                  {row.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Halı Boyutu</legend>
            <div className="mt-1.5 grid gap-1.5">
              {CARPET_SIZES.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={draft.sizes[row.id]} onChange={() => toggle<CarpetSize>("sizes", row.id)} />
                  {row.label}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block text-xs text-[var(--muted)]">
            Adet
            <input
              inputMode="numeric"
              value={draft.minOrder}
              onChange={(e) => patch("minOrder", e.target.value.replace(/\D/g, "").slice(0, 2))}
              placeholder="adet"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm tabular-nums text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
            <span className="mt-0.5 block">adet · minimum sipariş</span>
          </label>

          <label className="block text-xs text-[var(--muted)]">
            Hizmet Açıklaması
            <textarea
              value={draft.description}
              onChange={(e) => patch("description", e.target.value)}
              maxLength={400}
              rows={2}
              placeholder="Nasıl yıkıyorsun, kurutma, teslim…"
              className="mt-1 w-full resize-none rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Temizlik Türü</legend>
            <div className="mt-1.5 grid gap-1.5">
              {CARPET_CLEANS.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={draft.cleans[row.id]} onChange={() => toggle<CarpetClean>("cleans", row.id)} />
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
            <span className="mt-0.5 block">₺ / adet</span>
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

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Teslim Alma</legend>
            <div className="mt-1.5 grid gap-1.5">
              {CARPET_PICKUPS.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={draft.pickup[row.id]} onChange={() => toggle<CarpetPickup>("pickup", row.id)} />
                  {row.label}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block text-xs text-[var(--muted)]">
            Teslim Zamanı
            <input
              value={draft.readyAt}
              onChange={(e) => patch("readyAt", e.target.value)}
              maxLength={80}
              placeholder="Hafta içi 10:00–18:00, 3. gün…"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <label className="block text-xs text-[var(--muted)]">
            Kullanılan Temizlik Ürünleri
            <input
              value={draft.products}
              onChange={(e) => patch("products", e.target.value)}
              maxLength={120}
              placeholder="Halı şampuanı, leke spreyi…"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <label className="block text-xs text-[var(--muted)]">
            Randevu / Sipariş İçin Bildirim
            <input
              inputMode="numeric"
              value={draft.noticeDays}
              onChange={(e) => patch("noticeDays", e.target.value.replace(/\D/g, "").slice(0, 2))}
              placeholder="gün önce"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm tabular-nums text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
            <span className="mt-0.5 block">gün önce</span>
          </label>

          <label className="block text-xs text-[var(--muted)]">
            Özel Notlar
            <textarea
              value={draft.notes}
              onChange={(e) => patch("notes", e.target.value)}
              maxLength={400}
              rows={2}
              placeholder="Islak teslim yok, merdiven çıkmam…"
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

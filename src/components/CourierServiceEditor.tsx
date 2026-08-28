"use client";

import { useEffect, useRef, useState } from "react";
import {
  deleteMyCourier,
  fetchMyCouriers,
  patchMyCourier,
  postMyCourier,
  uploadMyCourierPhoto,
} from "@/lib/api";
import {
  COURIER_AVAILS,
  COURIER_CARRY,
  COURIER_CONFIRMS,
  COURIER_PRICE_TYPES,
  COURIER_ROUTES,
  COURIER_SIZES,
  COURIER_TRANSPORTS,
  courierTransportList,
} from "@/lib/courier";
import { tl } from "@/lib/pricing";
import type {
  CourierAvail,
  CourierCarry,
  CourierConfirm,
  CourierPriceType,
  CourierRoute,
  CourierSize,
  CourierTransport,
  Provider,
  ProviderCourier,
} from "@/lib/types";

type Draft = {
  name: string;
  description: string;
  transport: CourierTransport;
  sizes: CourierSize;
  maxKm: string;
  price: string;
  priceType: CourierPriceType;
  durationMin: string;
  routes: CourierRoute;
  avail: CourierAvail;
  workHours: string;
  region: string;
  carry: CourierCarry;
  carryOther: string;
  refuse: string;
  confirm: CourierConfirm;
  notes: string;
  isActive: boolean;
};

const emptyTransport = (): CourierTransport => ({
  yaya: false,
  bisiklet: false,
  ebike: false,
  motor: true,
});

const emptySizes = (): CourierSize => ({ kucuk: true, orta: true, buyuk: false });

const emptyRoutes = (): CourierRoute => ({
  adresAdres: true,
  noktaAdres: false,
  noktaNokta: false,
});

const emptyCarry = (): CourierCarry => ({
  evrak: true,
  paket: true,
  kiyafet: false,
  anahtar: true,
  hediye: false,
  kisisel: false,
  diger: false,
});

const emptyConfirm = (): CourierConfirm => ({ kod: true, app: false });

const emptyDraft = (): Draft => ({
  name: "",
  description: "",
  transport: emptyTransport(),
  sizes: emptySizes(),
  maxKm: "5",
  price: "",
  priceType: "sabit",
  durationMin: "20",
  routes: emptyRoutes(),
  avail: "hemen",
  workHours: "",
  region: "",
  carry: emptyCarry(),
  carryOther: "",
  refuse: "",
  confirm: emptyConfirm(),
  notes: "",
  isActive: true,
});

function fromCourier(c: ProviderCourier): Draft {
  return {
    name: c.name,
    description: c.description ?? "",
    transport: { ...emptyTransport(), ...c.transport },
    sizes: { ...emptySizes(), ...c.sizes },
    maxKm: c.maxKm != null ? String(c.maxKm) : "",
    price: c.price ? String(c.price) : "",
    priceType: c.priceType ?? "sabit",
    durationMin: c.durationMin != null ? String(c.durationMin) : "",
    routes: { ...emptyRoutes(), ...c.routes },
    avail: c.avail ?? "hemen",
    workHours: c.workHours ?? "",
    region: c.region ?? "",
    carry: { ...emptyCarry(), ...c.carry },
    carryOther: c.carryOther ?? "",
    refuse: c.refuse ?? "",
    confirm: { ...emptyConfirm(), ...c.confirm },
    notes: c.notes ?? "",
    isActive: c.isActive !== false,
  };
}

function anyTrue(obj: Record<string, boolean>) {
  return Object.values(obj).some(Boolean);
}

export function CourierServiceEditor({
  me,
  onChanged,
}: {
  me: Provider | undefined;
  onChanged: () => void;
}) {
  const [items, setItems] = useState<ProviderCourier[]>([]);
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
      setItems(await fetchMyCouriers());
    } catch {
      setItems(me?.couriers ?? []);
    }
  }

  useEffect(() => {
    if (!me || me.categoryId !== "kurye") return;
    void fetchMyCouriers()
      .then(setItems)
      .catch(() => setItems(me.couriers ?? []));
  }, [me?.id, me?.categoryId]);

  if (!me || me.categoryId !== "kurye") return null;

  function patch<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setErr("");
  }

  function toggle<T extends CourierTransport | CourierSize | CourierRoute | CourierCarry | CourierConfirm>(
    key: "transport" | "sizes" | "routes" | "carry" | "confirm",
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

  function startEdit(item: ProviderCourier) {
    setEditId(item.id);
    setDraft(fromCourier(item));
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
      description: draft.description.trim() || null,
      transport: draft.transport,
      sizes: draft.sizes,
      maxKm,
      price: n,
      priceType: draft.priceType,
      durationMin,
      routes: draft.routes,
      avail: draft.avail,
      workHours: draft.workHours.trim() || null,
      region: draft.region.trim() || null,
      carry: draft.carry,
      carryOther: draft.carry.diger ? draft.carryOther.trim() || null : null,
      refuse: draft.refuse.trim() || null,
      confirm: draft.confirm,
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
    if (!anyTrue(body.transport)) {
      setErr("En az bir ulaşım türü seç.");
      return;
    }
    if (!anyTrue(body.sizes)) {
      setErr("En az bir paket boyutu seç.");
      return;
    }
    if (!Number.isInteger(body.maxKm) || body.maxKm < 1) {
      setErr("Mesafe 1 km ve üzeri olsun.");
      return;
    }
    if (!Number.isInteger(body.price) || body.price < 1) {
      setErr("Fiyat tam sayı ₺ olsun.");
      return;
    }
    if (!anyTrue(body.routes)) {
      setErr("En az bir teslimat şekli seç.");
      return;
    }
    if (!anyTrue(body.carry)) {
      setErr("En az bir taşınabilir paket türü seç.");
      return;
    }
    if (body.carry.diger && !body.carryOther) {
      setErr("Diğer paket türünü yaz.");
      return;
    }
    if (!anyTrue(body.confirm)) {
      setErr("En az bir teslim onayı seç.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const saved = editId ? await patchMyCourier(editId, body) : await postMyCourier(body);
      if (photo) await uploadMyCourierPhoto(saved.id, photo);
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
      await deleteMyCourier(id);
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
        Yakın mesafe kurye kartı. Paket alınır, yakında bırakılır. Tutar sunucuda çarpılır.
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
                🛵
              </span>
            )}
            <button type="button" onClick={() => startEdit(item)} className="min-w-0 flex-1 text-left text-sm">
              <span className="block font-medium">{item.name}</span>
              <span className="text-xs text-[var(--muted)]">
                {item.priceType === "mesafe" ? `${tl(item.price)}'den` : `${tl(item.price)}/gönderi`}
                {courierTransportList(item.transport).length
                  ? ` · ${courierTransportList(item.transport).join(", ")}`
                  : ""}
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
          <p className="text-sm font-medium">{editId ? "Hizmeti düzenle" : "Yakın Mesafe Kurye — Hizmet Ekle"}</p>

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
              placeholder="Mahalle motor, evrak bisiklet…"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Ulaşım Türü</legend>
            <div className="mt-1.5 grid gap-1.5">
              {COURIER_TRANSPORTS.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.transport[row.id]}
                    onChange={() => toggle<CourierTransport>("transport", row.id)}
                  />
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
              placeholder="Hangi mahalle, ne kadar bekletirsin, yağmurda gelir misin…"
              className="mt-1 w-full resize-none rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Paket Boyutu</legend>
            <div className="mt-1.5 grid gap-1.5">
              {COURIER_SIZES.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.sizes[row.id]}
                    onChange={() => toggle<CourierSize>("sizes", row.id)}
                  />
                  <span>
                    {row.label}
                    <span className="block text-xs text-[var(--muted)]">{row.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block text-xs text-[var(--muted)]">
            Hizmet Mesafesi
            <input
              inputMode="numeric"
              value={draft.maxKm}
              onChange={(e) => patch("maxKm", e.target.value.replace(/\D/g, "").slice(0, 2))}
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
              {COURIER_PRICE_TYPES.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="courier-price-type"
                    checked={draft.priceType === row.id}
                    onChange={() => patch("priceType", row.id)}
                  />
                  {row.label}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block text-xs text-[var(--muted)]">
            Tahmini Teslim Süresi
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
            <legend className="text-xs text-[var(--muted)]">Teslimat Şekli</legend>
            <div className="mt-1.5 grid gap-1.5">
              {COURIER_ROUTES.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.routes[row.id]}
                    onChange={() => toggle<CourierRoute>("routes", row.id)}
                  />
                  {row.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Müsaitlik</legend>
            <div className="mt-1.5 grid gap-1.5">
              {COURIER_AVAILS.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="courier-avail"
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
              placeholder="Hafta içi 09:00–18:00"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <label className="block text-xs text-[var(--muted)]">
            Hizmet Bölgesi
            <input
              value={draft.region}
              onChange={(e) => patch("region", e.target.value)}
              maxLength={120}
              placeholder="Çukurambar, Söğütözü, Kızılırmak…"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Taşıyabileceğim Paketler</legend>
            <div className="mt-1.5 grid gap-1.5">
              {COURIER_CARRY.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.carry[row.id]}
                    onChange={() => toggle<CourierCarry>("carry", row.id)}
                  />
                  {row.label}
                </label>
              ))}
            </div>
            {draft.carry.diger && (
              <input
                value={draft.carryOther}
                onChange={(e) => patch("carryOther", e.target.value)}
                maxLength={80}
                placeholder="Diğer: …"
                className="mt-2 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
              />
            )}
          </fieldset>

          <label className="block text-xs text-[var(--muted)]">
            Taşımadığım Ürünler
            <textarea
              value={draft.refuse}
              onChange={(e) => patch("refuse", e.target.value)}
              maxLength={400}
              rows={2}
              placeholder="Yiyecek, canlı hayvan, kırılgan cam…"
              className="mt-1 w-full resize-none rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Teslim Onayı</legend>
            <div className="mt-1.5 grid gap-1.5">
              {COURIER_CONFIRMS.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.confirm[row.id]}
                    onChange={() => toggle<CourierConfirm>("confirm", row.id)}
                  />
                  {row.label}
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
              placeholder="Kapı kodu, yağmur, bekletme…"
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

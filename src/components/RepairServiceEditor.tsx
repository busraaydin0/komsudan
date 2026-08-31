"use client";

import { useEffect, useRef, useState } from "react";
import {
  deleteMyRepair,
  fetchMyRepairs,
  patchMyRepair,
  postMyRepair,
  uploadMyRepairPhoto,
} from "@/lib/api";
  import {
  REPAIR_DELIVERIES,
  REPAIR_JOBS,
  REPAIR_KINDS,
  REPAIR_PARTS,
  REPAIR_PRICE_TYPES,
  REPAIR_PRICE_UNITS,
  REPAIR_QUOTES,
  isMuslukKind,
  repairKindLabel,
  repairPriceTypeLabel,
  repairUnitMeta,
} from "@/lib/repair";
import { tl } from "@/lib/pricing";
import type {
  Provider,
  ProviderRepair,
  RepairDelivery,
  RepairJob,
  RepairKind,
  RepairParts,
  RepairPriceType,
  RepairPriceUnit,
  RepairQuoteFrom,
} from "@/lib/types";

type Draft = {
  name: string;
  item: string;
  description: string;
  kind: RepairKind;
  job: RepairJob;
  price: string;
  priceType: RepairPriceType;
  priceUnit: RepairPriceUnit;
  parts: RepairParts;
  leadDays: string;
  maxPerWeek: string;
  delivery: RepairDelivery;
  workRadiusKm: string;
  inspectRequired: boolean;
  quoteFrom: RepairQuoteFrom;
  warrantyDays: string;
  notes: string;
  workHours: string;
  isActive: boolean;
};

const emptyDraft = (): Draft => ({
  name: "",
  item: "",
  description: "",
  kind: "elektronik",
  job: "onarim",
  price: "",
  priceType: "sabit",
  priceUnit: "adet",
  parts: "either",
  leadDays: "3",
  maxPerWeek: "",
  delivery: { adres: true, nokta: true, yakin: false },
  workRadiusKm: "",
  inspectRequired: false,
  quoteFrom: "seen",
  warrantyDays: "",
  notes: "",
  workHours: "",
  isActive: true,
});

function fromRepair(r: ProviderRepair): Draft {
  return {
    name: r.name,
    item: r.item ?? "",
    description: r.description ?? "",
    kind: r.kind ?? "diger",
    job: r.job ?? "onarim",
    price: r.price ? String(r.price) : "",
    priceType: r.priceType ?? "sabit",
    priceUnit: r.priceUnit ?? "adet",
    parts: r.parts ?? "either",
    leadDays: r.leadDays != null ? String(r.leadDays) : "",
    maxPerWeek: r.maxPerWeek != null ? String(r.maxPerWeek) : "",
    delivery: {
      adres: r.delivery?.adres !== false,
      nokta: r.delivery?.nokta !== false,
      yakin: Boolean(r.delivery?.yakin),
    },
    workRadiusKm: r.workRadiusKm != null ? String(r.workRadiusKm) : "",
    inspectRequired: Boolean(r.inspectRequired),
    quoteFrom: r.quoteFrom ?? "seen",
    warrantyDays: r.warrantyDays != null ? String(r.warrantyDays) : "",
    notes: r.notes ?? "",
    workHours: r.workHours ?? "",
    isActive: r.isActive !== false,
  };
}

export function RepairServiceEditor({
  me,
  onChanged,
}: {
  me: Provider | undefined;
  onChanged: () => void;
}) {
  const [items, setItems] = useState<ProviderRepair[]>([]);
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
      setItems(await fetchMyRepairs());
    } catch {
      setItems(me?.repairs ?? []);
    }
  }

  useEffect(() => {
    if (!me || me.categoryId !== "tamir") return;
    void fetchMyRepairs()
      .then(setItems)
      .catch(() => setItems(me.repairs ?? []));
  }, [me?.id, me?.categoryId]);

  if (!me || me.categoryId !== "tamir") return null;

  function patch<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => {
      if (key === "kind" && isMuslukKind(value as RepairKind)) {
        return {
          ...prev,
          kind: "musluk",
          priceType: "sabit",
          priceUnit: "is",
          name: prev.name.trim() ? prev.name : "Musluk tamiri",
          job: "onarim",
        };
      }
      return { ...prev, [key]: value };
    });
    setErr("");
  }

  function toggleDelivery(id: keyof RepairDelivery) {
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

  function startEdit(item: ProviderRepair) {
    setEditId(item.id);
    setDraft(fromRepair(item));
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
    const leadDays = draft.leadDays.trim() ? Number(draft.leadDays) : null;
    const maxPerWeek = draft.maxPerWeek.trim() ? Number(draft.maxPerWeek) : null;
    const workRadiusKm = draft.workRadiusKm.trim() ? Number(draft.workRadiusKm) : null;
    const warrantyDays = draft.warrantyDays.trim() ? Number(draft.warrantyDays) : null;
    return {
      name: draft.name.trim(),
      item: draft.item.trim() || null,
      description: draft.description.trim() || null,
      kind: draft.kind,
      job: draft.job,
      price: n,
      priceType: draft.priceType,
      priceUnit: draft.priceUnit,
      parts: draft.parts,
      leadDays,
      maxPerWeek,
      delivery: draft.delivery,
      workRadiusKm,
      inspectRequired: draft.inspectRequired,
      quoteFrom: draft.quoteFrom,
      warrantyDays,
      notes: draft.notes.trim() || null,
      workHours: draft.workHours.trim() || null,
      isActive: draft.isActive,
    };
  }

  async function save() {
    const body = payload();
    if (body.name.length < 2) {
      setErr("Hizmet adı yaz.");
      return;
    }
    if (body.priceType !== "inceleme" && (!Number.isInteger(body.price) || body.price < 1)) {
      setErr("Sabit veya başlangıç fiyatı tam sayı ₺ olsun.");
      return;
    }
    if (!isMuslukKind(body.kind) && !body.delivery.adres && !body.delivery.nokta && !body.delivery.yakin) {
      setErr("En az bir teslim yöntemi seç.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const saved = editId ? await patchMyRepair(editId, body) : await postMyRepair(body);
      if (photo) await uploadMyRepairPhoto(saved.id, photo);
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
      await deleteMyRepair(id);
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
        Tamir kartı. İş atölyede / evde; müşteri bırakır, alır. Sabit fiyatta tutar sunucuda çarpılır.
      </p>
      <ul className="mt-3 space-y-2">
        {items.length === 0 && <li className="text-sm text-[var(--muted)]">Henüz hizmet yok.</li>}
        {items.map((item) => {
          const u = repairUnitMeta(item.priceUnit);
          return (
            <li key={item.id} className="flex items-center gap-2 rounded-2xl bg-[var(--paper)] px-2 py-2 ring-1 ring-[var(--line)]">
              {item.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.photoUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
              ) : (
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[var(--card)] text-lg" aria-hidden>
                  🔧
                </span>
              )}
              <button type="button" onClick={() => startEdit(item)} className="min-w-0 flex-1 text-left text-sm">
                <span className="block font-medium">{item.name}</span>
                <span className="text-xs text-[var(--muted)]">
                  {item.priceType === "inceleme" && item.price <= 0
                    ? "inceleme sonrası"
                    : `${item.priceType === "baslangic" ? "₺" : ""}${item.priceType === "baslangic" ? `${item.price}'ten` : tl(item.price)}/${u.label.toLowerCase()}`}
                  {item.priceType && item.priceType !== "sabit" && item.price > 0 ? ` · ${repairPriceTypeLabel(item.priceType)}` : ""}
                  {repairKindLabel(item.kind) ? ` · ${repairKindLabel(item.kind)}` : ""}
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
          <p className="text-sm font-medium">{editId ? "Hizmeti düzenle" : "Tamir — Hizmet Ekleme"}</p>

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
              placeholder="Telefon ekranı, sandalye, bisiklet vites…"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Tamir Türü</legend>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {REPAIR_KINDS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => patch("kind", c.id)}
                  className={`k-chip rounded-full px-3 py-1.5 text-sm ring-1 ${
                    draft.kind === c.id ? "bg-[var(--teal)] text-white ring-[var(--teal)]" : "ring-[var(--line)]"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="block text-xs text-[var(--muted)]">
            Tamir Edilen Ürün
            <input
              value={draft.item}
              onChange={(e) => patch("item", e.target.value)}
              maxLength={80}
              placeholder="Çamaşır makinesi, ahşap sandalye…"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Arıza / İşlem Türü</legend>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {REPAIR_JOBS.map((c) => (
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

          <label className="block text-xs text-[var(--muted)]">
            Hizmet Açıklaması
            <textarea
              value={draft.description}
              onChange={(e) => patch("description", e.target.value)}
              maxLength={400}
              rows={2}
              placeholder="Ne tamir edersin, ne kadar sürer, nelere bakmazsın…"
              className="mt-1 w-full resize-none rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Fiyatlandırma</legend>
            {isMuslukKind(draft.kind) ? (
              <p className="mt-1.5 text-sm text-[var(--muted)]">
                Eve gelir, iş başı sabit fiyat. Saatlik ücret yok.
              </p>
            ) : null}
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
            {isMuslukKind(draft.kind) ? (
              <p className="mt-2 text-xs text-[var(--muted)]">Birim: iş · Tip: sabit</p>
            ) : (
              <div>
                <p className="mt-2 text-xs text-[var(--muted)]">Fiyat Tipi</p>
                <div className="mt-1.5 grid gap-1.5">
                  {REPAIR_PRICE_TYPES.map((t) => (
                    <label key={t.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="repair-price-type"
                        checked={draft.priceType === t.id}
                        onChange={() => patch("priceType", t.id)}
                      />
                      {t.label}
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-xs text-[var(--muted)]">Ücret Birimi</p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {REPAIR_PRICE_UNITS.map((u) => (
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
              </div>
            )}
          </fieldset>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Parça Durumu</legend>
            <div className="mt-1.5 grid gap-1.5">
              {REPAIR_PARTS.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="repair-parts"
                    checked={draft.parts === p.id}
                    onChange={() => patch("parts", p.id)}
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block text-xs text-[var(--muted)]">
            Tahmini Tamir Süresi
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
            Maksimum Sipariş / İş Kapasitesi
            <input
              inputMode="numeric"
              value={draft.maxPerWeek}
              onChange={(e) => patch("maxPerWeek", e.target.value.replace(/\D/g, "").slice(0, 2))}
              placeholder="sınır yok"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm tabular-nums text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
            <span className="mt-0.5 block">adet / hafta</span>
          </label>

          {isMuslukKind(draft.kind) ? (
            <p className="text-xs text-[var(--muted)]">
              Teslim yok: eve gelirsin. Randevu siparişte seçilir.
            </p>
          ) : (
            <fieldset>
              <legend className="text-xs text-[var(--muted)]">Teslim Yöntemi</legend>
              <div className="mt-1.5 grid gap-1.5">
                {REPAIR_DELIVERIES.map((d) => (
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
          )}

          <label className="block text-xs text-[var(--muted)]">
            Hizmet Bölgesi
            <input
              inputMode="numeric"
              value={draft.workRadiusKm}
              onChange={(e) => patch("workRadiusKm", e.target.value.replace(/\D/g, "").slice(0, 2))}
              placeholder="km"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm tabular-nums text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
            <span className="mt-0.5 block">km</span>
          </label>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Ön İnceleme Gerekli mi?</legend>
            <div className="mt-1.5 flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="repair-inspect"
                  checked={draft.inspectRequired}
                  onChange={() => patch("inspectRequired", true)}
                />
                Evet
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="repair-inspect"
                  checked={!draft.inspectRequired}
                  onChange={() => patch("inspectRequired", false)}
                />
                Hayır
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Fotoğrafla Ön Teklif</legend>
            <div className="mt-1.5 grid gap-1.5">
              {REPAIR_QUOTES.map((q) => (
                <label key={q.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="repair-quote"
                    checked={draft.quoteFrom === q.id}
                    onChange={() => patch("quoteFrom", q.id)}
                  />
                  {q.label}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block text-xs text-[var(--muted)]">
            Garanti / Tekrar Kontrol
            <input
              inputMode="numeric"
              value={draft.warrantyDays}
              onChange={(e) => patch("warrantyDays", e.target.value.replace(/\D/g, "").slice(0, 3))}
              placeholder="gün"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm tabular-nums text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
            <span className="mt-0.5 block">gün</span>
          </label>

          <label className="block text-xs text-[var(--muted)]">
            Özel Notlar
            <textarea
              value={draft.notes}
              onChange={(e) => patch("notes", e.target.value)}
              maxLength={400}
              rows={2}
              placeholder="Marka, model, yedek parça, randevu…"
              className="mt-1 w-full resize-none rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <label className="block text-xs text-[var(--muted)]">
            Çalışma Saatleri
            <input
              value={draft.workHours}
              onChange={(e) => patch("workHours", e.target.value)}
              maxLength={80}
              placeholder="Hafta içi 10:00–18:00"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
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

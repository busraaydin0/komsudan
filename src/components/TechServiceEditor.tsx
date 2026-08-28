"use client";

import { useEffect, useRef, useState } from "react";
import {
  deleteMyTech,
  fetchMyTechs,
  patchMyTech,
  postMyTech,
  uploadMyTechPhoto,
} from "@/lib/api";
import {
  TECH_DELIVERIES,
  TECH_JOBS,
  TECH_KINDS,
  TECH_MATERIALS,
  TECH_PRICE_TYPES,
  TECH_PRICE_UNITS,
  techKindLabel,
  techPriceTypeLabel,
  techUnitMeta,
} from "@/lib/tech";
import { tl } from "@/lib/pricing";
import type {
  Provider,
  ProviderTech,
  TechDelivery,
  TechJob,
  TechKind,
  TechMaterials,
  TechPriceType,
  TechPriceUnit,
} from "@/lib/types";

type LeadUnit = "saat" | "gun";

type Draft = {
  name: string;
  item: string;
  description: string;
  kind: TechKind;
  job: TechJob;
  price: string;
  priceType: TechPriceType;
  priceUnit: TechPriceUnit;
  materials: TechMaterials;
  leadValue: string;
  leadUnit: LeadUnit;
  maxPerWeek: string;
  delivery: TechDelivery;
  inspectRequired: boolean;
  quoteFromPhoto: boolean;
  platform: string;
  warrantyDays: string;
  notes: string;
  workHours: string;
  isActive: boolean;
};

const emptyDraft = (): Draft => ({
  name: "",
  item: "",
  description: "",
  kind: "bilgisayar",
  job: "kurulum",
  price: "",
  priceType: "sabit",
  priceUnit: "cihaz",
  materials: "none",
  leadValue: "2",
  leadUnit: "saat",
  maxPerWeek: "",
  delivery: { adres: true, nokta: true, yakin: false, yerinde: false },
  inspectRequired: false,
  quoteFromPhoto: false,
  platform: "",
  warrantyDays: "",
  notes: "",
  workHours: "",
  isActive: true,
});

function fromTech(t: ProviderTech): Draft {
  const hasHours = t.leadHours != null;
  return {
    name: t.name,
    item: t.item ?? "",
    description: t.description ?? "",
    kind: t.kind ?? "diger",
    job: t.job ?? "kurulum",
    price: t.price ? String(t.price) : "",
    priceType: t.priceType ?? "sabit",
    priceUnit: t.priceUnit ?? "cihaz",
    materials: t.materials ?? "none",
    leadValue: hasHours
      ? String(t.leadHours)
      : t.leadDays != null
        ? String(t.leadDays)
        : "",
    leadUnit: hasHours ? "saat" : "gun",
    maxPerWeek: t.maxPerWeek != null ? String(t.maxPerWeek) : "",
    delivery: {
      adres: Boolean(t.delivery?.adres),
      nokta: Boolean(t.delivery?.nokta),
      yakin: Boolean(t.delivery?.yakin),
      yerinde: Boolean(t.delivery?.yerinde),
    },
    inspectRequired: Boolean(t.inspectRequired),
    quoteFromPhoto: Boolean(t.quoteFromPhoto),
    platform: t.platform ?? "",
    warrantyDays: t.warrantyDays != null ? String(t.warrantyDays) : "",
    notes: t.notes ?? "",
    workHours: t.workHours ?? "",
    isActive: t.isActive !== false,
  };
}

export function TechServiceEditor({
  me,
  onChanged,
}: {
  me: Provider | undefined;
  onChanged: () => void;
}) {
  const [items, setItems] = useState<ProviderTech[]>([]);
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
      setItems(await fetchMyTechs());
    } catch {
      setItems(me?.techs ?? []);
    }
  }

  useEffect(() => {
    if (!me || me.categoryId !== "teknoloji") return;
    void fetchMyTechs()
      .then(setItems)
      .catch(() => setItems(me.techs ?? []));
  }, [me?.id, me?.categoryId]);

  if (!me || me.categoryId !== "teknoloji") return null;

  function patch<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setErr("");
  }

  function toggleDelivery(id: keyof TechDelivery) {
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

  function startEdit(item: ProviderTech) {
    setEditId(item.id);
    setDraft(fromTech(item));
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
    const leadRaw = draft.leadValue.trim() ? Number(draft.leadValue) : null;
    const maxPerWeek = draft.maxPerWeek.trim() ? Number(draft.maxPerWeek) : null;
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
      materials: draft.materials,
      leadHours: draft.leadUnit === "saat" ? leadRaw : null,
      leadDays: draft.leadUnit === "gun" ? leadRaw : null,
      maxPerWeek,
      delivery: draft.delivery,
      inspectRequired: draft.inspectRequired,
      quoteFromPhoto: draft.quoteFromPhoto,
      platform: draft.platform.trim() || null,
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
    const d = body.delivery;
    if (!d.adres && !d.nokta && !d.yakin && !d.yerinde) {
      setErr("En az bir teslim yöntemi seç.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const saved = editId ? await patchMyTech(editId, body) : await postMyTech(body);
      if (photo) await uploadMyTechPhoto(saved.id, photo);
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
      await deleteMyTech(id);
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
        Teknoloji kartı. Format, kurulum, veri — atölyede veya yerinde. Sabit fiyatta tutar sunucuda çarpılır.
      </p>
      <ul className="mt-3 space-y-2">
        {items.length === 0 && <li className="text-sm text-[var(--muted)]">Henüz hizmet yok.</li>}
        {items.map((item) => {
          const u = techUnitMeta(item.priceUnit);
          return (
            <li key={item.id} className="flex items-center gap-2 rounded-2xl bg-[var(--paper)] px-2 py-2 ring-1 ring-[var(--line)]">
              {item.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.photoUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
              ) : (
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[var(--card)] text-lg" aria-hidden>
                  💻
                </span>
              )}
              <button type="button" onClick={() => startEdit(item)} className="min-w-0 flex-1 text-left text-sm">
                <span className="block font-medium">{item.name}</span>
                <span className="text-xs text-[var(--muted)]">
                  {item.priceType === "inceleme" && item.price <= 0
                    ? "inceleme sonrası"
                    : `${item.priceType === "baslangic" ? "₺" : ""}${item.priceType === "baslangic" ? `${item.price}'ten` : tl(item.price)}/${u.label.toLowerCase()}`}
                  {item.priceType && item.priceType !== "sabit" && item.price > 0 ? ` · ${techPriceTypeLabel(item.priceType)}` : ""}
                  {techKindLabel(item.kind) ? ` · ${techKindLabel(item.kind)}` : ""}
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
          <p className="text-sm font-medium">{editId ? "Hizmeti düzenle" : "Teknoloji & Kurulum — Hizmet Ekle"}</p>

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
              placeholder="Windows format, iPhone kurulum, yazıcı…"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Hizmet Kategorisi</legend>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {TECH_KINDS.map((c) => (
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

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Hizmet Türü</legend>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {TECH_JOBS.map((c) => (
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
            Desteklenen Cihaz
            <input
              value={draft.item}
              onChange={(e) => patch("item", e.target.value)}
              maxLength={80}
              placeholder="Laptop, iPhone, PlayStation, yazıcı…"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <label className="block text-xs text-[var(--muted)]">
            Hizmet Açıklaması
            <textarea
              value={draft.description}
              onChange={(e) => patch("description", e.target.value)}
              maxLength={400}
              rows={2}
              placeholder="Ne kurarsın, ne kadar sürer, hangi modellere bakmazsın…"
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
            <p className="mt-2 text-xs text-[var(--muted)]">Fiyat Tipi</p>
            <div className="mt-1.5 grid gap-1.5">
              {TECH_PRICE_TYPES.map((t) => (
                <label key={t.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="tech-price-type"
                    checked={draft.priceType === t.id}
                    onChange={() => patch("priceType", t.id)}
                  />
                  {t.label}
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">Ücret Birimi</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {TECH_PRICE_UNITS.map((u) => (
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

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Gerekli Malzeme / Parça</legend>
            <div className="mt-1.5 grid gap-1.5">
              {TECH_MATERIALS.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="tech-materials"
                    checked={draft.materials === p.id}
                    onChange={() => patch("materials", p.id)}
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Tahmini İşlem Süresi</legend>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                inputMode="numeric"
                value={draft.leadValue}
                onChange={(e) => patch("leadValue", e.target.value.replace(/\D/g, "").slice(0, 3))}
                placeholder="süre"
                className="w-24 rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm tabular-nums text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
              />
              <button
                type="button"
                onClick={() => patch("leadUnit", "saat")}
                className={`k-chip rounded-full px-3 py-1.5 text-sm ring-1 ${
                  draft.leadUnit === "saat" ? "bg-[var(--teal)] text-white ring-[var(--teal)]" : "ring-[var(--line)]"
                }`}
              >
                saat
              </button>
              <button
                type="button"
                onClick={() => patch("leadUnit", "gun")}
                className={`k-chip rounded-full px-3 py-1.5 text-sm ring-1 ${
                  draft.leadUnit === "gun" ? "bg-[var(--teal)] text-white ring-[var(--teal)]" : "ring-[var(--line)]"
                }`}
              >
                gün
              </button>
            </div>
          </fieldset>

          <label className="block text-xs text-[var(--muted)]">
            Maksimum Sipariş Kapasitesi
            <input
              inputMode="numeric"
              value={draft.maxPerWeek}
              onChange={(e) => patch("maxPerWeek", e.target.value.replace(/\D/g, "").slice(0, 2))}
              placeholder="sınır yok"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm tabular-nums text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
            <span className="mt-0.5 block">cihaz / hafta</span>
          </label>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Teslim Yöntemi</legend>
            <div className="mt-1.5 grid gap-1.5">
              {TECH_DELIVERIES.map((d) => (
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

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Ön İnceleme Gerekli mi?</legend>
            <div className="mt-1.5 flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="tech-inspect"
                  checked={draft.inspectRequired}
                  onChange={() => patch("inspectRequired", true)}
                />
                Evet
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="tech-inspect"
                  checked={!draft.inspectRequired}
                  onChange={() => patch("inspectRequired", false)}
                />
                Hayır
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Fotoğraf / Video ile Ön Değerlendirme</legend>
            <div className="mt-1.5 flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="tech-quote-photo"
                  checked={draft.quoteFromPhoto}
                  onChange={() => patch("quoteFromPhoto", true)}
                />
                Evet
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="tech-quote-photo"
                  checked={!draft.quoteFromPhoto}
                  onChange={() => patch("quoteFromPhoto", false)}
                />
                Hayır
              </label>
            </div>
          </fieldset>

          <label className="block text-xs text-[var(--muted)]">
            Desteklenen İşletim Sistemi / Platform
            <input
              value={draft.platform}
              onChange={(e) => patch("platform", e.target.value)}
              maxLength={80}
              placeholder="Windows, macOS, iOS, Android, PlayStation…"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <label className="block text-xs text-[var(--muted)]">
            Garanti / Tekrar Kontrol Süresi
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
              placeholder="Yedek, lisans, randevu, veri yedekleme…"
              className="mt-1 w-full resize-none rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <label className="block text-xs text-[var(--muted)]">
            Çalışma Günleri ve Saatleri
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

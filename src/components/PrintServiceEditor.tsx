"use client";

import { useEffect, useRef, useState } from "react";
import {
  deleteMyPrint,
  fetchMyPrints,
  patchMyPrint,
  postMyPrint,
  uploadMyPrintPhoto,
} from "@/lib/api";
import {
  PRINT_AVAILS,
  PRINT_COLORS,
  PRINT_FILES,
  PRINT_PAPERS,
  PRINT_PICKUPS,
  PRINT_SENDS,
  PRINT_SIDES,
  printColorList,
} from "@/lib/print";
import { tl } from "@/lib/pricing";
import type {
  PrintAvail,
  PrintColor,
  PrintFile,
  PrintPaper,
  PrintPickup,
  PrintSend,
  PrintSides,
  Provider,
  ProviderPrint,
} from "@/lib/types";

type Draft = {
  name: string;
  colors: PrintColor;
  paper: PrintPaper;
  sides: PrintSides;
  files: PrintFile;
  price: string;
  minPages: string;
  durationMin: string;
  send: PrintSend;
  pickup: PrintPickup;
  avail: PrintAvail;
  workHours: string;
  notes: string;
  isActive: boolean;
};

const emptyColors = (): PrintColor => ({ bw: true, color: false });
const emptyPaper = (): PrintPaper => ({ a4: true });
const emptySides = (): PrintSides => ({ tek: true, cift: false });
const emptyFiles = (): PrintFile => ({ pdf: true, word: false, image: false, other: false });
const emptySend = (): PrintSend => ({ app: true, email: false, other: false });
const emptyPickup = (): PrintPickup => ({ adres: true, nokta: false });

const emptyDraft = (): Draft => ({
  name: "",
  colors: emptyColors(),
  paper: emptyPaper(),
  sides: emptySides(),
  files: emptyFiles(),
  price: "",
  minPages: "1",
  durationMin: "15",
  send: emptySend(),
  pickup: emptyPickup(),
  avail: "hemen",
  workHours: "",
  notes: "",
  isActive: true,
});

function fromPrint(c: ProviderPrint): Draft {
  return {
    name: c.name,
    colors: { ...emptyColors(), ...c.colors },
    paper: { ...emptyPaper(), ...c.paper },
    sides: { ...emptySides(), ...c.sides },
    files: { ...emptyFiles(), ...c.files },
    price: c.price ? String(c.price) : "",
    minPages: c.minPages != null ? String(c.minPages) : "1",
    durationMin: c.durationMin != null ? String(c.durationMin) : "",
    send: { ...emptySend(), ...c.send },
    pickup: { ...emptyPickup(), ...c.pickup },
    avail: c.avail ?? "hemen",
    workHours: c.workHours ?? "",
    notes: c.notes ?? "",
    isActive: c.isActive !== false,
  };
}

function anyTrue(obj: Record<string, boolean>) {
  return Object.values(obj).some(Boolean);
}

export function PrintServiceEditor({
  me,
  onChanged,
}: {
  me: Provider | undefined;
  onChanged: () => void;
}) {
  const [items, setItems] = useState<ProviderPrint[]>([]);
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
      setItems(await fetchMyPrints());
    } catch {
      setItems(me?.prints ?? []);
    }
  }

  useEffect(() => {
    if (!me || me.categoryId !== "cikti") return;
    void fetchMyPrints()
      .then(setItems)
      .catch(() => setItems(me.prints ?? []));
  }, [me?.id, me?.categoryId]);

  if (!me || me.categoryId !== "cikti") return null;

  function patch<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setErr("");
  }

  function toggle<T extends Record<string, boolean>>(
    key: "colors" | "paper" | "sides" | "files" | "send" | "pickup",
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

  function startEdit(item: ProviderPrint) {
    setEditId(item.id);
    setDraft(fromPrint(item));
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
    const minPages = draft.minPages.trim() ? Number(draft.minPages) : 1;
    const durationMin = draft.durationMin.trim() ? Number(draft.durationMin) : null;
    return {
      name: draft.name.trim(),
      colors: draft.colors,
      paper: draft.paper,
      sides: draft.sides,
      files: draft.files,
      price: n,
      minPages,
      durationMin,
      send: draft.send,
      pickup: draft.pickup,
      avail: draft.avail,
      workHours: draft.workHours.trim() || null,
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
    if (!anyTrue(body.colors)) {
      setErr("En az bir baskı türü seç.");
      return;
    }
    if (!anyTrue(body.paper)) {
      setErr("Kağıt boyutu seç.");
      return;
    }
    if (!anyTrue(body.sides)) {
      setErr("En az bir baskı yüzü seç.");
      return;
    }
    if (!anyTrue(body.files)) {
      setErr("En az bir dosya türü seç.");
      return;
    }
    if (!Number.isInteger(body.price) || body.price < 1) {
      setErr("Sayfa ücreti tam sayı ₺ olsun.");
      return;
    }
    if (!Number.isInteger(body.minPages) || body.minPages < 1) {
      setErr("Minimum sipariş 1 sayfa ve üzeri olsun.");
      return;
    }
    if (!anyTrue(body.send)) {
      setErr("En az bir dosya gönderme yöntemi seç.");
      return;
    }
    if (!anyTrue(body.pickup)) {
      setErr("En az bir teslim alma yöntemi seç.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const saved = editId ? await patchMyPrint(editId, body) : await postMyPrint(body);
      if (photo) await uploadMyPrintPhoto(saved.id, photo);
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
      await deleteMyPrint(id);
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
        Evde çıktı kartı. Sayfa başı tutar sunucuda çarpılır.
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
                🖨️
              </span>
            )}
            <button type="button" onClick={() => startEdit(item)} className="min-w-0 flex-1 text-left text-sm">
              <span className="block font-medium">{item.name}</span>
              <span className="text-xs text-[var(--muted)]">
                {tl(item.price)}/sayfa
                {printColorList(item.colors).length ? ` · ${printColorList(item.colors).join(", ")}` : ""}
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
          <p className="text-sm font-medium">{editId ? "Hizmeti düzenle" : "Evde Çıktı Alma — Hizmet Ekle"}</p>

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
              placeholder="A4 siyah-beyaz, renkli çıktı…"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Baskı Türü</legend>
            <div className="mt-1.5 grid gap-1.5">
              {PRINT_COLORS.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={draft.colors[row.id]} onChange={() => toggle<PrintColor>("colors", row.id)} />
                  {row.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Kağıt Boyutu</legend>
            <div className="mt-1.5 grid gap-1.5">
              {PRINT_PAPERS.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={draft.paper[row.id]} onChange={() => toggle<PrintPaper>("paper", row.id)} />
                  {row.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Baskı</legend>
            <div className="mt-1.5 grid gap-1.5">
              {PRINT_SIDES.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={draft.sides[row.id]} onChange={() => toggle<PrintSides>("sides", row.id)} />
                  {row.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Dosya Türü</legend>
            <div className="mt-1.5 grid gap-1.5">
              {PRINT_FILES.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={draft.files[row.id]} onChange={() => toggle<PrintFile>("files", row.id)} />
                  {row.label}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block text-xs text-[var(--muted)]">
            Sayfa Ücreti
            <input
              inputMode="numeric"
              value={draft.price}
              onChange={(e) => patch("price", e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="₺"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm tabular-nums text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
            <span className="mt-0.5 block">₺ / sayfa</span>
          </label>

          <label className="block text-xs text-[var(--muted)]">
            Minimum Sipariş
            <input
              inputMode="numeric"
              value={draft.minPages}
              onChange={(e) => patch("minPages", e.target.value.replace(/\D/g, "").slice(0, 3))}
              placeholder="sayfa"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm tabular-nums text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
            <span className="mt-0.5 block">sayfa</span>
          </label>

          <label className="block text-xs text-[var(--muted)]">
            Hazırlama Süresi
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
            <legend className="text-xs text-[var(--muted)]">Dosya Gönderme</legend>
            <div className="mt-1.5 grid gap-1.5">
              {PRINT_SENDS.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={draft.send[row.id]} onChange={() => toggle<PrintSend>("send", row.id)} />
                  {row.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Teslim Alma</legend>
            <div className="mt-1.5 grid gap-1.5">
              {PRINT_PICKUPS.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={draft.pickup[row.id]} onChange={() => toggle<PrintPickup>("pickup", row.id)} />
                  {row.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Müsaitlik</legend>
            <div className="mt-1.5 grid gap-1.5">
              {PRINT_AVAILS.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input type="radio" name="print-avail" checked={draft.avail === row.id} onChange={() => patch("avail", row.id)} />
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
            Özel Notlar
            <textarea
              value={draft.notes}
              onChange={(e) => patch("notes", e.target.value)}
              maxLength={400}
              rows={2}
              placeholder="Renkli için PDF, USB kabul etmem…"
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

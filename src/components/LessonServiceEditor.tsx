"use client";

import { useEffect, useRef, useState } from "react";
import {
  deleteMyLesson,
  fetchMyLessons,
  patchMyLesson,
  postMyLesson,
  uploadMyLessonPhoto,
} from "@/lib/api";
import {
  LESSON_DURATIONS,
  LESSON_KINDS,
  LESSON_LEVELS,
  LESSON_MATERIALS,
  LESSON_PLACES,
  LESSON_SUBJECTS,
  lessonKindList,
} from "@/lib/lesson";
import { tl } from "@/lib/pricing";
import type {
  LessonDuration,
  LessonKind,
  LessonLevel,
  LessonMaterials,
  LessonPlace,
  LessonSubject,
  Provider,
  ProviderLesson,
} from "@/lib/types";

type Draft = {
  name: string;
  kinds: LessonKind;
  levels: LessonLevel;
  subjects: LessonSubject;
  subjectOther: string;
  description: string;
  durations: LessonDuration;
  price: string;
  place: LessonPlace;
  weekly: string;
  materials: LessonMaterials;
  notes: string;
  isActive: boolean;
};

const emptyKinds = (): LessonKind => ({
  takip: true,
  okuma: false,
  eslik: true,
  tekrar: false,
  sinav: false,
  other: false,
});
const emptyLevels = (): LessonLevel => ({ ilkokul: true, ortaokul: false, lise: false });
const emptySubjects = (): LessonSubject => ({
  turkce: true,
  matematik: true,
  fen: false,
  sosyal: false,
  ingilizce: false,
  all: false,
  other: false,
});
const emptyDurations = (): LessonDuration => ({ m30: false, m45: true, m60: true, m90: false });
const emptyPlace = (): LessonPlace => ({ ev: true, ortak: false, online: false });
const emptyMaterials = (): LessonMaterials => ({ student: true, provider: false, none: false });

const emptyDraft = (): Draft => ({
  name: "",
  kinds: emptyKinds(),
  levels: emptyLevels(),
  subjects: emptySubjects(),
  subjectOther: "",
  description: "",
  durations: emptyDurations(),
  price: "",
  place: emptyPlace(),
  weekly: "1",
  materials: emptyMaterials(),
  notes: "",
  isActive: true,
});

function fromLesson(c: ProviderLesson): Draft {
  return {
    name: c.name,
    kinds: { ...emptyKinds(), ...c.kinds },
    levels: { ...emptyLevels(), ...c.levels },
    subjects: { ...emptySubjects(), ...c.subjects },
    subjectOther: c.subjectOther ?? "",
    description: c.description ?? "",
    durations: { ...emptyDurations(), ...c.durations },
    price: c.price ? String(c.price) : "",
    place: { ...emptyPlace(), ...c.place },
    weekly: c.weekly != null ? String(c.weekly) : "1",
    materials: { ...emptyMaterials(), ...c.materials },
    notes: c.notes ?? "",
    isActive: c.isActive !== false,
  };
}

function anyTrue(obj: Record<string, boolean>) {
  return Object.values(obj).some(Boolean);
}

export function LessonServiceEditor({
  me,
  onChanged,
}: {
  me: Provider | undefined;
  onChanged: () => void;
}) {
  const [items, setItems] = useState<ProviderLesson[]>([]);
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
      setItems(await fetchMyLessons());
    } catch {
      setItems(me?.lessons ?? []);
    }
  }

  useEffect(() => {
    if (!me || me.categoryId !== "odev") return;
    void fetchMyLessons()
      .then(setItems)
      .catch(() => setItems(me.lessons ?? []));
  }, [me?.id, me?.categoryId]);

  if (!me || me.categoryId !== "odev") return null;

  function patch<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setErr("");
  }

  function toggle<T extends Record<string, boolean>>(
    key: "kinds" | "levels" | "subjects" | "durations" | "place" | "materials",
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

  function startEdit(item: ProviderLesson) {
    setEditId(item.id);
    setDraft(fromLesson(item));
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
    const weekly = draft.weekly.trim() ? Number(draft.weekly) : 1;
    return {
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      kinds: draft.kinds,
      levels: draft.levels,
      subjects: draft.subjects,
      subjectOther: draft.subjects.other ? draft.subjectOther.trim() || null : null,
      durations: draft.durations,
      price: n,
      place: draft.place,
      weekly,
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
    if (!anyTrue(body.kinds)) {
      setErr("En az bir hizmet türü seç.");
      return;
    }
    if (!anyTrue(body.levels)) {
      setErr("En az bir eğitim seviyesi seç.");
      return;
    }
    if (!anyTrue(body.subjects)) {
      setErr("En az bir ders / alan seç.");
      return;
    }
    if (body.subjects.other && !body.subjectOther) {
      setErr("Diğer dersi yaz.");
      return;
    }
    if (!anyTrue(body.durations)) {
      setErr("En az bir ders süresi seç.");
      return;
    }
    if (!Number.isInteger(body.price) || body.price < 1) {
      setErr("Fiyat tam sayı ₺ olsun.");
      return;
    }
    if (!Number.isInteger(body.weekly) || body.weekly < 1) {
      setErr("Haftalık ders 1 ve üzeri olsun.");
      return;
    }
    if (!anyTrue(body.place)) {
      setErr("En az bir ders yeri seç.");
      return;
    }
    if (!anyTrue(body.materials)) {
      setErr("En az bir malzeme seçeneği seç.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const saved = editId ? await patchMyLesson(editId, body) : await postMyLesson(body);
      if (photo) await uploadMyLessonPhoto(saved.id, photo);
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
      await deleteMyLesson(id);
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
      <p className="mt-1 text-xs text-[var(--muted)]">Ödev kartı. Ders başı tutar sunucuda çarpılır.</p>
      <ul className="mt-3 space-y-2">
        {items.length === 0 && <li className="text-sm text-[var(--muted)]">Henüz hizmet yok.</li>}
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-2 rounded-2xl bg-[var(--paper)] px-2 py-2 ring-1 ring-[var(--line)]">
            {item.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.photoUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
            ) : (
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[var(--card)] text-lg" aria-hidden>
                📚
              </span>
            )}
            <button type="button" onClick={() => startEdit(item)} className="min-w-0 flex-1 text-left text-sm">
              <span className="block font-medium">{item.name}</span>
              <span className="text-xs text-[var(--muted)]">
                {tl(item.price)}/ders
                {lessonKindList(item.kinds).length ? ` · ${lessonKindList(item.kinds).join(", ")}` : ""}
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
          <p className="text-sm font-medium">{editId ? "Hizmeti düzenle" : "İlkokul / Ortaokul Ödev Eşliği — Hizmet Ekle"}</p>

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
              placeholder="İlkokul ödev takibi, okuma saati…"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Hizmet Türü</legend>
            <div className="mt-1.5 grid gap-1.5">
              {LESSON_KINDS.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={draft.kinds[row.id]} onChange={() => toggle<LessonKind>("kinds", row.id)} />
                  {row.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Eğitim Seviyesi</legend>
            <div className="mt-1.5 grid gap-1.5">
              {LESSON_LEVELS.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={draft.levels[row.id]} onChange={() => toggle<LessonLevel>("levels", row.id)} />
                  {row.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Ders / Alan</legend>
            <div className="mt-1.5 grid gap-1.5">
              {LESSON_SUBJECTS.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={draft.subjects[row.id]} onChange={() => toggle<LessonSubject>("subjects", row.id)} />
                  {row.label}
                  {row.id === "other" ? " (lütfen belirtin)" : ""}
                </label>
              ))}
            </div>
            {draft.subjects.other && (
              <input
                value={draft.subjectOther}
                onChange={(e) => patch("subjectOther", e.target.value)}
                maxLength={80}
                placeholder="Hangi ders?"
                className="mt-2 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
              />
            )}
          </fieldset>

          <label className="block text-xs text-[var(--muted)]">
            Hizmet Açıklaması
            <textarea
              value={draft.description}
              onChange={(e) => patch("description", e.target.value)}
              maxLength={400}
              rows={2}
              placeholder="Nasıl çalışıyorsun, yaş aralığı, online araç…"
              className="mt-1 w-full resize-none rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
          </label>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Ders Süresi</legend>
            <div className="mt-1.5 grid gap-1.5">
              {LESSON_DURATIONS.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={draft.durations[row.id]} onChange={() => toggle<LessonDuration>("durations", row.id)} />
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
            <span className="mt-0.5 block">₺ / ders</span>
          </label>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Ders Yeri</legend>
            <div className="mt-1.5 grid gap-1.5">
              {LESSON_PLACES.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={draft.place[row.id]} onChange={() => toggle<LessonPlace>("place", row.id)} />
                  {row.label}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block text-xs text-[var(--muted)]">
            Haftalık Ders Sayısı
            <input
              inputMode="numeric"
              value={draft.weekly}
              onChange={(e) => patch("weekly", e.target.value.replace(/\D/g, "").slice(0, 2))}
              placeholder="ders"
              className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm tabular-nums text-[var(--ink)] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
            />
            <span className="mt-0.5 block">ders · haftalık / minimum sipariş</span>
          </label>

          <fieldset>
            <legend className="text-xs text-[var(--muted)]">Gerekli Malzemeler</legend>
            <div className="mt-1.5 grid gap-1.5">
              {LESSON_MATERIALS.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={draft.materials[row.id]} onChange={() => toggle<LessonMaterials>("materials", row.id)} />
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
              placeholder="Velinin yanında kalması, Zoom linki…"
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

"use client";

import { useState } from "react";
import type { RatingBreakdown, Review, WorkPhoto } from "@/lib/types";

export function PhotoStrip({
  photos,
  size = "md",
  onRemove,
  removingId,
}: {
  photos: WorkPhoto[];
  size?: "sm" | "md";
  onRemove?: (id: string) => void;
  removingId?: string | null;
}) {
  if (!photos.length) return null;
  const dim = size === "sm" ? "h-16 w-16" : "h-24 w-24";
  return (
    <ul className="mt-3 flex gap-2 overflow-x-auto pt-1 pr-1 pb-1">
      {photos.map((p) => (
        <li key={p.id} className="relative shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={p.url}
            alt=""
            className={`${dim} rounded-2xl object-cover ring-1 ring-[var(--line)] ${
              removingId === p.id ? "opacity-40" : ""
            }`}
          />
          {onRemove && (
            <button
              type="button"
              aria-label="Fotoğrafı sil"
              disabled={Boolean(removingId)}
              onClick={() => onRemove(p.id)}
              className="k-press absolute -top-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-[var(--ink)] text-xs leading-none text-[var(--paper)]"
            >
              ×
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

export function PhotoAdd({
  label,
  busy,
  onPick,
}: {
  label: string;
  busy?: boolean;
  onPick: (file: File) => void;
}) {
  return (
    <label className="k-press inline-flex cursor-pointer items-center rounded-full px-3 py-1.5 text-xs ring-1 ring-[var(--line)]">
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="sr-only"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onPick(file);
        }}
      />
      {busy ? "Yükleniyor…" : label}
    </label>
  );
}

function StarPick({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (n: number) => void;
}) {
  return (
    <div className="mt-2 flex items-center justify-between gap-2">
      <span className="text-xs text-[var(--muted)]">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`text-sm ${value != null && n <= value ? "text-[var(--clay)]" : "text-[var(--line)]"}`}
            aria-label={`${label} ${n} yıldız`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}

export function RatingBreakdownView({ rating }: { rating?: RatingBreakdown | null }) {
  if (!rating || rating.count <= 0) return null;
  const rows: { label: string; value: number | null }[] = [
    { label: "Kalite", value: rating.quality },
    { label: "Zamanlama", value: rating.timeliness },
    { label: "İletişim", value: rating.communication },
  ];
  const visible = rows.filter((r) => r.value != null);
  if (visible.length === 0 && rating.repeatRate == null) return null;
  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium">Müşteri değerlendirmeleri</h3>
      <ul className="mt-2 space-y-1.5">
        {visible.map((r) => (
          <li key={r.label} className="flex items-center gap-2 text-sm">
            <span className="w-20 shrink-0 text-xs text-[var(--muted)]">{r.label}</span>
            <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--line)]">
              <span
                className="block h-full rounded-full bg-[var(--teal)]"
                style={{ width: `${Math.round(((r.value ?? 0) / 5) * 100)}%` }}
              />
            </span>
            <span className="w-8 shrink-0 text-right tabular-nums">{(r.value ?? 0).toFixed(1)}</span>
          </li>
        ))}
      </ul>
      {rating.repeatRate != null ? (
        <p className="mt-2 text-xs text-[var(--muted)]">
          %{Math.round(rating.repeatRate * 100)} tekrar tercih etti
        </p>
      ) : null}
    </div>
  );
}

export function ReviewList({ reviews }: { reviews: Review[] }) {
  if (!reviews.length) return null;
  return (
    <ul className="mt-3 space-y-3">
      {reviews.map((r) => (
        <li key={r.id} className="rounded-2xl bg-[var(--paper)] px-3 py-2.5 ring-1 ring-[var(--line)]">
          <p className="text-sm font-medium">
            {"★".repeat(r.rating)}
            <span className="text-[var(--line)]">{"★".repeat(5 - r.rating)}</span>
            <span className="ml-2 text-xs font-normal text-[var(--muted)]">{r.author}</span>
          </p>
          <p className="mt-1 text-sm leading-relaxed">{r.body}</p>
          <PhotoStrip photos={r.photos ?? []} size="sm" />
        </li>
      ))}
    </ul>
  );
}

export function ReviewComposer({
  busy,
  err,
  onSubmit,
}: {
  busy: boolean;
  err: string;
  onSubmit: (input: {
    rating: number;
    body: string;
    files: File[];
    quality?: number | null;
    timeliness?: number | null;
    communication?: number | null;
    wouldRepeat?: boolean | null;
  }) => void;
}) {
  const [rating, setRating] = useState(5);
  const [quality, setQuality] = useState<number | null>(null);
  const [timeliness, setTimeliness] = useState<number | null>(null);
  const [communication, setCommunication] = useState<number | null>(null);
  const [wouldRepeat, setWouldRepeat] = useState<boolean | null>(null);
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  return (
    <form
      className="mt-4 rounded-2xl bg-[var(--paper)] p-3 ring-1 ring-[var(--line)]"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ rating, body, files, quality, timeliness, communication, wouldRepeat });
      }}
    >
      <p className="text-sm font-medium">Yorumun</p>
      <div className="mt-2 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            className={`text-lg ${n <= rating ? "text-[var(--clay)]" : "text-[var(--line)]"}`}
            aria-label={`${n} yıldız`}
          >
            ★
          </button>
        ))}
      </div>
      <StarPick label="Kalite" value={quality} onChange={setQuality} />
      <StarPick label="Zamanlama" value={timeliness} onChange={setTimeliness} />
      <StarPick label="İletişim" value={communication} onChange={setCommunication} />
      <div className="mt-3">
        <p className="text-xs text-[var(--muted)]">Tekrar bu komşuyu tercih eder misin?</p>
        <div className="mt-1 flex gap-2">
          {(
            [
              [true, "Evet"],
              [false, "Hayır"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={label}
              type="button"
              onClick={() => setWouldRepeat(value)}
              className={`k-press rounded-full px-3 py-1 text-xs ring-1 ${
                wouldRepeat === value
                  ? "bg-[var(--teal)] text-white ring-[var(--teal)]"
                  : "ring-[var(--line)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Katlaması, kokusu, teslim nasıl geçti…"
        rows={3}
        className="mt-2 w-full resize-none rounded-2xl bg-[var(--card)] px-3 py-2 text-sm ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className="k-press inline-flex cursor-pointer rounded-full px-3 py-1.5 text-xs ring-1 ring-[var(--line)]">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            multiple
            className="sr-only"
            onChange={(e) => {
              const next = [...files, ...Array.from(e.target.files ?? [])].slice(0, 4);
              setFiles(next);
              e.target.value = "";
            }}
          />
          Görsel ekle
        </label>
        {files.map((f) => (
          <span key={f.name + f.size} className="text-[11px] text-[var(--muted)]">
            {f.name}
          </span>
        ))}
      </div>
      {err && <p className="mt-2 text-sm text-[var(--clay)]">{err}</p>}
      <button
        type="submit"
        disabled={busy}
        className="k-press k-cta mt-3 w-full rounded-full bg-[var(--teal)] py-2.5 text-sm font-medium text-white"
      >
        {busy ? "Gönderiliyor…" : "Yorumu bırak"}
      </button>
    </form>
  );
}

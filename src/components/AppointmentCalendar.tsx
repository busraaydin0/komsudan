"use client";

import { useEffect, useState } from "react";
import type { AppointmentWindow } from "@/lib/types";

type CalWindow = {
  date: string;
  start: string;
  end: string;
  status: "ok" | "low" | "full";
  selectable: boolean;
};

export function AppointmentCalendar({
  providerId,
  title,
  minDate,
  value,
  onPick,
}: {
  providerId: string;
  title: string;
  minDate?: string;
  value: AppointmentWindow | null;
  onPick: (w: AppointmentWindow) => void;
}) {
  const [windows, setWindows] = useState<CalWindow[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/providers/${encodeURIComponent(providerId)}/calendar`);
        const data = (await res.json()) as { windows?: CalWindow[] };
        if (!cancelled) setWindows(data.windows ?? []);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [providerId]);

  const days = [...new Set(windows.map((w) => w.date))].filter((d) => !minDate || d >= minDate);

  if (!ready) return <p className="text-xs text-[var(--muted)]">Takvim yükleniyor…</p>;

  return (
    <div className="mt-3 space-y-3">
      <h3 className="text-sm font-medium">{title}</h3>
      {days.map((date) => (
        <div key={date}>
          <p className="text-xs font-medium text-[var(--muted)]">
            {new Date(`${date}T12:00:00+03:00`).toLocaleDateString("tr-TR", {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            {windows
              .filter((w) => w.date === date)
              .map((w) => {
                const selected =
                  value?.date === w.date &&
                  value.windowStart === w.start &&
                  value.windowEnd === w.end;
                const disabled = !w.selectable || w.status === "full";
                const tone =
                  w.status === "full"
                    ? "opacity-40 line-through"
                    : w.status === "low"
                      ? "ring-[var(--load-low)]"
                      : "ring-[var(--line)]";
                return (
                  <button
                    key={`${w.date}-${w.start}`}
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      onPick({ date: w.date, windowStart: w.start, windowEnd: w.end })
                    }
                    className={`k-chip rounded-full px-3 py-1.5 text-xs ring-1 ${tone} ${
                      selected ? "bg-[var(--teal)] text-white ring-[var(--teal)]" : ""
                    } ${disabled ? "cursor-not-allowed bg-[var(--paper)]" : ""}`}
                  >
                    {w.start}–{w.end}
                  </button>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}

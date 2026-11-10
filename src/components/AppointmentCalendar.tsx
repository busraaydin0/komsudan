"use client";

import { useEffect, useState } from "react";
import { readJson } from "@/lib/http/client";
import { parseCalendarWindows, type CalendarWindowDto } from "@/lib/calendar/parseCalendarResponse";
import type { AppointmentWindow } from "@/lib/types";

type CalWindow = CalendarWindowDto;

export function AppointmentCalendar({
  providerId,
  title,
  minDate,
  maxDate,
  express,
  value,
  onPick,
}: {
  providerId: string;
  title: string;
  minDate?: string;
  maxDate?: string;
  express?: boolean;
  value: AppointmentWindow | null;
  onPick: (w: AppointmentWindow) => void;
}) {
  const [windows, setWindows] = useState<CalWindow[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const qs = express ? "?express=1" : "";
        const res = await fetch(`/api/providers/${encodeURIComponent(providerId)}/calendar${qs}`);
        const windows = parseCalendarWindows(await readJson(res));
        if (!cancelled) setWindows(windows);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [providerId, express]);

  const days = [...new Set(windows.map((w) => w.date))].filter(
    (d) => (!minDate || d >= minDate) && (!maxDate || d <= maxDate),
  );

  if (!ready) return <p className="text-xs text-[var(--muted)]">Takvim yükleniyor…</p>;

  return (
    <div className="mt-3 space-y-3">
      <h3 className="text-sm font-medium">{title}</h3>
      {days.length === 0 ? (
        <p className="text-xs text-[var(--muted)]">Bu komşunun seçilebilir saati yok.</p>
      ) : null}
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

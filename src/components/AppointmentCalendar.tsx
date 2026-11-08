"use client";

import { useEffect, useState } from "react";
import { readJson } from "@/lib/http/client";
import { parseCalendarDays, type CalendarDayDto } from "@/lib/calendar/parseCalendarResponse";
import { CALENDAR_COPY } from "@/lib/calendar/gapCopy";
import { isCalendarChipDisabled, toAppointmentWindow } from "@/lib/calendar/selection";
import type { AppointmentWindow } from "@/lib/types";

export function AppointmentCalendar({
  providerId,
  title,
  minDate,
  maxDate,
  express,
  neededUnits,
  value,
  onPick,
}: {
  providerId: string;
  title: string;
  minDate?: string;
  maxDate?: string;
  express?: boolean;
  neededUnits?: number;
  value: AppointmentWindow | null;
  onPick: (w: AppointmentWindow) => void;
}) {
  const [days, setDays] = useState<CalendarDayDto[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const qs = new URLSearchParams();
        if (express) qs.set("express", "1");
        if (neededUnits != null) qs.set("units", String(neededUnits));
        const suffix = qs.toString() ? `?${qs.toString()}` : "";
        const res = await fetch(`/api/providers/${encodeURIComponent(providerId)}/calendar${suffix}`);
        const next = parseCalendarDays(await readJson(res));
        if (!cancelled) setDays(next);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [providerId, express, neededUnits]);

  const visible = days.filter((d) => (!minDate || d.date >= minDate) && (!maxDate || d.date <= maxDate));
  const selectable = visible.some((d) => d.windows.some((w) => !isCalendarChipDisabled(w)));
  const emptyReason = !selectable
    ? visible.find((d) => d.reason)?.reason ??
      (express ? CALENDAR_COPY.expressNone : CALENDAR_COPY.leadToday)
    : null;

  if (!ready) return <p className="text-xs text-[var(--muted)]">Takvim yükleniyor…</p>;

  return (
    <div className="mt-3 space-y-3 pb-4">
      <h3 className="text-sm font-medium">{title}</h3>
      {emptyReason ? <p className="text-xs text-[var(--clay)]">{emptyReason}</p> : null}
      {visible.map((day) => (
        <div key={day.date}>
          <p className="text-xs font-medium text-[var(--muted)]">
            {new Date(`${day.date}T12:00:00+03:00`).toLocaleDateString("tr-TR", {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}
          </p>
          {day.status === "closed" || day.windows.length === 0 ? (
            <p className="mt-1 text-xs text-[var(--clay)]">{day.reason ?? CALENDAR_COPY.closed}</p>
          ) : (
            <>
              {day.reason && !day.windows.some((w) => !isCalendarChipDisabled(w)) ? (
                <p className="mt-1 text-xs text-[var(--clay)]">{day.reason}</p>
              ) : null}
              <div className="mt-1 flex flex-wrap gap-2">
                {day.windows.map((w) => {
                  const selected =
                    value?.date === w.date &&
                    value.windowStart === w.start &&
                    value.windowEnd === w.end;
                  const disabled = isCalendarChipDisabled(w);
                  const tone =
                    w.status === "full" || w.status === "closed"
                      ? "opacity-40 line-through"
                      : w.status === "low"
                        ? "ring-[var(--load-low)]"
                        : "ring-[var(--line)]";
                  return (
                    <button
                      key={`${w.date}-${w.start}`}
                      type="button"
                      disabled={disabled}
                      title={disabled ? (w.reason ?? day.reason ?? undefined) : undefined}
                      onClick={() => onPick(toAppointmentWindow(w))}
                      className={`k-chip rounded-full px-3 py-1.5 text-xs ring-1 ${tone} ${
                        selected ? "bg-[var(--teal)] text-white ring-[var(--teal)]" : ""
                      } ${disabled ? "cursor-not-allowed bg-[var(--paper)]" : ""}`}
                    >
                      {w.start}–{w.end}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

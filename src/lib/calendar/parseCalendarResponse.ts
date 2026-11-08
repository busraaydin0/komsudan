import { unwrapEnvelope } from "@/lib/http/client";

export type CalendarWindowDto = {
  date: string;
  start: string;
  end: string;
  status: "ok" | "low" | "full" | "closed";
  selectable: boolean;
  reason: string | null;
};

export type CalendarDayDto = {
  date: string;
  status: CalendarWindowDto["status"];
  reason: string | null;
  windows: CalendarWindowDto[];
};

function asWindow(raw: unknown): CalendarWindowDto | null {
  if (!raw || typeof raw !== "object") return null;
  const w = raw as Partial<CalendarWindowDto>;
  if (typeof w.date !== "string" || typeof w.start !== "string" || typeof w.end !== "string") return null;
  const status = w.status === "low" || w.status === "full" || w.status === "closed" ? w.status : "ok";
  return {
    date: w.date,
    start: w.start,
    end: w.end,
    status,
    selectable: Boolean(w.selectable),
    reason: typeof w.reason === "string" ? w.reason : null,
  };
}

function asDay(raw: unknown): CalendarDayDto | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Partial<CalendarDayDto> & { date?: unknown };
  if (typeof d.date !== "string") return null;
  const windows = Array.isArray(d.windows) ? d.windows.map(asWindow).filter((w): w is CalendarWindowDto => w != null) : [];
  const status = d.status === "low" || d.status === "full" || d.status === "closed" ? d.status : "ok";
  return {
    date: d.date,
    status,
    reason: typeof d.reason === "string" ? d.reason : null,
    windows,
  };
}

/** GET /api/providers/:id/calendar `{ data: { windows } }` zarfını açar. */
export function parseCalendarWindows(payload: unknown): CalendarWindowDto[] {
  if (!payload || typeof payload !== "object") return [];
  const data = unwrapEnvelope(
    payload as { data?: { windows?: unknown[] }; windows?: unknown[] },
  );
  const raw = Array.isArray(data.windows) ? data.windows : [];
  return raw.map(asWindow).filter((w): w is CalendarWindowDto => w != null);
}

/** `{ data: { days } }` — Pazar kapalı gibi penceresiz günler windows'ta yok. */
export function parseCalendarDays(payload: unknown): CalendarDayDto[] {
  if (!payload || typeof payload !== "object") return [];
  const data = unwrapEnvelope(
    payload as { data?: { days?: unknown[]; windows?: unknown[] }; days?: unknown[]; windows?: unknown[] },
  );
  if (Array.isArray(data.days) && data.days.length > 0) {
    return data.days.map(asDay).filter((d): d is CalendarDayDto => d != null);
  }
  const windows = parseCalendarWindows(payload);
  const dates = [...new Set(windows.map((w) => w.date))];
  return dates.map((date) => {
    const dayWindows = windows.filter((w) => w.date === date);
    return {
      date,
      status: dayWindows[0]?.status ?? "ok",
      reason: dayWindows.find((w) => w.reason)?.reason ?? null,
      windows: dayWindows,
    };
  });
}

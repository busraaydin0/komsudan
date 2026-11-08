import { isoDateInIstanbul, isoWeekdayFromIsoDate, addCalendarDaysIso } from "@/lib/capacity/istanbul";
import { loadToneFromFreeRatio } from "@/lib/capacity/loadTone";
import { loadDayUsage, settingsFromRow } from "@/lib/services/capacityService";
import { getCapacitySettings } from "@/lib/db/providerCapacity";
import { listSlots } from "@/lib/db/providers";
import { splitTwoHourWindows, pickupInstantIso } from "@/lib/scheduling/windows";
import { CALENDAR_COPY } from "@/lib/calendar/gapCopy";

export type WindowStatus = "ok" | "low" | "full" | "closed";

export type CalendarWindow = {
  date: string;
  start: string;
  end: string;
  status: WindowStatus;
  selectable: boolean;
  reason: string | null;
};

export type CalendarDay = {
  date: string;
  status: WindowStatus;
  reason: string | null;
  windows: CalendarWindow[];
};

const TODAY_LEAD_MS = 2 * 3_600_000;
const EXPRESS_TODAY_LEAD_MS = 1 * 3_600_000;

function remainingOnDay(
  providerId: string,
  date: string,
  settings: ReturnType<typeof settingsFromRow>,
  express: boolean,
) {
  const usage = loadDayUsage(providerId, date, 1, settings)[0];
  const quota = settings.expressQuota ?? 0;
  if (!usage) {
    return { remaining: 0, cap: 0, quota };
  }
  if (express) {
    return {
      remaining: Math.max(0, quota - (usage.usedExpressUnits ?? 0)),
      cap: quota,
      quota,
    };
  }
  const cap = Math.max(0, usage.maxUnits - quota);
  return {
    remaining: Math.max(0, cap - usage.usedUnits),
    cap,
    quota,
  };
}

function toneFromRemaining(remaining: number, cap: number): Exclude<WindowStatus, "closed"> {
  if (cap <= 0 || remaining <= 0) return "full";
  return loadToneFromFreeRatio(remaining / cap);
}

function dayCapacity(
  providerId: string,
  date: string,
  settings: ReturnType<typeof settingsFromRow> | null,
  express: boolean,
  neededUnits?: number,
): { status: WindowStatus; reason: string | null } {
  if (!settings) return { status: "ok", reason: null };
  const { remaining, cap, quota } = remainingOnDay(providerId, date, settings, express);
  if (express && quota <= 0) {
    return { status: "full", reason: CALENDAR_COPY.expressNone };
  }
  if (cap <= 0 || remaining <= 0) {
    return { status: "full", reason: express ? CALENDAR_COPY.expressNone : CALENDAR_COPY.full };
  }
  if (express && neededUnits != null && neededUnits > remaining) {
    return { status: "full", reason: CALENDAR_COPY.size };
  }
  if (!express && neededUnits != null && neededUnits > settings.maxUnitsPerOrder) {
    return { status: "full", reason: CALENDAR_COPY.size };
  }
  return { status: toneFromRemaining(remaining, cap), reason: null };
}

export function buildProviderCalendarDays(
  providerId: string,
  now = new Date(),
  express = false,
  neededUnits?: number,
): CalendarDay[] {
  const settingsRow = getCapacitySettings(providerId);
  const settings = settingsRow ? settingsFromRow(settingsRow) : null;
  const workingDays = settings?.workingDays ?? [];
  const slots = listSlots(providerId, true);
  const today = isoDateInIstanbul(now);
  const leadMs = express ? EXPRESS_TODAY_LEAD_MS : TODAY_LEAD_MS;
  const days: CalendarDay[] = [];

  for (let i = 0; i < 7; i++) {
    const date = addCalendarDaysIso(today, i);
    const dow = isoWeekdayFromIsoDate(date);
    const daySlots = slots.filter((s) => s.day_of_week === dow);
    const working = workingDays.length === 0 ? daySlots.length > 0 : workingDays.includes(dow);
    if (!working || daySlots.length === 0) {
      days.push({ date, status: "closed", reason: CALENDAR_COPY.closed, windows: [] });
      continue;
    }

    const cap = dayCapacity(providerId, date, settings, express, neededUnits);
    const windows: CalendarWindow[] = [];
    for (const slot of daySlots) {
      for (const w of splitTwoHourWindows(slot.start_time, slot.end_time)) {
        const startInstant = pickupInstantIso(date, w.start);
        const tooSoon = date === today && startInstant.getTime() < now.getTime() + leadMs;
        const selectable = cap.status !== "full" && cap.status !== "closed" && !tooSoon;
        windows.push({
          date,
          start: w.start,
          end: w.end,
          status: cap.status,
          selectable,
          reason: selectable ? null : cap.reason,
        });
      }
    }

    const anySelectable = windows.some((w) => w.selectable);
    let reason = cap.reason;
    if (!anySelectable && !reason) {
      reason = express && date === today ? CALENDAR_COPY.expressNone : CALENDAR_COPY.leadToday;
    }
    days.push({ date, status: cap.status, reason, windows });
  }

  return days;
}

export function buildProviderCalendar(
  providerId: string,
  now = new Date(),
  express = false,
  neededUnits?: number,
): CalendarWindow[] {
  return buildProviderCalendarDays(providerId, now, express, neededUnits).flatMap((d) => d.windows);
}

export function assertCalendarWindow(
  providerId: string,
  window: { date: string; windowStart: string; windowEnd: string },
  now = new Date(),
  express = false,
) {
  const hit = buildProviderCalendar(providerId, now, express).find(
    (w) => w.date === window.date && w.start === window.windowStart && w.end === window.windowEnd,
  );
  if (!hit) {
    throw new Error("WINDOW_NOT_FOUND");
  }
  if (!hit.selectable) {
    throw new Error("WINDOW_NOT_SELECTABLE");
  }
}

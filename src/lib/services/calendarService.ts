import { isoDateInIstanbul, isoWeekdayFromIsoDate, addCalendarDaysIso } from "@/lib/capacity/istanbul";
import { loadToneFromFreeRatio } from "@/lib/capacity/loadTone";
import { loadDayUsage, settingsFromRow } from "@/lib/services/capacityService";
import { getCapacitySettings } from "@/lib/db/providerCapacity";
import { listSlots } from "@/lib/db/providers";
import { splitTwoHourWindows, pickupInstantIso } from "@/lib/scheduling/windows";

export type WindowStatus = "ok" | "low" | "full";

export type CalendarWindow = {
  date: string;
  start: string;
  end: string;
  status: WindowStatus;
  selectable: boolean;
};

const TODAY_LEAD_MS = 2 * 3_600_000;
const EXPRESS_TODAY_LEAD_MS = 1 * 3_600_000;

function dayStatus(
  providerId: string,
  date: string,
  settings: ReturnType<typeof settingsFromRow>,
  express: boolean,
) {
  const usage = loadDayUsage(providerId, date, 1, settings)[0];
  if (!usage) return "full" as WindowStatus;
  const quota = settings.expressQuota ?? 0;
  if (express) {
    if (quota <= 0) return "full" as WindowStatus;
    const free = Math.max(0, quota - (usage.usedExpressUnits ?? 0)) / quota;
    return loadToneFromFreeRatio(free);
  }
  const cap = Math.max(0, usage.maxUnits - quota);
  if (cap <= 0) return "full" as WindowStatus;
  const free = Math.max(0, cap - usage.usedUnits) / cap;
  return loadToneFromFreeRatio(free);
}

export function buildProviderCalendar(
  providerId: string,
  now = new Date(),
  express = false,
): CalendarWindow[] {
  const settingsRow = getCapacitySettings(providerId);
  const settings = settingsRow ? settingsFromRow(settingsRow) : null;
  const slots = listSlots(providerId, true);
  const today = isoDateInIstanbul(now);
  const out: CalendarWindow[] = [];
  const leadMs = express ? EXPRESS_TODAY_LEAD_MS : TODAY_LEAD_MS;

  for (let i = 0; i < 7; i++) {
    const date = addCalendarDaysIso(today, i);
    const dow = isoWeekdayFromIsoDate(date);
    const daySlots = slots.filter((s) => s.day_of_week === dow);
    const status = settings ? dayStatus(providerId, date, settings, express) : ("ok" as WindowStatus);

    for (const slot of daySlots) {
      for (const w of splitTwoHourWindows(slot.start_time, slot.end_time)) {
        const startInstant = pickupInstantIso(date, w.start);
        const selectable =
          status !== "full" &&
          (date !== today || startInstant.getTime() >= now.getTime() + leadMs);
        out.push({
          date,
          start: w.start,
          end: w.end,
          status,
          selectable,
        });
      }
    }
  }

  return out.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
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

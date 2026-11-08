import type { AppointmentWindow } from "@/lib/types";
import type { CalendarWindowDto } from "./parseCalendarResponse";

export function isCalendarChipDisabled(w: CalendarWindowDto): boolean {
  return !w.start || !w.selectable || w.status === "full" || w.status === "closed";
}

export function toAppointmentWindow(w: CalendarWindowDto): AppointmentWindow {
  return { date: w.date, windowStart: w.start, windowEnd: w.end };
}

/** API verisi gelince ilk seçilebilir pencere — UI onPick ile aynı şekil. */
export function firstSelectableAppointment(windows: CalendarWindowDto[]): AppointmentWindow | null {
  const hit = windows.find((w) => !isCalendarChipDisabled(w));
  return hit ? toAppointmentWindow(hit) : null;
}

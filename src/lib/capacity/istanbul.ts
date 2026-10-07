export const ISTANBUL_TZ = "Europe/Istanbul";

/** Takvim günü YYYY-MM-DD (İstanbul). */
export function isoDateInIstanbul(instant: Date): string {
  return instant.toLocaleDateString("en-CA", { timeZone: ISTANBUL_TZ });
}

/** ISO hafta günü 1=Pzt … 7=Paz. */
export function isoWeekdayFromIsoDate(iso: string): number {
  const d = dateAtNoonIstanbul(iso);
  const js = d.getUTCDay();
  return js === 0 ? 7 : js;
}

export function dateAtNoonIstanbul(iso: string): Date {
  return new Date(`${iso}T12:00:00+03:00`);
}

export function addCalendarDaysIso(iso: string, days: number): string {
  const d = dateAtNoonIstanbul(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatDeliveryDayTr(iso: string): string {
  const d = dateAtNoonIstanbul(iso);
  return d.toLocaleDateString("tr-TR", {
    timeZone: ISTANBUL_TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

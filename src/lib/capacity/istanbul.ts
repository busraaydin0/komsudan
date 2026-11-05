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

const YEAR_MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function isYearMonth(value: string): boolean {
  return YEAR_MONTH.test(value);
}

/** İstanbul takvim ayı YYYY-MM. */
export function istanbulYearMonth(instant = new Date()): string {
  return isoDateInIstanbul(instant).slice(0, 7);
}

/** Ay [startIso, endIso) UTC; günler YYYY-MM-DD İstanbul. */
export function istanbulMonthRange(yearMonth: string): {
  startIso: string;
  endIso: string;
  startDate: string;
  lastDate: string;
} {
  if (!isYearMonth(yearMonth)) {
    throw new Error("INVALID_MONTH");
  }
  const [yearRaw, monthRaw] = yearMonth.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const next =
    month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;
  const startIso = new Date(`${yearMonth}-01T00:00:00+03:00`).toISOString();
  const endIso = new Date(`${next}-01T00:00:00+03:00`).toISOString();
  return {
    startIso,
    endIso,
    startDate: `${yearMonth}-01`,
    lastDate: isoDateInIstanbul(new Date(Date.parse(endIso) - 1)),
  };
}

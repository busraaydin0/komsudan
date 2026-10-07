import { isoDateInIstanbul, isoWeekdayFromIsoDate } from "@/lib/capacity/istanbul";
import type { SlotRow } from "@/lib/db/providers";
import { hmmToMinutes } from "@/lib/timeWindow";

const RESPOND_MS = 45 * 60 * 1000;

function minutesNowIstanbul(now: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

function activeSlotsForDow(slots: SlotRow[], dow: number) {
  return slots.filter((s) => s.is_active && s.day_of_week === dow);
}

function isOpenAt(now: Date, slots: SlotRow[]) {
  const iso = isoDateInIstanbul(now);
  const dow = isoWeekdayFromIsoDate(iso);
  const mins = minutesNowIstanbul(now);
  return activeSlotsForDow(slots, dow).some((s) => {
    const a = hmmToMinutes(s.start_time);
    const b = hmmToMinutes(s.end_time);
    return a != null && b != null && mins >= a && mins < b;
  });
}

/** İlk çalışma anı: şimdi açıksa şimdi; değilse gelecekteki ilk slot başlangıcı. */
export function firstWorkingInstant(from: Date, slots: SlotRow[]): Date {
  if (!slots.length) return from;
  if (isOpenAt(from, slots)) return from;

  const iso = isoDateInIstanbul(from);
  let day = iso;
  for (let guard = 0; guard < 21; guard++) {
    const dow = isoWeekdayFromIsoDate(day);
    const daySlots = activeSlotsForDow(slots, dow).sort((a, b) =>
      a.start_time.localeCompare(b.start_time),
    );
    for (const s of daySlots) {
      const startMin = hmmToMinutes(s.start_time);
      if (startMin == null) continue;
      const candidate = new Date(`${day}T${s.start_time}:00+03:00`);
      if (candidate.getTime() > from.getTime()) return candidate;
    }
    const [y, mo, d] = day.split("-").map(Number);
    const next = new Date(Date.UTC(y, mo - 1, d + 1, 12, 0, 0));
    day = next.toISOString().slice(0, 10);
  }
  return from;
}

export function computeRespondBy(createdAt: Date, slots: SlotRow[]): string {
  const start = firstWorkingInstant(createdAt, slots);
  return new Date(start.getTime() + RESPOND_MS).toISOString();
}

export function respondReminderAt(createdAt: Date, respondByIso: string): string {
  const created = createdAt.getTime();
  const end = Date.parse(respondByIso);
  const half = created + (end - created) / 2;
  return new Date(half).toISOString();
}

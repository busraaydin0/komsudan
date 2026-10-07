import { hmmToMinutes, minutesToHmm } from "@/lib/timeWindow";

export type TimeWindow = { start: string; end: string };

/** availability_slots satırını 2 saatlik pencerelere böler. */
export function splitTwoHourWindows(startTime: string, endTime: string): TimeWindow[] {
  const start = hmmToMinutes(startTime);
  const end = hmmToMinutes(endTime);
  if (start == null || end == null || end <= start) return [];
  const out: TimeWindow[] = [];
  for (let t = start; t + 120 <= end; t += 120) {
    out.push({ start: minutesToHmm(t), end: minutesToHmm(t + 120) });
  }
  return out;
}

export function windowLabel(date: string, start: string, end: string) {
  return `${date} ${start}–${end}`;
}

export function pickupInstantIso(date: string, windowStart: string): Date {
  return new Date(`${date}T${windowStart}:00+03:00`);
}

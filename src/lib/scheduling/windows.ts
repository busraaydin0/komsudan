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

/** Yan yana 1 saatlik slotları birleştirir, sonra 2 saatlik pencerelere böler. */
export function windowsFromAvailabilitySlots(
  slots: { start_time: string; end_time: string }[],
): TimeWindow[] {
  const ranges: { start: number; end: number }[] = [];
  for (const slot of slots) {
    const start = hmmToMinutes(slot.start_time);
    const end = hmmToMinutes(slot.end_time);
    if (start == null || end == null || end <= start) continue;
    ranges.push({ start, end });
  }
  ranges.sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [];
  for (const r of ranges) {
    const last = merged.at(-1);
    if (last && r.start <= last.end) last.end = Math.max(last.end, r.end);
    else merged.push({ start: r.start, end: r.end });
  }
  const out: TimeWindow[] = [];
  for (const r of merged) {
    const split = splitTwoHourWindows(minutesToHmm(r.start), minutesToHmm(r.end));
    if (split.length > 0) out.push(...split);
    else out.push({ start: minutesToHmm(r.start), end: minutesToHmm(r.end) });
  }
  return out;
}

export function windowLabel(date: string, start: string, end: string) {
  return `${date} ${start}–${end}`;
}

export function pickupInstantIso(date: string, windowStart: string): Date {
  return new Date(`${date}T${windowStart}:00+03:00`);
}

/** Serbest saat: 09:00–19:00, 15 dk adım. Teslim/alım pencereleri (2 saat). */

export const WORK_WINDOW_START_MINUTES = 9 * 60;
export const WORK_WINDOW_END_MINUTES = 19 * 60;
export const TIME_STEP_MINUTES = 15;
export const DEFAULT_DURATION_MINUTES = 60;

export function minutesToHmm(total: number) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function hmmToMinutes(raw: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(raw.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isInteger(h) || !Number.isInteger(min) || h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function lastStartMinutes(duration = DEFAULT_DURATION_MINUTES) {
  return WORK_WINDOW_END_MINUTES - duration;
}

export function listStartMinutes(duration = DEFAULT_DURATION_MINUTES): number[] {
  const last = lastStartMinutes(duration);
  const out: number[] = [];
  for (let t = WORK_WINDOW_START_MINUTES; t <= last; t += TIME_STEP_MINUTES) out.push(t);
  return out;
}

export function isValidWorkStart(startMin: number, duration = DEFAULT_DURATION_MINUTES) {
  if (!Number.isInteger(startMin) || startMin % TIME_STEP_MINUTES !== 0) return false;
  if (startMin < WORK_WINDOW_START_MINUTES) return false;
  if (startMin >= WORK_WINDOW_END_MINUTES) return false;
  if (startMin + duration > WORK_WINDOW_END_MINUTES) return false;
  return duration > 0;
}

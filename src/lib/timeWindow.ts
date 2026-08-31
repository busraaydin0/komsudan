/** Serbest saat: 09:00–19:00, 15 dk adım. Süre kategoriden; client bitiş seçmez. */

export const WORK_WINDOW_START_MINUTES = 9 * 60;
export const WORK_WINDOW_END_MINUTES = 19 * 60;
export const TIME_STEP_MINUTES = 15;
export const APPOINTMENT_BUFFER_MINUTES = 30;
export const DEFAULT_DURATION_MINUTES = 60;

/** Musluk tamiri 60 dk. İleride hourly alt-tipler ayrı sabitlenir. */
export const CATEGORY_DEFAULT_DURATION_MINUTES: Record<string, number> = {
  musluk: 60,
};

export type SlotDay = "bugun" | "yarin";

export function durationMinutesFor(kind?: string | null) {
  if (kind && kind in CATEGORY_DEFAULT_DURATION_MINUTES) {
    return CATEGORY_DEFAULT_DURATION_MINUTES[kind];
  }
  return DEFAULT_DURATION_MINUTES;
}

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

export function formatPilotSlot(day: SlotDay, startMin: number, duration = DEFAULT_DURATION_MINUTES) {
  return `${day === "bugun" ? "Bugün" : "Yarın"} ${minutesToHmm(startMin)}–${minutesToHmm(startMin + duration)}`;
}

export function parsePilotSlot(slot: string): { day: SlotDay; startMin: number; endMin: number } | null {
  const m = /^(Bugün|Yarın)\s+(\d{1,2}:\d{2})[–-](\d{1,2}:\d{2})$/i.exec(slot.trim());
  if (!m) return null;
  const startMin = hmmToMinutes(m[2]);
  const endMin = hmmToMinutes(m[3]);
  if (startMin == null || endMin == null) return null;
  const day: SlotDay = m[1].toLocaleLowerCase("tr-TR") === "yarın" ? "yarin" : "bugun";
  return { day, startMin, endMin };
}

export function isFreeOrderSlot(slot: string, duration = DEFAULT_DURATION_MINUTES) {
  const parsed = parsePilotSlot(slot);
  if (!parsed) return false;
  if (parsed.endMin - parsed.startMin !== duration) return false;
  return isValidWorkStart(parsed.startMin, duration);
}

/** Eski sabit dilim veya yeni serbest saat. */
export function isAllowedOrderSlot(slot: string, legacySlots: readonly string[]) {
  if (legacySlots.includes(slot)) return true;
  return isFreeOrderSlot(slot);
}

export function defaultSlotChoice(
  now = new Date(),
  timeZone = "Europe/Istanbul",
  duration = DEFAULT_DURATION_MINUTES,
): { day: SlotDay; startMin: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  let start = Math.ceil((hour * 60 + minute) / TIME_STEP_MINUTES) * TIME_STEP_MINUTES;
  const last = lastStartMinutes(duration);
  if (start < WORK_WINDOW_START_MINUTES) start = WORK_WINDOW_START_MINUTES;
  if (start > last) return { day: "yarin", startMin: WORK_WINDOW_START_MINUTES };
  return { day: "bugun", startMin: start };
}

export function defaultPilotSlot(now = new Date(), duration = DEFAULT_DURATION_MINUTES) {
  const choice = defaultSlotChoice(now, "Europe/Istanbul", duration);
  return formatPilotSlot(choice.day, choice.startMin, duration);
}

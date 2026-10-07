import type { PackageId } from "@/lib/types";
import {
  addCalendarDaysIso,
  dateAtNoonIstanbul,
  isoDateInIstanbul,
  isoWeekdayFromIsoDate,
  pickupIsoFromSlot,
} from "./istanbul";

export type CapacitySettings = {
  halfUnitsPerDay: number;
  workingDays: number[];
  maxUnitsPerOrder: number;
};

export type DayUsage = {
  date: string;
  maxUnits: number;
  usedUnits: number;
};

export type ScheduleOrderLine = {
  packageId: PackageId;
  machineUnits: number;
  hasHeavyAddon: boolean;
  slot: string;
};

export type ScheduleAllocation = { date: string; units: number };

export type ScheduleResult = {
  pickupDate: string;
  washDates: string[];
  deliveryDate: string;
  allocations: ScheduleAllocation[];
};

const HORIZON_DAYS = 90;

function usageFor(daysUsage: DayUsage[], date: string, settings: CapacitySettings): DayUsage {
  const hit = daysUsage.find((d) => d.date === date);
  if (hit) return hit;
  return { date, maxUnits: settings.halfUnitsPerDay, usedUnits: 0 };
}

function isWorkingDay(iso: string, workingDays: number[]) {
  return workingDays.includes(isoWeekdayFromIsoDate(iso));
}

function nextWorkingOnOrAfter(iso: string, workingDays: number[]): string {
  let cursor = iso;
  for (let i = 0; i < 14; i++) {
    if (isWorkingDay(cursor, workingDays)) return cursor;
    cursor = addCalendarDaysIso(cursor, 1);
  }
  return iso;
}

function processingHours(packageId: PackageId, hasHeavyAddon: boolean) {
  let hours = packageId === "tam" ? 72 : 48;
  if (hasHeavyAddon) hours += 24;
  return hours;
}

function deliveryDateFromLastWash(lastWashIso: string, packageId: PackageId, hasHeavyAddon: boolean) {
  const base = dateAtNoonIstanbul(lastWashIso);
  const ms = base.getTime() + processingHours(packageId, hasHeavyAddon) * 3_600_000;
  return isoDateInIstanbul(new Date(ms));
}

/**
 * Kapasite planı: yıkama birimleri çalışma günlerine yayılır; teslim son yıkama günü + süre.
 */
export function computeSchedule(
  settings: CapacitySettings,
  daysUsage: DayUsage[],
  line: ScheduleOrderLine,
  now: Date,
): ScheduleResult | null {
  if (line.machineUnits < 1) return null;
  if (line.machineUnits > settings.maxUnitsPerOrder) return null;

  let pickupDate = pickupIsoFromSlot(line.slot, now);
  pickupDate = nextWorkingOnOrAfter(pickupDate, settings.workingDays);

  let unitsLeft = line.machineUnits;
  const allocationMap = new Map<string, number>();
  let cursor = pickupDate;

  for (let guard = 0; guard < HORIZON_DAYS && unitsLeft > 0; guard++) {
    if (isWorkingDay(cursor, settings.workingDays)) {
      const day = usageFor(daysUsage, cursor, settings);
      const free = Math.max(0, day.maxUnits - day.usedUnits);
      const take = Math.min(unitsLeft, free, settings.halfUnitsPerDay);
      if (take > 0) {
        allocationMap.set(cursor, (allocationMap.get(cursor) ?? 0) + take);
        unitsLeft -= take;
      }
    }
    cursor = addCalendarDaysIso(cursor, 1);
  }

  if (unitsLeft > 0) return null;

  const allocations = [...allocationMap.entries()].map(([date, units]) => ({ date, units }));
  const washDates = allocations.map((a) => a.date);
  const lastWash = washDates[washDates.length - 1]!;
  const deliveryDate = deliveryDateFromLastWash(lastWash, line.packageId, line.hasHeavyAddon);

  return { pickupDate, washDates, deliveryDate, allocations };
}

/** Keşif kartı: önümüzdeki 7 gün doluluk (used/max). */
export function weekLoadRatios(
  settings: CapacitySettings,
  daysUsage: DayUsage[],
  fromIso: string,
): { date: string; usedRatio: number; freeRatio: number }[] {
  const out: { date: string; usedRatio: number; freeRatio: number }[] = [];
  let cursor = fromIso;
  for (let i = 0; i < 7; i++) {
    const day = usageFor(daysUsage, cursor, settings);
    const max = day.maxUnits || settings.halfUnitsPerDay;
    const usedRatio = max > 0 ? Math.min(1, day.usedUnits / max) : 1;
    out.push({ date: cursor, usedRatio, freeRatio: 1 - usedRatio });
    cursor = addCalendarDaysIso(cursor, 1);
  }
  return out;
}

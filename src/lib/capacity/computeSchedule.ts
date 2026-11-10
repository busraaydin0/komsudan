import type { PackageId } from "@/lib/types";
import {
  addCalendarDaysIso,
  dateAtNoonIstanbul,
  isoDateInIstanbul,
  isoWeekdayFromIsoDate,
} from "./istanbul";

export type CapacitySettings = {
  halfUnitsPerDay: number;
  workingDays: number[];
  maxUnitsPerOrder: number;
  /** Yarım-makine; 0 = acil yok (K-010). */
  expressQuota?: number;
};

export type DayUsage = {
  date: string;
  maxUnits: number;
  usedUnits: number;
  usedExpressUnits?: number;
};

export type ScheduleOrderLine = {
  packageId: PackageId;
  machineUnits: number;
  hasHeavyAddon: boolean;
  pickupDate: string;
  express?: boolean;
  pickupWindowStart?: string;
};

export const EXPRESS_HOURS = 24;

/** Acil teslim günü: alım penceresi başlangıcı + 24 sa (K-008). */
export function expressDeliveryDate(pickupDate: string, windowStart = "12:00"): string {
  const start = new Date(`${pickupDate}T${windowStart}:00+03:00`);
  return isoDateInIstanbul(new Date(start.getTime() + EXPRESS_HOURS * 3_600_000));
}

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
  return { date, maxUnits: settings.halfUnitsPerDay, usedUnits: 0, usedExpressUnits: 0 };
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

/** Müşteri teslim günü: acil alım+24sa, değilse paket süresi. Alım günü asla teslim olmaz. */
export function customerDeliveryMinDate(input: {
  pickupDate: string;
  pickupWindowStart?: string;
  packageId: PackageId;
  hasHeavyAddon: boolean;
  express: boolean;
}): string {
  if (input.express) {
    return expressDeliveryDate(input.pickupDate, input.pickupWindowStart);
  }
  return deliveryDateFromLastWash(input.pickupDate, input.packageId, input.hasHeavyAddon);
}

/**
 * Kapasite planı: yıkama birimleri çalışma günlerine yayılır; teslim son yıkama günü + süre.
 */
export function computeSchedule(
  settings: CapacitySettings,
  daysUsage: DayUsage[],
  line: ScheduleOrderLine,
  _now: Date,
): ScheduleResult | null {
  void _now;
  if (line.machineUnits < 1) return null;
  if (line.machineUnits > settings.maxUnitsPerOrder) return null;

  const quota = settings.expressQuota ?? 0;

  if (line.express) {
    const pickupDate = line.pickupDate;
    const day = usageFor(daysUsage, pickupDate, settings);
    const free = Math.max(0, quota - (day.usedExpressUnits ?? 0));
    if (line.machineUnits > free) return null;
    const deliveryDate = expressDeliveryDate(pickupDate, line.pickupWindowStart);
    return {
      pickupDate,
      washDates: [pickupDate],
      deliveryDate,
      allocations: [{ date: pickupDate, units: line.machineUnits }],
    };
  }

  const pickupDate = nextWorkingOnOrAfter(line.pickupDate, settings.workingDays);

  let unitsLeft = line.machineUnits;
  const allocationMap = new Map<string, number>();
  let cursor = pickupDate;

  for (let guard = 0; guard < HORIZON_DAYS && unitsLeft > 0; guard++) {
    if (isWorkingDay(cursor, settings.workingDays)) {
      const day = usageFor(daysUsage, cursor, settings);
      const normalCap = Math.max(0, day.maxUnits - quota);
      const free = Math.max(0, normalCap - day.usedUnits);
      const take = Math.min(unitsLeft, free, normalCap);
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
    const quota = settings.expressQuota ?? 0;
    const max = Math.max(0, (day.maxUnits || settings.halfUnitsPerDay) - quota);
    const usedRatio = max > 0 ? Math.min(1, day.usedUnits / max) : 1;
    out.push({ date: cursor, usedRatio, freeRatio: 1 - usedRatio });
    cursor = addCalendarDaysIso(cursor, 1);
  }
  return out;
}

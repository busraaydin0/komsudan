import { db } from "./client";
import type { ScheduleAllocation } from "@/lib/capacity/computeSchedule";

export type CapacitySettingsRow = {
  provider_id: string;
  half_units_per_day: number;
  working_days: string;
  max_units_per_order: number;
  express_quota: number;
};

export function parseWorkingDays(raw: string): number[] {
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter((n): n is number => typeof n === "number" && n >= 1 && n <= 7);
  } catch {
    return [];
  }
}

export function getCapacitySettings(providerId: string): CapacitySettingsRow | undefined {
  return db()
    .prepare(`SELECT * FROM provider_capacity_settings WHERE provider_id = ?`)
    .get(providerId) as CapacitySettingsRow | undefined;
}

export function listCapacitySettings(providerIds: string[]): CapacitySettingsRow[] {
  if (providerIds.length === 0) return [];
  const ph = providerIds.map(() => "?").join(",");
  return db()
    .prepare(`SELECT * FROM provider_capacity_settings WHERE provider_id IN (${ph})`)
    .all(...providerIds) as CapacitySettingsRow[];
}

export function listCapacityDaysForProviders(
  providerIds: string[],
  fromDate: string,
  toDate: string,
): {
  providerId: string;
  date: string;
  maxUnits: number;
  usedUnits: number;
  usedExpressUnits: number;
}[] {
  if (providerIds.length === 0) return [];
  const ph = providerIds.map(() => "?").join(",");
  const rows = db()
    .prepare(
      `SELECT provider_id AS providerId, date, max_units AS maxUnits, used_units AS usedUnits,
              used_express_units AS usedExpressUnits
       FROM provider_capacity_days
       WHERE provider_id IN (${ph}) AND date >= ? AND date <= ?
       ORDER BY provider_id, date`,
    )
    .all(...providerIds, fromDate, toDate) as {
    providerId: string;
    date: string;
    maxUnits: number;
    usedUnits: number;
    usedExpressUnits: number;
  }[];
  return rows;
}

export function upsertCapacitySettings(input: {
  providerId: string;
  halfUnitsPerDay: number;
  workingDays: number[];
  maxUnitsPerOrder: number;
  expressQuota?: number;
}) {
  if (input.workingDays.length < 1) throw new Error("WORKING_DAYS");
  db()
    .prepare(
      `INSERT INTO provider_capacity_settings (
         provider_id, half_units_per_day, working_days, max_units_per_order, express_quota
       ) VALUES (
         @provider_id, @half_units_per_day, @working_days, @max_units_per_order, COALESCE(@express_quota, 0)
       )
       ON CONFLICT(provider_id) DO UPDATE SET
         half_units_per_day = excluded.half_units_per_day,
         working_days = excluded.working_days,
         max_units_per_order = excluded.max_units_per_order,
         express_quota = COALESCE(excluded.express_quota, provider_capacity_settings.express_quota)`,
    )
    .run({
      provider_id: input.providerId,
      half_units_per_day: input.halfUnitsPerDay,
      working_days: JSON.stringify(input.workingDays),
      max_units_per_order: input.maxUnitsPerOrder,
      express_quota: input.expressQuota ?? null,
    });
}

export function ensureCapacityDay(providerId: string, date: string, maxUnits: number) {
  db()
    .prepare(
      `INSERT INTO provider_capacity_days (provider_id, date, max_units, used_units, used_express_units)
       VALUES (?, ?, ?, 0, 0)
       ON CONFLICT(provider_id, date) DO UPDATE SET max_units = excluded.max_units
       WHERE provider_capacity_days.used_units <= excluded.max_units`,
    )
    .run(providerId, date, maxUnits);
}

export function listCapacityDays(providerId: string, fromDate: string, toDate: string) {
  return db()
    .prepare(
      `SELECT date, max_units AS maxUnits, used_units AS usedUnits,
              used_express_units AS usedExpressUnits
       FROM provider_capacity_days
       WHERE provider_id = ? AND date >= ? AND date <= ?
       ORDER BY date`,
    )
    .all(providerId, fromDate, toDate) as {
    date: string;
    maxUnits: number;
    usedUnits: number;
    usedExpressUnits: number;
  }[];
}

export function tryReserveUnits(
  providerId: string,
  date: string,
  units: number,
  maxUnits: number,
  expressQuota = 0,
): boolean {
  ensureCapacityDay(providerId, date, maxUnits);
  const normalCap = Math.max(0, maxUnits - expressQuota);
  const res = db()
    .prepare(
      `UPDATE provider_capacity_days
       SET used_units = used_units + ?
       WHERE provider_id = ? AND date = ? AND used_units + ? <= ?`,
    )
    .run(units, providerId, date, units, normalCap);
  return res.changes === 1;
}

export function tryReserveExpressUnits(
  providerId: string,
  date: string,
  units: number,
  maxUnits: number,
  expressQuota: number,
): boolean {
  ensureCapacityDay(providerId, date, maxUnits);
  const res = db()
    .prepare(
      `UPDATE provider_capacity_days
       SET used_express_units = used_express_units + ?
       WHERE provider_id = ? AND date = ? AND used_express_units + ? <= ?`,
    )
    .run(units, providerId, date, units, expressQuota);
  return res.changes === 1;
}

export function releaseUnits(providerId: string, date: string, units: number) {
  db()
    .prepare(
      `UPDATE provider_capacity_days
       SET used_units = CASE WHEN used_units > ? THEN used_units - ? ELSE 0 END
       WHERE provider_id = ? AND date = ?`,
    )
    .run(units, units, providerId, date);
}

export function releaseExpressUnits(providerId: string, date: string, units: number) {
  db()
    .prepare(
      `UPDATE provider_capacity_days
       SET used_express_units = CASE WHEN used_express_units > ? THEN used_express_units - ? ELSE 0 END
       WHERE provider_id = ? AND date = ?`,
    )
    .run(units, units, providerId, date);
}

export function reserveAllocations(
  providerId: string,
  allocations: ScheduleAllocation[],
  halfUnitsPerDay: number,
  expressQuota = 0,
): boolean {
  const applied: ScheduleAllocation[] = [];
  for (const a of allocations) {
    if (!tryReserveUnits(providerId, a.date, a.units, halfUnitsPerDay, expressQuota)) {
      releaseAllocations(providerId, applied);
      return false;
    }
    applied.push(a);
  }
  return true;
}

export function reserveExpressAllocations(
  providerId: string,
  allocations: ScheduleAllocation[],
  halfUnitsPerDay: number,
  expressQuota: number,
): boolean {
  const applied: ScheduleAllocation[] = [];
  for (const a of allocations) {
    if (!tryReserveExpressUnits(providerId, a.date, a.units, halfUnitsPerDay, expressQuota)) {
      releaseExpressAllocations(providerId, applied);
      return false;
    }
    applied.push(a);
  }
  return true;
}

export function releaseAllocations(providerId: string, allocations: ScheduleAllocation[]) {
  for (const a of allocations) {
    releaseUnits(providerId, a.date, a.units);
  }
}

export function releaseExpressAllocations(providerId: string, allocations: ScheduleAllocation[]) {
  for (const a of allocations) {
    releaseExpressUnits(providerId, a.date, a.units);
  }
}

export function parseAllocations(raw: string | null): ScheduleAllocation[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as ScheduleAllocation[];
    return Array.isArray(arr) ? arr.filter((x) => x.date && x.units > 0) : [];
  } catch {
    return [];
  }
}

import {
  computeSchedule,
  weekLoadRatios,
  type CapacitySettings,
  type DayUsage,
  type ScheduleAllocation,
  type ScheduleOrderLine,
  type ScheduleResult,
} from "@/lib/capacity/computeSchedule";
import { formatDeliveryDayTr, isoDateInIstanbul, addCalendarDaysIso } from "@/lib/capacity/istanbul";
import { weekTone } from "@/lib/capacity/loadTone";
import type { OrderAddonLine } from "@/lib/laundryModel";
import {
  getCapacitySettings,
  listCapacityDays,
  listCapacityDaysForProviders,
  listCapacitySettings,
  parseWorkingDays,
  releaseAllocations,
  reserveAllocations,
} from "@/lib/db/providerCapacity";
import type { PackageId, ProviderCapacitySummary } from "@/lib/types";
import { ApiError } from "@/lib/errors";

export function settingsFromRow(row: NonNullable<ReturnType<typeof getCapacitySettings>>): CapacitySettings {
  return {
    halfUnitsPerDay: row.half_units_per_day,
    workingDays: parseWorkingDays(row.working_days),
    maxUnitsPerOrder: row.max_units_per_order,
  };
}

export function loadDayUsage(providerId: string, fromIso: string, days: number, settings: CapacitySettings): DayUsage[] {
  const toIso = addCalendarDaysIso(fromIso, days - 1);
  const rows = listCapacityDays(providerId, fromIso, toIso);
  const map = new Map(rows.map((r) => [r.date, r]));
  const out: DayUsage[] = [];
  let cursor = fromIso;
  for (let i = 0; i < days; i++) {
    const hit = map.get(cursor);
    out.push({
      date: cursor,
      maxUnits: hit?.maxUnits ?? settings.halfUnitsPerDay,
      usedUnits: hit?.usedUnits ?? 0,
    });
    cursor = addCalendarDaysIso(cursor, 1);
  }
  return out;
}

export function scheduleLine(input: {
  packageId: PackageId;
  machineUnits: number;
  addons: OrderAddonLine[];
  pickupDate: string;
}): ScheduleOrderLine {
  const hasHeavyAddon = input.addons.some((a) => a.qty > 0);
  return {
    packageId: input.packageId,
    machineUnits: input.machineUnits,
    hasHeavyAddon,
    pickupDate: input.pickupDate,
  };
}

export function planOrder(
  providerId: string,
  line: ScheduleOrderLine,
  now = new Date(),
): ScheduleResult | null {
  const row = getCapacitySettings(providerId);
  if (!row) return null;
  const settings = settingsFromRow(row);
  const today = isoDateInIstanbul(now);
  const usage = loadDayUsage(providerId, today, 90, settings);
  return computeSchedule(settings, usage, line, now);
}

export function assertCanServeOrder(providerId: string, machineUnits: number) {
  const row = getCapacitySettings(providerId);
  if (!row) {
    throw new ApiError(409, "Hizmet veren kapasite ayarı yapmamış.", "CAPACITY_NOT_CONFIGURED");
  }
  if (machineUnits > row.max_units_per_order) {
    throw new ApiError(409, "Bu boy ve ekler tek sipariş limitini aşıyor.", "CAPACITY");
  }
}

export function reserveOrderCapacity(
  providerId: string,
  line: ScheduleOrderLine,
  now = new Date(),
): { schedule: ScheduleResult; allocations: ScheduleAllocation[] } {
  const row = getCapacitySettings(providerId);
  if (!row) throw new ApiError(409, "Kapasite kurulumu gerekli.", "CAPACITY_NOT_CONFIGURED");
  const settings = settingsFromRow(row);
  const schedule = planOrder(providerId, line, now);
  if (!schedule) {
    throw new ApiError(409, "Seçilen tarihte kapasite yeterli değil.", "CAPACITY");
  }
  const ok = reserveAllocations(providerId, schedule.allocations, settings.halfUnitsPerDay);
  if (!ok) {
    throw new ApiError(409, "Kapasite başka siparişle doldu; tekrar deneyin.", "CAPACITY_CONFLICT");
  }
  return { schedule, allocations: schedule.allocations };
}

export function releaseOrderCapacity(providerId: string, allocations: ScheduleAllocation[]) {
  if (!allocations.length) return;
  releaseAllocations(providerId, allocations);
}

function loadDayUsageFromRows(
  providerId: string,
  fromIso: string,
  days: number,
  settings: CapacitySettings,
  rows: { providerId: string; date: string; maxUnits: number; usedUnits: number }[],
): DayUsage[] {
  const map = new Map(rows.filter((r) => r.providerId === providerId).map((r) => [r.date, r]));
  const out: DayUsage[] = [];
  let cursor = fromIso;
  for (let i = 0; i < days; i++) {
    const hit = map.get(cursor);
    out.push({
      date: cursor,
      maxUnits: hit?.maxUnits ?? settings.halfUnitsPerDay,
      usedUnits: hit?.usedUnits ?? 0,
    });
    cursor = addCalendarDaysIso(cursor, 1);
  }
  return out;
}

function capacitySummaryFromSettings(
  providerId: string,
  row: NonNullable<ReturnType<typeof getCapacitySettings>>,
  dayRows: { providerId: string; date: string; maxUnits: number; usedUnits: number }[],
  now: Date,
): ProviderCapacitySummary {
  const settings = settingsFromRow(row);
  const today = isoDateInIstanbul(now);
  const usage7 = loadDayUsageFromRows(providerId, today, 7, settings, dayRows);
  const week = weekLoadRatios(settings, usage7, today);
  const usage90 = loadDayUsageFromRows(providerId, today, 90, settings, dayRows);
  const probe = computeSchedule(
    settings,
    usage90,
    {
      packageId: "katlama",
      machineUnits: 2,
      hasHeavyAddon: false,
      pickupDate: today,
    },
    now,
  );
  const freeRatios = week.map((w) => w.freeRatio);
  return {
    configured: true,
    maxUnitsPerOrder: settings.maxUnitsPerOrder,
    earliestDelivery: probe?.deliveryDate ?? null,
    earliestDeliveryLabel: probe ? formatDeliveryDayTr(probe.deliveryDate) : null,
    weekLoad: week.map((w) => ({ date: w.date, freeRatio: w.freeRatio, usedRatio: w.usedRatio })),
    weekTone: weekTone(freeRatios),
  };
}

export function capacitySummariesForProviders(
  providerIds: string[],
  now = new Date(),
): Map<string, ProviderCapacitySummary> {
  const out = new Map<string, ProviderCapacitySummary>();
  if (providerIds.length === 0) return out;
  const settingsRows = listCapacitySettings(providerIds);
  const settingsById = new Map(settingsRows.map((r) => [r.provider_id, r]));
  const today = isoDateInIstanbul(now);
  const to90 = addCalendarDaysIso(today, 89);
  const dayRows = listCapacityDaysForProviders(providerIds, today, to90);
  const empty: ProviderCapacitySummary = {
    configured: false,
    maxUnitsPerOrder: 0,
    earliestDelivery: null,
    earliestDeliveryLabel: null,
    weekLoad: [],
    weekTone: "full",
  };
  for (const id of providerIds) {
    const row = settingsById.get(id);
    out.set(id, row ? capacitySummaryFromSettings(id, row, dayRows, now) : empty);
  }
  return out;
}

export function capacitySummaryForProvider(providerId: string, now = new Date()): ProviderCapacitySummary {
  return capacitySummariesForProviders([providerId], now).get(providerId)!;
}

export function providerMatchesOrderSize(summary: ProviderCapacitySummary, machineUnits: number) {
  if (!summary.configured) return false;
  return machineUnits <= summary.maxUnitsPerOrder;
}

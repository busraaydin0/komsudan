import { unwrapEnvelope } from "@/lib/http/client";

export type CalendarWindowDto = {
  date: string;
  start: string;
  end: string;
  status: "ok" | "low" | "full";
  selectable: boolean;
};

/** GET /api/providers/:id/calendar `{ data: { windows } }` zarfını açar. */
export function parseCalendarWindows(payload: unknown): CalendarWindowDto[] {
  if (!payload || typeof payload !== "object") return [];
  const data = unwrapEnvelope(
    payload as { data?: { windows?: CalendarWindowDto[] }; windows?: CalendarWindowDto[] },
  );
  return Array.isArray(data.windows) ? data.windows : [];
}

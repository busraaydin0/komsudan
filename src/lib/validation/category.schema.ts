import { z } from "zod";

export const categoryIdParam = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .optional();

export function parseCategoryIds(raw: string | null | undefined): string[] | undefined {
  if (raw == null || raw.trim() === "") return undefined;
  const ids = [
    ...new Set(
      raw
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ];
  return ids.length ? ids : undefined;
}

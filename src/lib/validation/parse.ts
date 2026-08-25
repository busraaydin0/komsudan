import { ApiError } from "@/server/rules";
import type { z } from "zod";

export async function parseBody<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  let raw: unknown = {};
  try {
    const text = await req.text();
    if (text.trim()) raw = JSON.parse(text) as unknown;
  } catch {
    throw new ApiError(400, "JSON bekleniyor.", "VALIDATION_ERROR");
  }
  return parseValue(raw, schema);
}

export function parseValue<T>(raw: unknown, schema: z.ZodType<T>): T {
  const result = schema.safeParse(raw);
  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "Geçersiz istek.";
    throw new ApiError(400, message, "VALIDATION_ERROR");
  }
  return result.data;
}

import { z } from "zod";
import { ApiError } from "@/server/rules";

export const phoneSchema = z.object({
  phone: z.string().min(1, "Cep telefonu gerekli."),
});

export const otpVerifySchema = z.object({
  phone: z.string().min(1, "Cep telefonu gerekli."),
  code: z.string().min(4, "SMS kodu gerekli."),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(16).optional(),
});

export const mePatchSchema = z.object({
  fullName: z.string().min(2).max(80).optional(),
  name: z.string().min(2).max(80).optional(),
});

export async function parseBody<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  let raw: unknown = {};
  try {
    const text = await req.text();
    if (text.trim()) raw = JSON.parse(text) as unknown;
  } catch {
    throw new ApiError(400, "JSON bekleniyor.", "VALIDATION_ERROR");
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "Geçersiz istek.";
    throw new ApiError(400, message, "VALIDATION_ERROR");
  }
  return result.data;
}

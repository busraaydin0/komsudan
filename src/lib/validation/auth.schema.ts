import { z } from "zod";

export { parseBody } from "./parse";

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

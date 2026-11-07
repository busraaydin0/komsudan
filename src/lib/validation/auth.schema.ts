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

/** Hesap/kimlik: rol kabul edilmez, strip. */
export const accountPatchSchema = z.object({
  name: z.string().max(80).optional(),
  identity: z.boolean().optional(),
});

export const passkeyBodySchema = z.object({
  credentialId: z.string().min(1).max(512).optional(),
  assert: z.boolean().optional(),
});

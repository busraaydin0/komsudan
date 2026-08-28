import { z } from "zod";
import { GUESTS_MAX, GUESTS_MIN, PIECES_MAX, PIECES_MIN } from "@/lib/pricing";

export const createOrderSchema = z.object({
  providerId: z.string().min(1, "Hizmet veren gerekli."),
  packageId: z.enum(["yikama", "katlama", "tam"]).optional(),
  productId: z.string().min(1).optional(),
  pieces: z
    .number({ error: "Parça sayısı gerekli." })
    .int()
    .min(PIECES_MIN, `Parça sayısı ${PIECES_MIN}–${PIECES_MAX} olmalı.`)
    .max(PIECES_MAX, `Parça sayısı ${PIECES_MIN}–${PIECES_MAX} olmalı.`)
    .optional(),
  guestCount: z
    .number({ error: "Kişi sayısı gerekli." })
    .int()
    .min(GUESTS_MIN, `Kişi sayısı ${GUESTS_MIN}–${GUESTS_MAX} olmalı.`)
    .max(GUESTS_MAX, `Kişi sayısı ${GUESTS_MIN}–${GUESTS_MAX} olmalı.`)
    .optional(),
  allergyNote: z.string().max(300).optional(),
  express: z.boolean().optional().default(false),
  drop: z.enum(["kapi", "nokta"]),
  dropPointId: z.string().min(1).nullable().optional(),
  slot: z.string().min(1, "Saat dilimi gerekli."),
  note: z.string().max(500).optional().default(""),
});

export const patchOrderSchema = z.object({
  action: z.enum(["accept", "reject", "advance", "deliver"]),
  code: z.string().optional(),
});

export const patchStatusSchema = z.object({
  status: z.enum([
    "pending",
    "accepted",
    "dropped_off",
    "washing",
    "ironing",
    "ready",
    "completed",
    "rejected",
    "cancelled",
    "disputed",
  ]),
  code: z.string().optional(),
  note: z.string().max(200).optional(),
});

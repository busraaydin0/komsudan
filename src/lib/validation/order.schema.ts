import { z } from "zod";
import { PIECES_MAX, PIECES_MIN } from "@/lib/pricing";

export const createOrderSchema = z.object({
  providerId: z.string().min(1, "Hizmet veren gerekli."),
  packageId: z.enum(["yikama", "katlama", "tam"]),
  pieces: z
    .number({ error: "Parça sayısı gerekli." })
    .int()
    .min(PIECES_MIN, `Parça sayısı ${PIECES_MIN}–${PIECES_MAX} olmalı.`)
    .max(PIECES_MAX, `Parça sayısı ${PIECES_MIN}–${PIECES_MAX} olmalı.`),
  express: z.boolean(),
  drop: z.enum(["kapi", "nokta"]),
  dropPointId: z.string().min(1).nullable().optional(),
  slot: z.string().min(1, "Saat dilimi gerekli."),
  note: z.string().max(500).optional().default(""),
});

export const patchOrderSchema = z.object({
  action: z.enum(["accept", "reject", "advance", "deliver"]),
  code: z.string().optional(),
});

import { normalizeForMatch } from "./normalize";

const ROOTS = [
  "amk",
  "aminakoyim",
  "aminakoy",
  "sikerim",
  "siktir",
  "orospu",
  "orospucocugu",
  "yarrak",
  "amcik",
  "gerizekali",
];

const MATCH = ROOTS.map((w) => normalizeForMatch(w)).filter((w) => w.length >= 4);

export function hasProfanity(body: string): boolean {
  const n = normalizeForMatch(body);
  if (!n) return false;
  return MATCH.some((w) => n.includes(w));
}

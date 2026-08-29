import { normalizeForMatch } from "./normalize";

const HINTS = [
  "whatsapp",
  "whatspp",
  "watsap",
  "wpden",
  "telegram",
  "instagram",
  "insta",
  "wame",
  "ibanatayim",
  "ibanimi",
];

const MATCH = HINTS.map((h) => normalizeForMatch(h)).filter((h) => h.length >= 4);

export function isOffPlatform(body: string): boolean {
  const n = normalizeForMatch(body);
  if (MATCH.some((h) => n.includes(h))) return true;
  return /whats\s*app|wp['’]?\s*den|iban\s*at/i.test(body);
}

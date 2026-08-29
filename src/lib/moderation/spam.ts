import { normalizeForMatch } from "./normalize";

export function looksLikeSpam(body: string): boolean {
  const trimmed = body.trim();
  if (trimmed.length === 0) return false;
  const compact = normalizeForMatch(trimmed);
  if (compact.length >= 8 && /^(.)\1+$/.test(compact)) return true;
  const words = trimmed.split(/\s+/);
  if (words.length >= 8 && new Set(words.map((w) => w.toLocaleLowerCase("tr-TR"))).size === 1) {
    return true;
  }
  return false;
}

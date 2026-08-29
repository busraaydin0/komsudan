const FOLD: Record<string, string> = {
  ı: "i",
  i: "i",
  ğ: "g",
  ü: "u",
  ş: "s",
  ö: "o",
  ç: "c",
  â: "a",
  î: "i",
  û: "u",
};

const LEET: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  $: "s",
};

/** Eşleştirme için: TR katlama, leet, ayırıcı atma, tekrar harf sıkıştırma. */
export function normalizeForMatch(raw: string): string {
  const lower = raw.toLocaleLowerCase("tr-TR");
  let out = "";
  let prev = "";
  for (const ch of lower) {
    const folded = FOLD[ch] ?? ch;
    const mapped = LEET[folded] ?? folded;
    if (/[.\s_\-*'"`]/.test(mapped)) continue;
    if (mapped === prev) continue;
    out += mapped;
    prev = mapped;
  }
  return out;
}

export function collapseSpaces(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

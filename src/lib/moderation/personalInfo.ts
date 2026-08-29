/** Cep / e-posta / IBAN. "3 adet" ve "14:00" gibi normal sayılar geçsin. */

const EMAIL = /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i;
const IBAN = /\bTR\s?\d{2}(?:\s?\d{4}){5}\s?\d{2}\b/i;
const MOBILE =
  /(?:\+90|00\s*90|0)\s*5\d{2}(?:[\s./-]?\d){7}|(?<!\d)5\d{2}(?:[\s./-]\d{3}[\s./-]\d{2}[\s./-]\d{2})(?!\d)|(?<!\d)5\d{9}(?!\d)/;

export function hasPersonalInfo(body: string): boolean {
  if (EMAIL.test(body) || IBAN.test(body)) return true;
  return MOBILE.test(body);
}

import { randomInt } from "node:crypto";

/** Karışabilen O/0/I/1/L vb. yok. */
const PUBLIC_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const DIGIT_ALPHABET = "23456789";

export function generatePublicCode(): string {
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += PUBLIC_ALPHABET[randomInt(0, PUBLIC_ALPHABET.length)]!;
  }
  return `KL-${suffix}`;
}

export function generateHandoffPin(): string {
  let out = "";
  for (let i = 0; i < 4; i++) {
    out += DIGIT_ALPHABET[randomInt(0, DIGIT_ALPHABET.length)]!;
  }
  return out;
}

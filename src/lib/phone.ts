export function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, "").slice(-10);
  if (d.length !== 10) return phone;
  return `0${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}`;
}

export function normalizePhone(raw: string) {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("90") && d.length === 12) d = d.slice(2);
  if (d.startsWith("0") && d.length === 11) d = d.slice(1);
  if (d.length !== 10 || !d.startsWith("5")) {
    throw new Error("Cep telefonu 5XX XXX XX XX olmalı.");
  }
  return d;
}

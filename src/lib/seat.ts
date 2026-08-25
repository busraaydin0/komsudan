export type SeatTone = "ok" | "low" | "full";

export function seatTone(remaining: number, capacity: number): SeatTone {
  if (remaining <= 0) return "full";
  if (capacity > 0 && remaining / capacity <= 0.33) return "low";
  if (remaining <= 8) return "low";
  return "ok";
}

export function seatLabel(tone: SeatTone) {
  if (tone === "full") return "Dolu";
  if (tone === "low") return "Az yer";
  return null;
}

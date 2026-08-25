export type LoyaltyTier = "komsu" | "guvenilir" | "sadik";

export type Loyalty = {
  tier: LoyaltyTier;
  label: string;
  rate: number;
  delivered: number;
  nextAt: number | null;
  nextLabel: string | null;
  stamps: number;
  stampGoal: number;
  perk: string;
};

const TIERS: { id: LoyaltyTier; min: number; rate: number; label: string; perk: string }[] = [
  { id: "komsu", min: 0, rate: 0, label: "Komşu", perk: "İlk teslimlerde standart fiyat." },
  { id: "guvenilir", min: 3, rate: 0.05, label: "Güvenilir", perk: "%5 sadakat indirimi." },
  { id: "sadik", min: 8, rate: 0.1, label: "Sadık", perk: "%10 indirim · aynı gün öncelikli." },
];

export const STAMP_GOAL = 10;

export function loyaltyFromDelivered(delivered: number): Loyalty {
  const n = Math.max(0, delivered);
  let current = TIERS[0];
  for (const t of TIERS) {
    if (n >= t.min) current = t;
  }
  const next = TIERS.find((t) => t.min > current.min) ?? null;
  return {
    tier: current.id,
    label: current.label,
    rate: current.rate,
    delivered: n,
    nextAt: next ? next.min : null,
    nextLabel: next?.label ?? null,
    stamps: n % STAMP_GOAL,
    stampGoal: STAMP_GOAL,
    perk: current.perk,
  };
}

export function loyaltyRate(delivered: number) {
  return loyaltyFromDelivered(delivered).rate;
}

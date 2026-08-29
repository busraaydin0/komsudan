/** Sıralama / trust girdisi. Kartta gösterilen ham AVG değildir. */
export function bayesianRating(avg: number, n: number, k = 5, prior = 4): number {
  if (n <= 0) return prior;
  return (n / (n + k)) * avg + (k / (n + k)) * prior;
}

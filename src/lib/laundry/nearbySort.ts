import { sortKeyFreeSpace } from "@/lib/capacity/display";
import { listPrice } from "@/lib/laundry/customerUi";
import { bayesianRating } from "@/lib/rating";
import type { Provider } from "@/lib/types";

export type NearbySort = "near" | "far" | "priceHigh" | "priceLow" | "rating" | "reviews" | "space";

export const NEARBY_SORTS: { id: NearbySort; label: string }[] = [
  { id: "near", label: "Yakından uzağa" },
  { id: "far", label: "Uzaktan yakına" },
  { id: "priceHigh", label: "Fiyat çoktan aza" },
  { id: "priceLow", label: "Fiyat azdan çoğa" },
  { id: "rating", label: "En çok puanlanan" },
  { id: "reviews", label: "En çok yorum" },
  { id: "space", label: "Bugün yer var" },
];

export function sortNearby(rows: { p: Provider; km: number }[], sort: NearbySort) {
  const copy = [...rows];
  copy.sort((a, b) => {
    if (sort === "far") return b.km - a.km || b.p.rating - a.p.rating;
    if (sort === "priceHigh" || sort === "priceLow") {
      const pa = listPrice(a.p);
      const pb = listPrice(b.p);
      if (pa == null && pb == null) return a.km - b.km;
      if (pa == null) return 1;
      if (pb == null) return -1;
      const dir = sort === "priceHigh" ? -1 : 1;
      return (pa - pb) * dir || a.km - b.km;
    }
    if (sort === "rating") {
      return (
        bayesianRating(b.p.rating, b.p.reviews) - bayesianRating(a.p.rating, a.p.reviews) ||
        b.p.reviews - a.p.reviews ||
        a.km - b.km
      );
    }
    if (sort === "reviews") return b.p.reviews - a.p.reviews || b.p.rating - a.p.rating || a.km - b.km;
    if (sort === "space") return sortKeyFreeSpace(b.p) - sortKeyFreeSpace(a.p) || a.km - b.km;
    return a.km - b.km || b.p.rating - a.p.rating;
  });
  return copy;
}

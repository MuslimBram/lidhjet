export type SortKey =
  | "recent"
  | "rating"
  | "comments"
  | "sales"
  | "price_asc"
  | "price_desc";

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "recent", label: "Më të rejat" },
  { key: "rating", label: "Vlerësimi më i lartë" },
  { key: "comments", label: "Më të komentuarat" },
  { key: "sales", label: "Më të shiturat" },
  { key: "price_asc", label: "Çmimi: i ulët → i lartë" },
  { key: "price_desc", label: "Çmimi: i lartë → i ulët" },
];

export interface SortablePost {
  createdAtMs: number;
  rating: number;
  ratingCount: number;
  sales: number;
  price: number;
  comments: unknown[];
}

/** Bayesian-weighted rating so 1 vlerësim 5★ nuk kalon 40 vlerësime 4.8★. */
export function weightedRating(rating: number, ratingCount: number, prior = 4): number {
  const m = 5; // pesha e priorit
  return (ratingCount * rating + m * prior) / (ratingCount + m);
}

export function sortPosts<T extends SortablePost>(posts: T[], key: SortKey): T[] {
  const out = [...posts];
  switch (key) {
    case "rating":
      out.sort(
        (a, b) =>
          weightedRating(b.rating, b.ratingCount) - weightedRating(a.rating, a.ratingCount) ||
          b.createdAtMs - a.createdAtMs,
      );
      break;
    case "comments":
      out.sort((a, b) => b.comments.length - a.comments.length || b.createdAtMs - a.createdAtMs);
      break;
    case "sales":
      out.sort((a, b) => b.sales - a.sales || b.createdAtMs - a.createdAtMs);
      break;
    case "price_asc":
      out.sort((a, b) => a.price - b.price || b.createdAtMs - a.createdAtMs);
      break;
    case "price_desc":
      out.sort((a, b) => b.price - a.price || b.createdAtMs - a.createdAtMs);
      break;
    default:
      out.sort((a, b) => b.createdAtMs - a.createdAtMs);
  }
  return out;
}

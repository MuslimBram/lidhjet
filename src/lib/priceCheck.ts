// Mock "AI" price-band check per category. In production this uses Gemini
// with median of recent approved posts. Client-side heuristic for now.

export type Category = "pune" | "sherbim" | "tregti" | "tjeter";

const BANDS: Record<Category, { min: number; max: number }> = {
  pune: { min: 200, max: 200_000 },
  sherbim: { min: 300, max: 300_000 },
  tregti: { min: 100, max: 2_000_000 },
  tjeter: { min: 0, max: 5_000_000 },
};

export function checkPrice(
  price: number,
  category: Category,
): { ok: boolean; reason?: string } {
  if (!Number.isFinite(price) || price <= 0) {
    return { ok: false, reason: "Çmimi duhet të jetë një numër pozitiv." };
  }
  const b = BANDS[category];
  if (price < b.min) {
    return {
      ok: false,
      reason: `Çmimi (${price} L) është nën normat për këtë kategori (min ~${b.min} L). Rregulloni ose jepni justifikim.`,
    };
  }
  if (price > b.max) {
    return {
      ok: false,
      reason: `Çmimi (${price} L) është mbi normat për këtë kategori (max ~${b.max} L). Rregulloni ose jepni justifikim.`,
    };
  }
  return { ok: true };
}

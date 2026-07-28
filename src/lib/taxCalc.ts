export const TAX_BRACKETS: { min: number; max: number; fee: number }[] = [
  { min: 0, max: 499, fee: 0 },
  { min: 500, max: 950, fee: 50 },
  { min: 951, max: 4950, fee: 100 },
  { min: 4951, max: 9950, fee: 200 },
  { min: 9951, max: 49950, fee: 500 },
  { min: 49951, max: 99950, fee: 1000 },
  { min: 99951, max: 499950, fee: 2000 },
  { min: 499951, max: 999950, fee: 5000 },
  { min: 999951, max: Infinity, fee: 10000 },
];

export function calcServiceTax(price: number): number {
  if (!Number.isFinite(price) || price <= 0) return 0;
  const b = TAX_BRACKETS.find((x) => price >= x.min && price <= x.max);
  return b?.fee ?? 0;
}

export function formatLek(v: number): string {
  return `${v.toLocaleString("sq-AL")} L`;
}

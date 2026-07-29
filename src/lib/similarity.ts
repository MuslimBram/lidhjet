// Token-based Jaccard similarity for detecting duplicate posts by the same
// author (e.g. reposting "Opel Kadett me qira 40$/dita" repeatedly).

const STOP = new Set([
  "dhe", "me", "ne", "në", "e", "të", "te", "i", "a", "për", "per",
  "nga", "ose", "që", "qe", "si", "kjo", "kete", "këtë", "por",
  "the", "and", "or", "for", "to", "of", "in", "on", "at", "a", "an",
]);

export function tokenize(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9ëç\s]/gi, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOP.has(t));
  return new Set(tokens);
}

export function jaccard(a: string, b: string): number {
  const A = tokenize(a);
  const B = tokenize(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

export const DUPLICATE_THRESHOLD = 0.55;

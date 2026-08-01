// Kategorizim automatik i postimit (klient). Kur Cloud + AI Gateway aktivizohen,
// këtë rezultat e konfirmon Gemini; deri atëherë punon si klasifikues me fjalë-kyçe
// dhe peshë, mbi tekstin real të postimit.

export type Category = "pune" | "sherbim" | "tregti" | "tjeter";

const KEYWORDS: Record<Exclude<Category, "tjeter">, { re: RegExp; w: number }[]> = {
  pune: [
    { re: /\bk[ëe]rkoj pun[ëe]\b/i, w: 4 },
    { re: /\b(punonj[ëe]s|vend(e)? vakant|rekrutim|staf|kamarier|sanitare|shofer)\b/i, w: 3 },
    { re: /\b(cv|curriculum|eksperienc[ëe]|part[- ]?time|full[- ]?time|orar)\b/i, w: 2 },
    { re: /\b(rrog[ëa]|pag[ëa]|paga mujore)\b/i, w: 2 },
  ],
  sherbim: [
    { re: /\b(elektricist|hidraulik|bojaxhi|murator|riparim|mirë?mbajtje|instalim|montim)\b/i, w: 4 },
    { re: /\b(pastrim|transport|zhvendosje|përkthim|perkthim|kontabilitet|avokat|mësim|mesim|kurs)\b/i, w: 3 },
    { re: /\b(ofroj|shërbim|sherbim|me or[ëe]|profesionist|licencuar)\b/i, w: 2 },
    { re: /\b(me qira|qira)\b/i, w: 2 },
  ],
  tregti: [
    { re: /\b(shes|shitje|blej|ofert[ëe] produkti|stok|shumic[ëe]|pakic[ëe])\b/i, w: 4 },
    { re: /\b(makin[ëa]|celular|laptop|mobilje|vaj|ullij|olive|fara|mall|artikull|pako)\b/i, w: 2 },
    { re: /\b(i ri|e re|i pa?p[ëe]rdorur|garanci|fatur[ëe])\b/i, w: 1 },
  ],
};

export interface CategorySuggestion {
  category: Category;
  score: number;
  matched: string[];
}

export function suggestCategory(text: string): CategorySuggestion {
  const t = text.trim();
  if (t.length < 8) return { category: "tjeter", score: 0, matched: [] };

  let best: CategorySuggestion = { category: "tjeter", score: 0, matched: [] };
  for (const key of Object.keys(KEYWORDS) as Exclude<Category, "tjeter">[]) {
    let score = 0;
    const matched: string[] = [];
    for (const rule of KEYWORDS[key]) {
      const m = t.match(rule.re);
      if (m) {
        score += rule.w;
        matched.push(m[0]);
      }
    }
    if (score > best.score) best = { category: key, score, matched };
  }
  return best.score >= 3 ? best : { category: "tjeter", score: best.score, matched: best.matched };
}

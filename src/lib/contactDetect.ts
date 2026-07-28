// Heuristic contact-info detector for text (mock of the Gemini scan).
// Detects Albanian phone patterns, emails, and common address markers.

const PATTERNS: { key: string; label: string; re: RegExp }[] = [
  {
    key: "phone_al",
    label: "numër telefoni",
    re: /(?:\+?355|00355|0)?[\s\-.]?(?:6[6-9]|4[45])[\s\-.]?\d{3}[\s\-.]?\d{3,4}/i,
  },
  {
    key: "phone_generic",
    label: "numër telefoni",
    re: /\b\d{3}[\s\-.]\d{3}[\s\-.]\d{3,4}\b/,
  },
  {
    key: "email",
    label: "email",
    re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/,
  },
  {
    key: "address",
    label: "adresë",
    re: /\b(?:Rruga|Rr\.|Bulevardi|Blvd\.|Sheshi)\s+[A-Za-zÀ-ÿ0-9\s]+/i,
  },
  {
    key: "city",
    label: "qytet/adresë",
    re: /\b(?:Tiran[ëe]|Durr[ëe]s|Vlor[ëe]|Shkod[ëe]r|Elbasan|Kor[çc][ëe]|Fier|Berat|Gjirokast[ëe]r|Lezh[ëe])\b/i,
  },
  {
    key: "social",
    label: "kontakt në rrjete sociale",
    re: /\b(?:whatsapp|viber|telegram|instagram|facebook|messenger|@\w{3,})\b/i,
  },
  {
    key: "url",
    label: "link kontakti",
    re: /https?:\/\/\S+|\bwa\.me\/|\bt\.me\//i,
  },
];

export interface ContactHit {
  key: string;
  label: string;
  match: string;
}

export function detectContact(text: string): ContactHit[] {
  const hits: ContactHit[] = [];
  const seen = new Set<string>();
  for (const p of PATTERNS) {
    const m = text.match(p.re);
    if (m && !seen.has(p.key)) {
      seen.add(p.key);
      hits.push({ key: p.key, label: p.label, match: m[0] });
    }
  }
  return hits;
}

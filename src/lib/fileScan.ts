// Skanim i bashkëngjitjeve në klient: lloji i lejuar, madhësia, ekzekutues i maskuar,
// makro në dokumente, dhe kontakt në përmbajtje teksti. Kjo është shtresa e parë;
// skanimi i thelluar (Gemini Vision + antivirus) shtohet me Lovable Cloud.

import { detectContact, type ContactHit } from "./contactDetect";

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_EXT = [
  "jpg", "jpeg", "png", "webp", "heic",
  "txt", "pdf", "doc", "docx", "zip",
] as const;

const DANGEROUS_EXT = [
  "exe", "bat", "cmd", "com", "scr", "msi", "vbs", "js", "jar",
  "sh", "apk", "dll", "ps1", "lnk", "iso", "docm", "xlsm", "pptm",
];

export type ScanVerdict = "clean" | "warning" | "blocked";

export interface ScanResult {
  file: File;
  verdict: ScanVerdict;
  reasons: string[];
  contactHits: ContactHit[];
  kind: "image" | "document" | "archive" | "unknown";
  previewUrl?: string;
}

function extOf(name: string): string {
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1]! : "";
}

function kindOf(ext: string): ScanResult["kind"] {
  if (["jpg", "jpeg", "png", "webp", "heic"].includes(ext)) return "image";
  if (["txt", "pdf", "doc", "docx"].includes(ext)) return "document";
  if (ext === "zip") return "archive";
  return "unknown";
}

async function readTextSafe(file: File): Promise<string> {
  try {
    const slice = file.slice(0, 200_000);
    return await slice.text();
  } catch {
    return "";
  }
}

export async function scanFile(file: File): Promise<ScanResult> {
  const ext = extOf(file.name);
  const kind = kindOf(ext);
  const reasons: string[] = [];
  let verdict: ScanVerdict = "clean";
  let contactHits: ContactHit[] = [];

  if (DANGEROUS_EXT.includes(ext)) {
    reasons.push(`Lloji .${ext} është i ndaluar (rrezik malware).`);
    verdict = "blocked";
  } else if (!ALLOWED_EXT.includes(ext as (typeof ALLOWED_EXT)[number])) {
    reasons.push(`Lloji .${ext || "?"} nuk lejohet. Lejohen: foto, .txt, .pdf, .doc, .docx, .zip.`);
    verdict = "blocked";
  }

  // Ekzekutues i maskuar me dy zgjatime, p.sh. "fatura.pdf.exe".
  const doubleExt = file.name.toLowerCase().match(/\.(pdf|docx?|jpe?g|png|txt|zip)\.[a-z0-9]{2,4}$/);
  if (doubleExt) {
    reasons.push("Emri i skedarit ka dy zgjatime — shenjë e ekzekutuesit të maskuar.");
    verdict = "blocked";
  }

  if (file.size > MAX_FILE_BYTES) {
    reasons.push(`Madhësia ${(file.size / 1024 / 1024).toFixed(1)} MB kalon limitin 10 MB.`);
    verdict = "blocked";
  }
  if (file.size === 0) {
    reasons.push("Skedari është bosh.");
    verdict = "blocked";
  }

  if (verdict !== "blocked" && (kind === "document" || kind === "archive")) {
    const text = await readTextSafe(file);
    if (/vbaProject\.bin|auto_?open|Sub\s+AutoOpen|ThisDocument/i.test(text)) {
      reasons.push("Dokumenti përmban makro të ekzekutueshme (VBA).");
      verdict = "blocked";
    }
    if (/\/JavaScript|\/OpenAction|\/Launch/i.test(text) && ext === "pdf") {
      reasons.push("PDF-i përmban JavaScript ose veprim automatik — bllokohet.");
      verdict = "blocked";
    }
    if (verdict !== "blocked") {
      contactHits = detectContact(text);
      if (contactHits.length > 0) {
        reasons.push(
          `Përmbajtja përmban informacion kontakti (${contactHits
            .map((h) => h.label)
            .join(", ")}).`,
        );
        verdict = "blocked";
      }
    }
  }

  if (verdict === "clean" && kind === "image") {
    reasons.push("Foto e pranuar — skanimi i tekstit brenda fotos kryhet nga AI në server.");
    verdict = "warning";
  }

  return {
    file,
    verdict,
    reasons,
    contactHits,
    kind,
    previewUrl: kind === "image" && verdict !== "blocked" ? URL.createObjectURL(file) : undefined,
  };
}

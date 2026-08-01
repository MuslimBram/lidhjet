import { useRef, useState } from "react";
import { Paperclip, X, ShieldAlert, ShieldCheck, Loader2, FileText, Image as ImageIcon, Archive } from "lucide-react";
import { scanFile, type ScanResult } from "@/lib/fileScan";

export function AttachmentPicker({
  disabled,
  onChange,
}: {
  disabled?: boolean;
  onChange?: (accepted: ScanResult[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<ScanResult[]>([]);
  const [scanning, setScanning] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setScanning(true);
    const results: ScanResult[] = [];
    for (const f of Array.from(files)) results.push(await scanFile(f));
    const next = [...items, ...results];
    setItems(next);
    setScanning(false);
    onChange?.(next.filter((r) => r.verdict !== "blocked"));
  }

  function remove(idx: number) {
    const next = items.filter((_, i) => i !== idx);
    setItems(next);
    onChange?.(next.filter((r) => r.verdict !== "blocked"));
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.webp,.heic,.txt,.pdf,.doc,.docx,.zip"
        className="hidden"
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={disabled || scanning}
        onClick={() => inputRef.current?.click()}
        title="Bashkangjit (foto, .txt, .pdf, .doc, .zip) — skanohet për malware dhe kontakt"
        className="grid h-9 w-9 place-items-center rounded-md border border-border text-muted-foreground hover:text-foreground disabled:opacity-50"
      >
        {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
      </button>

      {items.length > 0 && (
        <ul className="mt-3 space-y-2">
          {items.map((r, i) => {
            const Icon = r.kind === "image" ? ImageIcon : r.kind === "archive" ? Archive : FileText;
            const blocked = r.verdict === "blocked";
            return (
              <li
                key={`${r.file.name}-${i}`}
                className={`flex items-start gap-3 rounded-md px-3 py-2 text-xs ${
                  blocked
                    ? "bg-destructive/15 text-destructive"
                    : "bg-input/60 text-muted-foreground"
                }`}
              >
                {r.previewUrl ? (
                  <img src={r.previewUrl} alt={r.file.name} className="h-10 w-10 rounded object-cover" />
                ) : (
                  <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{r.file.name}</p>
                  <p className="mt-0.5 flex items-center gap-1.5">
                    {blocked ? (
                      <ShieldAlert className="h-3.5 w-3.5" />
                    ) : (
                      <ShieldCheck className="h-3.5 w-3.5 text-[color:var(--color-success)]" />
                    )}
                    {blocked ? "Bllokuar" : "Kaloi skanimin bazë"} ·{" "}
                    {(r.file.size / 1024).toFixed(0)} KB
                  </p>
                  {r.reasons.length > 0 && (
                    <ul className="mt-1 list-disc space-y-0.5 pl-4">
                      {r.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={`Hiq ${r.file.name}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

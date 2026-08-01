import { useState } from "react";
import { X, AlertTriangle, Send } from "lucide-react";

export function PriceJustifyDialog({
  reason,
  onCancel,
  onSubmit,
}: {
  reason: string;
  onCancel: () => void;
  onSubmit: (justification: string) => void;
}) {
  const [text, setText] = useState("");
  const valid = text.trim().split(/\s+/).filter(Boolean).length >= 5;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} className="card-elevated w-full max-w-md p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold">Çmimi jashtë normave</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Jepni arsyen; përndryshe postimi regjistrohet si shkelje.
            </p>
          </div>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-start gap-2 rounded-md bg-[color:var(--color-warning)]/15 px-3 py-2 text-xs text-[color:var(--color-warning)]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{reason}</span>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="Pse çmimi është kaq i lartë/ulët? (min. 5 fjalë — pa numër telefoni ose email)"
          className="mt-4 w-full resize-none rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Anulo
          </button>
          <button
            disabled={!valid}
            onClick={() => onSubmit(text.trim())}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" /> Dërgo justifikimin
          </button>
        </div>
      </div>
    </div>
  );
}

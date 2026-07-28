import { useState } from "react";
import { X, Wallet, CheckCircle2, MessageCircle } from "lucide-react";
import { calcServiceTax, formatLek } from "@/lib/taxCalc";

export function InterestDialog({
  authorName,
  price,
  onClose,
}: {
  authorName: string;
  price: number;
  onClose: () => void;
}) {
  const tax = calcServiceTax(price);
  const [stage, setStage] = useState<"interest" | "await_pay" | "paid">("interest");

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="card-elevated w-full max-w-md p-6"
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold">Shpreh interes</h3>
            <p className="mt-1 text-xs text-muted-foreground">Ofertë nga {authorName}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-lg bg-input/50 p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Çmimi i deklaruar</span>
            <span className="font-semibold">{formatLek(price)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-muted-foreground">Taksa e shërbimit</span>
            <span className="font-semibold text-primary">{formatLek(tax)}</span>
          </div>
        </div>

        {stage === "interest" && (
          <>
            <p className="mt-4 text-xs text-muted-foreground">
              Interesi juaj i dërgohet shitësit. Kanali i komunikimit aktivizohet vetëm pasi
              shitësi të paguajë taksën e shërbimit sipas intervalit të çmimit.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-md border border-border bg-input px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Anulo
              </button>
              <button
                onClick={() => setStage("await_pay")}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Wallet className="h-4 w-4" /> Dërgo interesin
              </button>
            </div>
          </>
        )}

        {stage === "await_pay" && (
          <>
            <p className="mt-4 rounded-md bg-[color:var(--color-warning)]/10 p-3 text-xs text-[color:var(--color-warning)]">
              Në pritje: shitësi njoftohet dhe paguan {formatLek(tax)} për të hapur chat-in.
              (Për demo, mund të simulojmë pagesën.)
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-md border border-border bg-input px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Mbyll
              </button>
              <button
                onClick={() => setStage("paid")}
                className="inline-flex items-center gap-2 rounded-md bg-[color:var(--color-success)] px-4 py-2 text-sm font-medium text-background hover:opacity-90"
              >
                <CheckCircle2 className="h-4 w-4" /> Simulo pagesën
              </button>
            </div>
          </>
        )}

        {stage === "paid" && (
          <>
            <div className="mt-4 rounded-md bg-[color:var(--color-success)]/10 p-3 text-xs text-[color:var(--color-success)]">
              Pagesa u konfirmua. Kanali i komunikimit u hap.
            </div>
            <div className="mt-4 rounded-lg border border-border bg-input/50 p-3 text-sm">
              <div className="mb-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <MessageCircle className="h-3.5 w-3.5" /> Chat me {authorName}
              </div>
              <div className="rounded bg-background px-3 py-2 text-xs text-muted-foreground">
                Përshëndetje! Faleminderit për pagesën — mund të bisedojmë këtu.
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                onClick={onClose}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Në rregull
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

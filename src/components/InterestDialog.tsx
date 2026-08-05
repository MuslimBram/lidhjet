import { useState } from "react";
import { X, HandCoins, Send, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { formatLek } from "@/lib/taxCalc";
import { createInterest } from "@/lib/interests.functions";

type Stage = "interest" | "discount" | "sent";

export function InterestDialog({
  postId,
  authorName,
  price,
  onClose,
}: {
  postId: string;
  authorName: string;
  price: number;
  onClose: () => void;
}) {
  const [stage, setStage] = useState<Stage>("interest");
  const [offer, setOffer] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const send = useServerFn(createInterest);
  const mutation = useMutation({
    mutationFn: (vars: { offerPrice?: number | null; note?: string }) =>
      send({ data: { postId, ...vars } }),
    onSuccess: () => {
      setError(null);
      setStage("sent");
    },
    onError: (e: unknown) =>
      setError(e instanceof Error ? e.message : "Interesi nuk u dërgua."),
  });

  const offerNum = Number(offer.replace(/[^\d]/g, ""));
  const offerValid = Number.isFinite(offerNum) && offerNum > 0 && offerNum < price;
  const busy = mutation.isPending;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="card-elevated w-full max-w-md p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold">Shpreh interes</h3>
            <p className="mt-1 text-xs text-muted-foreground">Ofertë nga {authorName}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-input/50 p-4 text-sm">
          <span className="text-muted-foreground">Çmimi i deklaruar</span>
          <span className="font-semibold">{formatLek(price)}</span>
        </div>

        {error && (
          <p className="mt-3 rounded-md bg-destructive/10 p-3 text-xs text-destructive">{error}</p>
        )}

        {stage === "interest" && (
          <>
            <p className="mt-4 text-xs text-muted-foreground">
              Interesi i dërgohet shitësit. Biseda hapet vetëm pasi shitësi konfirmon shërbimin;
              dritarja zgjat 24 orë. Mund të kërkoni edhe ulje çmimi.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-md border border-border bg-input px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Anulo
              </button>
              <button
                onClick={() => setStage("discount")}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-input px-4 py-2 text-sm font-medium hover:text-primary"
              >
                <HandCoins className="h-4 w-4" /> Kërko ulje
              </button>
              <button
                onClick={() => mutation.mutate({ offerPrice: null })}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Dërgo interesin
              </button>
            </div>
          </>
        )}

        {stage === "discount" && (
          <>
            <label className="mt-4 block text-sm font-medium">Çmimi që propozoni (L)</label>
            <input
              value={offer}
              onChange={(e) => setOffer(e.target.value.replace(/[^\d]/g, ""))}
              inputMode="numeric"
              placeholder={String(Math.max(1, Math.round(price * 0.9)))}
              className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Arsyeja e kërkesës (pa numër telefoni ose email)"
              className="mt-3 w-full resize-none rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
            {offer && !offerValid && (
              <p className="mt-2 text-xs text-destructive">
                Propozimi duhet të jetë numër pozitiv dhe më i vogël se {formatLek(price)}.
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setStage("interest")}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Kthehu
              </button>
              <button
                disabled={!offerValid || busy}
                onClick={() => mutation.mutate({ offerPrice: offerNum, note })}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <HandCoins className="h-4 w-4" />}
                Dërgo kërkesën për ulje
              </button>
            </div>
          </>
        )}

        {stage === "sent" && (
          <>
            <div className="mt-4 rounded-md bg-[color:var(--color-success)]/10 p-3 text-xs text-[color:var(--color-success)]">
              Kërkesa u regjistrua dhe shitësi u njoftua. Biseda shfaqet në “Interesat e mia” sapo
              shitësi e hap.
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-md border border-border bg-input px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Mbyll
              </button>
              <Link
                to="/interests"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Interesat e mia
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { X, HandCoins, MessageCircle, Send, Loader2 } from "lucide-react";
import { formatLek } from "@/lib/taxCalc";

type Stage = "interest" | "discount" | "sent" | "chat";

export function InterestDialog({
  authorName,
  price,
  onClose,
}: {
  authorName: string;
  price: number;
  onClose: () => void;
}) {
  const [stage, setStage] = useState<Stage>("interest");
  const [offer, setOffer] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");
  const [thread, setThread] = useState<{ me: boolean; text: string }[]>([]);

  const offerNum = Number(offer.replace(/[^\d]/g, ""));
  const offerValid = Number.isFinite(offerNum) && offerNum > 0 && offerNum < price;

  function send(withDiscount: boolean) {
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setStage("sent");
      setThread(
        withDiscount
          ? [
              {
                me: true,
                text: `Kërkesë për ulje: ${formatLek(offerNum)}${note.trim() ? ` — ${note.trim()}` : ""}`,
              },
            ]
          : [{ me: true, text: "Kam shprehur interes për këtë ofertë." }],
      );
    }, 500);
  }

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

        {stage === "interest" && (
          <>
            <p className="mt-4 text-xs text-muted-foreground">
              Interesi juaj i dërgohet shitësit. Mund të kërkoni edhe ulje të çmimit — shitësi
              diskuton çmimin drejtpërdrejt me ju.
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
                onClick={() => send(false)}
                disabled={sending}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
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
                disabled={!offerValid || sending}
                onClick={() => send(true)}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <HandCoins className="h-4 w-4" />}
                Dërgo kërkesën për ulje
              </button>
            </div>
          </>
        )}

        {stage === "sent" && (
          <>
            <div className="mt-4 rounded-md bg-[color:var(--color-success)]/10 p-3 text-xs text-[color:var(--color-success)]">
              Kërkesa u dërgua. Shitësi njoftohet dhe hap bisedën për të diskutuar çmimin.
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-md border border-border bg-input px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Mbyll
              </button>
              <button
                onClick={() => setStage("chat")}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <MessageCircle className="h-4 w-4" /> Hap bisedën
              </button>
            </div>
          </>
        )}

        {stage === "chat" && (
          <>
            <div className="mt-4 rounded-lg border border-border bg-input/50 p-3">
              <div className="mb-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <MessageCircle className="h-3.5 w-3.5" /> Bisedë me {authorName}
              </div>
              <div className="max-h-40 space-y-2 overflow-y-auto">
                {thread.map((m, i) => (
                  <div
                    key={i}
                    className={`rounded px-3 py-2 text-xs ${
                      m.me
                        ? "bg-primary/15 text-foreground"
                        : "bg-background text-muted-foreground"
                    }`}
                  >
                    {m.text}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder="Shkruaj mesazh për çmimin…"
                className="flex-1 rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button
                disabled={!msg.trim()}
                onClick={() => {
                  setThread((t) => [...t, { me: true, text: msg.trim() }]);
                  setMsg("");
                }}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={onClose}
                className="rounded-md border border-border bg-input px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Mbyll
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

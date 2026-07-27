import { useState } from "react";
import { Send, MessageCircle } from "lucide-react";

export interface CommentItem {
  author: string;
  body: string;
}

const LIMIT = 2;

export function CommentSection({
  initial,
  currentUserName = "Ju (demo)",
}: {
  initial: CommentItem[];
  currentUserName?: string;
}) {
  const [items, setItems] = useState<CommentItem[]>(initial);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mine = items.filter((c) => c.author === currentUserName).length;
  const reached = mine >= LIMIT;

  function submit() {
    setError(null);
    if (reached) {
      setError("Keni arritur limitin prej 2 komentesh për këtë postim.");
      return;
    }
    if (!draft.trim()) return;
    setItems([...items, { author: currentUserName, body: draft.trim() }]);
    setDraft("");
  }

  return (
    <div className="mt-3">
      {items.length > 0 && (
        <div className="mb-3 space-y-2">
          {items.map((c, i) => (
            <div key={i} className="rounded-md bg-input/50 px-3 py-2 text-sm">
              <span className="font-medium">{c.author}</span>{" "}
              <span className="text-muted-foreground">{c.body}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <MessageCircle className="h-3.5 w-3.5" /> {items.length} komente
        </span>
        <span>Komentet tuaja: {mine}/{LIMIT}</span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={reached}
          placeholder={reached ? "Limiti i plotësuar (2/2)" : "Shkruaj një koment…"}
          className="flex-1 rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
        />
        <button
          onClick={submit}
          disabled={reached || !draft.trim()}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" /> Dërgo
        </button>
      </div>
      {error && (
        <p className="mt-2 rounded-md bg-destructive/15 px-3 py-2 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}

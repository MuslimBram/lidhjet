import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ShieldCheck,
  Send,
  Paperclip,
  MessageCircle,
  Briefcase,
  Wrench,
  Store,
  MoreHorizontal,
  ArrowLeft,
} from "lucide-react";

export const Route = createFileRoute("/feed")({
  head: () => ({
    meta: [
      { title: "Feed — Lidhjet" },
      {
        name: "description",
        content: "Postime nga anëtarë të verifikuar — punë, shërbime, tregti.",
      },
      { property: "og:title", content: "Feed — Lidhjet" },
      {
        property: "og:description",
        content: "Postime nga anëtarë të verifikuar.",
      },
    ],
  }),
  component: FeedPage,
});

type Category = "pune" | "sherbim" | "tregti" | "tjeter";
interface Post {
  id: string;
  author: string;
  offerType: Category;
  body: string;
  createdAt: string;
  comments: { author: string; body: string }[];
}

const SEED: Post[] = [
  {
    id: "1",
    author: "Arben Hoxha",
    offerType: "sherbim",
    body: "Elektricist i licencuar në Tiranë. Instalime, riparime, kontrata mirëmbajtjeje. Kontakt në mesazh.",
    createdAt: "2 orë më parë",
    comments: [
      { author: "Elira K.", body: "A punoni edhe në zonën e Yzberishtit?" },
    ],
  },
  {
    id: "2",
    author: "Ilir Deda",
    offerType: "tregti",
    body: "Shes olive extra virgin nga ferma familjare në Vlorë. 5L / 15L. Certifikatë analize në PDF.",
    createdAt: "5 orë më parë",
    comments: [],
  },
  {
    id: "3",
    author: "Ariana Meta",
    offerType: "pune",
    body: "Kërkoj punë part-time si përkthyese IT/EN (5+ vite eksperiencë). CV i verifikuar.",
    createdAt: "1 ditë më parë",
    comments: [],
  },
];

const CAT_META: Record<Category, { icon: typeof Briefcase; label: string; className: string }> = {
  pune: { icon: Briefcase, label: "Punë", className: "bg-primary/15 text-primary" },
  sherbim: {
    icon: Wrench,
    label: "Shërbim",
    className: "bg-accent/15 text-accent",
  },
  tregti: {
    icon: Store,
    label: "Tregti",
    className: "bg-[color:var(--color-warning)]/15 text-[color:var(--color-warning)]",
  },
  tjeter: { icon: MoreHorizontal, label: "Tjetër", className: "bg-muted text-muted-foreground" },
};

function FeedPage() {
  const [posts, setPosts] = useState<Post[]>(SEED);
  const [draft, setDraft] = useState("");
  const [cat, setCat] = useState<Category>("sherbim");

  function submit() {
    if (!draft.trim()) return;
    setPosts([
      {
        id: crypto.randomUUID(),
        author: "Ju (demo)",
        offerType: cat,
        body: draft,
        createdAt: "tani",
        comments: [],
      },
      ...posts,
    ]);
    setDraft("");
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Kryefaqja
          </Link>
          <Link to="/" className="flex items-center gap-2 text-lg font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="h-4 w-4" />
            </span>
            Lidhjet
          </Link>
          <Link to="/admin" className="text-xs text-muted-foreground hover:text-foreground">
            Admin
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        {/* Composer */}
        <div className="card-elevated p-4">
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Një postim / 24 orë — do skanohet nga AI për maluer dhe rreziqe.
          </div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder="Cfarë ofron sot?"
            className="w-full resize-none rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {(Object.keys(CAT_META) as Category[]).map((c) => {
                const M = CAT_META[c];
                const active = cat === c;
                return (
                  <button
                    key={c}
                    onClick={() => setCat(c)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors ${
                      active ? M.className : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <M.icon className="h-3.5 w-3.5" />
                    {M.label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="grid h-9 w-9 place-items-center rounded-md border border-border text-muted-foreground hover:text-foreground"
                title="Bashkangjit (foto, PDF, DOC, ZIP, link)"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <button
                onClick={submit}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Send className="h-4 w-4" /> Posto
              </button>
            </div>
          </div>
        </div>

        {/* Feed */}
        <div className="mt-6 space-y-4">
          {posts.map((p) => {
            const M = CAT_META[p.offerType];
            return (
              <article key={p.id} className="card-elevated p-5">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
                    {p.author
                      .split(" ")
                      .map((s) => s[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{p.author}</div>
                    <div className="text-xs text-muted-foreground">{p.createdAt}</div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${M.className}`}
                  >
                    <M.icon className="h-3.5 w-3.5" /> {M.label}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed">{p.body}</p>
                <div className="mt-4 flex items-center gap-4 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <MessageCircle className="h-3.5 w-3.5" />
                    {p.comments.length} komente
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[color:var(--color-success)]">
                    <ShieldCheck className="h-3.5 w-3.5" /> I verifikuar
                  </span>
                </div>
                {p.comments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {p.comments.map((c, i) => (
                      <div key={i} className="rounded-md bg-input/50 px-3 py-2 text-sm">
                        <span className="font-medium">{c.author}</span>{" "}
                        <span className="text-muted-foreground">{c.body}</span>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}

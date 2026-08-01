import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ShieldCheck,
  Send,
  Paperclip,
  Briefcase,
  Wrench,
  Store,
  MoreHorizontal,
  ArrowLeft,
  LayoutGrid,
  Newspaper,
  Clock,
  AlertTriangle,
  HandCoins,
  Tag,
  Search,
  Repeat2,
} from "lucide-react";
import { NotificationSettings } from "@/components/NotificationSettings";
import { UserBadge } from "@/components/UserBadge";
import { CommentSection, type CommentItem } from "@/components/CommentSection";
import { SuspensionBanner } from "@/components/SuspensionBanner";
import { InterestDialog } from "@/components/InterestDialog";
import { AttachmentPicker } from "@/components/AttachmentPicker";
import { PriceJustifyDialog } from "@/components/PriceJustifyDialog";
import { detectContact } from "@/lib/contactDetect";
import { jaccard, DUPLICATE_THRESHOLD } from "@/lib/similarity";
import { checkPrice } from "@/lib/priceCheck";
import { suggestCategory } from "@/lib/autoCategory";
import type { ScanResult } from "@/lib/fileScan";
import { calcServiceTax, formatLek } from "@/lib/taxCalc";
import { useViolations } from "@/hooks/useViolations";
import { usePostLimit } from "@/hooks/usePostLimit";
import { usePostNotifications } from "@/hooks/usePostNotifications";


export const Route = createFileRoute("/feed")({
  head: () => ({
    meta: [
      { title: "Feed — Lidhjet" },
      {
        name: "description",
        content: "Postime nga anëtarë të verifikuar — punë, shërbime, tregti.",
      },
      { property: "og:title", content: "Feed — Lidhjet" },
      { property: "og:description", content: "Postime nga anëtarë të verifikuar." },
    ],
  }),
  component: FeedPage,
});

type Category = "pune" | "sherbim" | "tregti" | "tjeter";
interface Post {
  id: string;
  authorFullName: string;
  offerType: Category;
  body: string;
  price: number;
  createdAt: string;
  comments: CommentItem[];
}

const SEED: Post[] = [
  {
    id: "1",
    authorFullName: "Arben Hoxha",
    offerType: "sherbim",
    body: "Elektricist i licencuar. Instalime, riparime, kontrata mirëmbajtjeje.",
    price: 3500,
    createdAt: "2 orë më parë",
    comments: [{ author: "Elira Kola", body: "A punoni edhe në zonën time?" }],
  },
  {
    id: "2",
    authorFullName: "Ilir Deda",
    offerType: "tregti",
    body: "Shes olive extra virgin nga ferma familjare. 5L / 15L, certifikatë analize.",
    price: 12000,
    createdAt: "5 orë më parë",
    comments: [],
  },
  {
    id: "3",
    authorFullName: "Ariana Meta",
    offerType: "pune",
    body: "Kërkoj punë part-time si përkthyese IT/EN (5+ vite eksperiencë). CV i verifikuar.",
    price: 45000,
    createdAt: "1 ditë më parë",
    comments: [],
  },
];

const CAT_META: Record<Category, { icon: typeof Briefcase; label: string; className: string }> = {
  pune: { icon: Briefcase, label: "Punë", className: "bg-primary/15 text-primary" },
  sherbim: { icon: Wrench, label: "Shërbim", className: "bg-accent/15 text-accent" },
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
  const [priceStr, setPriceStr] = useState("");
  const [cat, setCat] = useState<Category>("sherbim");
  const [filter, setFilter] = useState<Category | "all">("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [interestFor, setInterestFor] = useState<Post | null>(null);
  const { count, max, isSuspended, suspendedUntil, addViolation, reset } = useViolations();
  const { canPost, remainingLabel, markPosted } = usePostLimit();
  const { announce } = usePostNotifications((p) => {
    setPosts((prev) =>
      prev.some((x) => x.id === p.id)
        ? prev
        : [
            {
              id: p.id,
              authorFullName: p.authorFullName,
              offerType: (p.offerType as Category) ?? "tjeter",
              body: p.body,
              price: p.price,
              createdAt: "tani",
              comments: [],
            },
            ...prev,
          ],
    );
  });


  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((p) => {
      if (filter !== "all" && p.offerType !== filter) return false;
      if (!q) return true;
      return (
        p.body.toLowerCase().includes(q) ||
        p.authorFullName.toLowerCase().includes(q) ||
        String(p.price).includes(q)
      );
    });
  }, [posts, filter, query]);

  function submit() {
    setError(null);
    if (isSuspended) {
      setError("Llogaria juaj është pezulluar. Nuk mund të postoni deri në përfundim.");
      return;
    }
    if (!canPost) {
      setError(`Limiti: 1 postim / 24 orë. Mund të postoni përsëri pas ${remainingLabel}.`);
      return;
    }
    if (!draft.trim()) return;


    // 1) Contact detection (mock AI)
    const hits = detectContact(draft);
    if (hits.length > 0) {
      const list = hits.map((h) => h.label).join(", ");
      const reason = `Postimi përmban informacion kontakti (${list}). Kontakti lejohet vetëm pas pagesës së taksës dhe interesit të blerësit.`;
      const { count: c, suspendedUntil: su } = addViolation("contact", reason);
      setError(
        `${reason}\nShkelje: ${c}/${max}${su ? " — llogaria u pezullua për 7 ditë." : ""}`,
      );
      return;
    }

    // 2) Price validation (mock AI)
    const price = Number(priceStr.replace(/\D/g, ""));
    const pc = checkPrice(price, cat);
    if (!pc.ok) {
      const { count: c, suspendedUntil: su } = addViolation("price", pc.reason!);
      setError(
        `Çmimi i deklaruar nuk është brenda normave të tregut. ${pc.reason}\nShkelje: ${c}/${max}${
          su ? " — llogaria u pezullua për 7 ditë." : ""
        }`,
      );
      return;
    }

    const authorFullName = "Ju Demo";
    const newPost: Post = {
      id: crypto.randomUUID(),
      authorFullName,
      offerType: cat,
      body: draft,
      price,
      createdAt: "tani",
      comments: [],
    };

    // Dedupe: remove older near-duplicate posts from the same author.
    const filtered = posts.filter((p) => {
      if (p.authorFullName !== authorFullName) return true;
      return jaccard(p.body, newPost.body) < DUPLICATE_THRESHOLD;
    });
    const removed = posts.length - filtered.length;

    setPosts([newPost, ...filtered]);
    setDraft("");
    setPriceStr("");
    markPosted();
    announce({
      id: newPost.id,
      authorFullName,
      body: newPost.body,
      offerType: newPost.offerType,
      price: newPost.price,
    });
    setNotice(
      removed > 0
        ? `Postimi u publikua. ${removed} postim i mëparshëm i ngjashëm u fshi automatikisht. Të gjithë anëtarët u njoftuan.`
        : "Postimi u publikua. Të gjithë anëtarët u njoftuan.",
    );

  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Kryefaqja
          </Link>
          <Link to="/" className="flex items-center gap-2 text-lg font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="h-4 w-4" />
            </span>
            Lidhjet
          </Link>
          <div className="order-3 flex w-full items-center gap-2 md:order-2 md:w-auto md:flex-1 md:max-w-md">
            <label className="flex w-full items-center gap-2 rounded-md border border-border bg-input px-3 py-2 text-sm">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Kërko në postime, autor, çmim…"
                className="w-full bg-transparent outline-none placeholder:text-muted-foreground/70"
                aria-label="Kërko postime"
              />
            </label>
          </div>
          <div className="order-2 flex items-center gap-2 md:order-3">
            <NotificationSettings />
            <Link to="/admin" className="text-xs text-muted-foreground hover:text-foreground">
              Admin
            </Link>
          </div>
        </div>
      </header>


      <main className="mx-auto max-w-7xl px-6 py-8">
        {isSuspended && suspendedUntil && <SuspensionBanner until={suspendedUntil} onReset={reset} />}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          {/* Left: Categories */}
          <aside className="md:col-span-1">
            <div className="card-elevated sticky top-24 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <LayoutGrid className="h-4 w-4 text-primary" /> Kategoritë
              </div>
              <ul className="space-y-1">
                <li>
                  <button
                    onClick={() => setFilter("all")}
                    className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                      filter === "all" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-input hover:text-foreground"
                    }`}
                  >
                    <span>Të gjitha</span>
                    <span className="text-xs opacity-70">{posts.length}</span>
                  </button>
                </li>
                {(Object.keys(CAT_META) as Category[]).map((c) => {
                  const M = CAT_META[c];
                  const count = posts.filter((p) => p.offerType === c).length;
                  const active = filter === c;
                  return (
                    <li key={c}>
                      <button
                        onClick={() => setFilter(c)}
                        className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                          active ? M.className : "text-muted-foreground hover:bg-input hover:text-foreground"
                        }`}
                      >
                        <span className="inline-flex items-center gap-2">
                          <M.icon className="h-4 w-4" /> {M.label}
                        </span>
                        <span className="text-xs opacity-70">{count}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-4 rounded-md bg-input/50 p-3 text-xs text-muted-foreground">
                <p>AI kategorizon dhe skanon postimet për kontakt, malware dhe çmim jashtë normave.</p>
                <p className="mt-2">
                  <span className="font-semibold text-foreground">Shkelje:</span> {count}/{max}
                </p>
              </div>
            </div>
          </aside>

          {/* Center: Feed */}
          <section className="md:col-span-2">
            <div className="card-elevated p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Një postim / 24 orë — pa kontakt në tekst/foto. Kontakti hapet pas interesit + taksës.
                {!canPost && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--color-warning)]/15 px-2.5 py-1 text-[color:var(--color-warning)]">
                    <Clock className="h-3.5 w-3.5" /> Postimi i radhës pas {remainingLabel}
                  </span>
                )}
              </div>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                disabled={isSuspended || !canPost}
                placeholder={
                  canPost
                    ? "Çfarë ofron sot? (mos përfshi tel/email/adresë — do të bllokohet)"
                    : `Limiti 1 postim / 24 orë — provoni pas ${remainingLabel}`
                }
                className="w-full resize-none rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
              />

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <div className="flex flex-1 items-center gap-2 rounded-md border border-border bg-input px-3 py-2 text-sm">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    inputMode="numeric"
                    value={priceStr}
                    onChange={(e) => setPriceStr(e.target.value.replace(/\D/g, ""))}
                    disabled={isSuspended}
                    placeholder="Çmimi (Lekë)"
                    className="w-full bg-transparent outline-none placeholder:text-muted-foreground/70"
                  />
                  {priceStr && (
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      taksë: {formatLek(calcServiceTax(Number(priceStr)))}
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
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
                    title="Bashkangjit (foto, PDF, DOC, ZIP) — skanohet nga AI"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <button
                    onClick={submit}
                    disabled={isSuspended || !canPost}

                    className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" /> Posto
                  </button>
                </div>
              </div>
              {error && (
                <div className="mt-3 flex items-start gap-2 rounded-md bg-destructive/15 px-3 py-2 text-xs text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="whitespace-pre-line">{error}</span>
                </div>
              )}
              {notice && !error && (
                <div className="mt-3 flex items-start gap-2 rounded-md bg-primary/10 px-3 py-2 text-xs text-primary">
                  <Repeat2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{notice}</span>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center gap-2 text-sm font-semibold">
              <Newspaper className="h-4 w-4 text-primary" /> Më të fundit
              {filter !== "all" && (
                <span className="text-xs font-normal text-muted-foreground">
                  · {CAT_META[filter].label}
                </span>
              )}
            </div>

            <div className="mt-3 space-y-4">
              {visible.map((p) => {
                const M = CAT_META[p.offerType];
                return (
                  <article key={p.id} className="card-elevated p-5">
                    <div className="flex items-center gap-3">
                      <UserBadge fullName={p.authorFullName} />
                      <div className="flex-1 text-xs text-muted-foreground">{p.createdAt}</div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${M.className}`}
                      >
                        <M.icon className="h-3.5 w-3.5" /> {M.label}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed">{p.body}</p>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
                      <div className="flex items-center gap-3 text-xs">
                        <span className="inline-flex items-center gap-1.5 text-[color:var(--color-success)]">
                          <ShieldCheck className="h-3.5 w-3.5" /> Autori i verifikuar
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                          <Tag className="h-3.5 w-3.5" /> {formatLek(p.price)}
                        </span>
                      </div>
                      <button
                        onClick={() => setInterestFor(p)}
                        className="inline-flex items-center gap-1.5 rounded-md bg-primary/15 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/25"
                      >
                        <HandCoins className="h-3.5 w-3.5" /> Shpreh interes
                      </button>
                    </div>
                    <CommentSection initial={p.comments} />
                  </article>
                );
              })}
              {visible.length === 0 && (
                <div className="card-elevated p-8 text-center text-sm text-muted-foreground">
                  Asnjë postim në këtë kategori.
                </div>
              )}
            </div>
          </section>

          {/* Right: Latest titles */}
          <aside className="md:col-span-1">
            <div className="card-elevated sticky top-24 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Clock className="h-4 w-4 text-primary" /> Titujt e fundit
              </div>
              <ul className="space-y-2">
                {posts.slice(0, 6).map((p) => {
                  const M = CAT_META[p.offerType];
                  return (
                    <li key={p.id} className="group cursor-pointer">
                      <div className="flex items-start gap-2">
                        <M.icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary" />
                        <div className="min-w-0">
                          <p className="truncate text-sm group-hover:text-primary">{p.body}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {p.authorFullName} · {formatLek(p.price)}
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>
        </div>
      </main>

      {interestFor && (
        <InterestDialog
          authorName={interestFor.authorFullName}
          price={interestFor.price}
          onClose={() => setInterestFor(null)}
        />
      )}
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ShieldCheck,
  Send,
  Sparkles,
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
  Star,
  ShoppingBag,
  MessageSquare,
  Loader2,
  Paperclip,
} from "lucide-react";
import { NotificationSettings } from "@/components/NotificationSettings";
import { UserBadge } from "@/components/UserBadge";
import { CommentSection } from "@/components/CommentSection";
import { SuspensionBanner } from "@/components/SuspensionBanner";
import { InterestDialog } from "@/components/InterestDialog";
import { AttachmentPicker } from "@/components/AttachmentPicker";
import { PriceJustifyDialog } from "@/components/PriceJustifyDialog";
import { detectContact } from "@/lib/contactDetect";
import { checkPrice } from "@/lib/priceCheck";
import { suggestCategory } from "@/lib/autoCategory";
import type { ScanResult } from "@/lib/fileScan";
import { calcServiceTax, formatLek } from "@/lib/taxCalc";
import { sortPosts, type SortKey } from "@/lib/sortPosts";
import { SortBar } from "@/components/SortBar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getFeed, createPost, addComment, ratePost, type Category, type FeedPost } from "@/lib/feed.functions";

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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FeedPage,
});

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

function relative(ms: number): string {
  const diff = Date.now() - ms;
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "tani";
  if (h < 24) return `${h} orë më parë`;
  const d = Math.floor(h / 24);
  return `${d} ditë më parë`;
}

function FeedPage() {
  const { session, loading: authLoading } = useAuth();
  const qc = useQueryClient();

  const fetchFeed = useServerFn(getFeed);
  const doCreate = useServerFn(createPost);
  const doComment = useServerFn(addComment);
  const doRate = useServerFn(ratePost);

  const feedQuery = useQuery({
    queryKey: ["feed"],
    queryFn: () => fetchFeed(),
    enabled: !!session,
  });

  const [draft, setDraft] = useState("");
  const [priceStr, setPriceStr] = useState("");
  const [cat, setCat] = useState<Category>("sherbim");
  const [filter, setFilter] = useState<Category | "all">("all");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("recent");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [interestFor, setInterestFor] = useState<FeedPost | null>(null);
  const [attachments, setAttachments] = useState<ScanResult[]>([]);
  const [justifyFor, setJustifyFor] = useState<{ price: number; reason: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  const posts = feedQuery.data?.posts ?? [];
  const me = feedQuery.data?.me;
  const isSuspended = !!me?.suspendedUntil && new Date(me.suspendedUntil).getTime() > Date.now();

  const publishMutation = useMutation({
    mutationFn: async (vars: { price: number; justification?: string }) => {
      setUploading(true);
      try {
        const files: {
          name: string;
          path: string;
          mime: string;
          size: number;
          verdict: string;
          notes?: string;
        }[] = [];
        for (const a of attachments) {
          const path = `${session!.user.id}/${crypto.randomUUID()}-${a.file.name}`;
          const up = await supabase.storage.from("attachments").upload(path, a.file);
          if (up.error) throw new Error(`Ngarkimi i "${a.file.name}" dështoi: ${up.error.message}`);
          files.push({
            name: a.file.name,
            path,
            mime: a.file.type,
            size: a.file.size,
            verdict: a.verdict,
            notes: a.reasons.join("; "),
          });
        }
        return await doCreate({
          data: {
            body: draft,
            category: cat,
            price: vars.price,
            justification: vars.justification,
            files,
          },
        });
      } finally {
        setUploading(false);
      }
    },
    onSuccess: (res) => {
      setDraft("");
      setPriceStr("");
      setAttachments([]);
      setError(null);
      setNotice(
        [
          "Postimi u publikua. Të gjithë anëtarët me njoftime aktive u njoftuan.",
          res.removedDuplicates > 0
            ? `${res.removedDuplicates} postim i mëparshëm i ngjashëm u fshi automatikisht nga AI.`
            : "",
        ]
          .filter(Boolean)
          .join(" "),
      );
      void qc.invalidateQueries({ queryKey: ["feed"] });
    },
    onError: (e) => {
      setNotice(null);
      setError(e instanceof Error ? e.message : "Postimi dështoi.");
      void qc.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = posts.filter((p) => {
      if (filter !== "all" && p.offerType !== filter) return false;
      if (!q) return true;
      return (
        p.body.toLowerCase().includes(q) ||
        p.authorFullName.toLowerCase().includes(q) ||
        String(p.price).includes(q)
      );
    });
    return sortPosts(matched, sortKey);
  }, [posts, filter, query, sortKey]);

  const suggestion = useMemo(() => suggestCategory(draft), [draft]);

  function submit() {
    setError(null);
    setNotice(null);
    if (isSuspended) {
      setError("Llogaria juaj është pezulluar. Nuk mund të postoni deri në përfundim.");
      return;
    }
    if (!draft.trim()) return;

    const hits = detectContact(draft);
    if (hits.length > 0) {
      setError(
        `Postimi përmban informacion kontakti (${hits
          .map((h) => h.label)
          .join(", ")}). Hiqeni përpara publikimit — përndryshe regjistrohet shkelje.`,
      );
      return;
    }
    if (attachments.some((a) => a.verdict === "blocked")) {
      setError("Hiqni bashkëngjitjet e bllokuara përpara publikimit.");
      return;
    }
    const price = Number(priceStr.replace(/\D/g, ""));
    const pc = checkPrice(price, cat);
    if (!pc.ok) {
      setJustifyFor({ price, reason: pc.reason! });
      return;
    }
    publishMutation.mutate({ price });
  }

  if (authLoading) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="grid min-h-screen place-items-center px-6">
        <div className="card-elevated max-w-md p-8 text-center">
          <ShieldCheck className="mx-auto h-8 w-8 text-primary" />
          <h1 className="mt-4 text-lg font-semibold">Feed vetëm për anëtarë të verifikuar</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Hyni ose regjistrohuni me 2FA për të shikuar dhe publikuar postime.
          </p>
          <Link
            to="/auth"
            className="mt-5 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Hyr / Regjistrohu
          </Link>
        </div>
      </div>
    );
  }

  const busy = publishMutation.isPending || uploading;

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
        {isSuspended && me?.suspendedUntil && (
          <SuspensionBanner until={me.suspendedUntil} onReset={() => void qc.invalidateQueries()} />
        )}

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
                      filter === "all"
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground hover:bg-input hover:text-foreground"
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
                  <span className="font-semibold text-foreground">Shkelje:</span>{" "}
                  {me?.violations ?? 0}/3
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
              </div>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                disabled={isSuspended || busy}
                placeholder="Çfarë ofron sot? (mos përfshi tel/email/adresë — do të bllokohet)"
                className="w-full resize-none rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
              />

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <div className="flex flex-1 items-center gap-2 rounded-md border border-border bg-input px-3 py-2 text-sm">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    inputMode="numeric"
                    value={priceStr}
                    onChange={(e) => setPriceStr(e.target.value.replace(/\D/g, ""))}
                    disabled={isSuspended || busy}
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
              {suggestion.score >= 3 && suggestion.category !== cat && (
                <button
                  onClick={() => setCat(suggestion.category)}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-1 text-xs text-accent"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  AI sugjeron kategorinë “{CAT_META[suggestion.category].label}”
                  {suggestion.matched[0] ? ` (“${suggestion.matched[0]}”)` : ""} — kliko për t'e zbatuar
                </button>
              )}

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
                  <AttachmentPicker disabled={isSuspended || busy} onChange={setAttachments} />
                  <button
                    onClick={submit}
                    disabled={isSuspended || busy}
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {uploading ? "Ngarkohet…" : "Posto"}
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

            <SortBar value={sortKey} onChange={setSortKey} resultCount={visible.length} />

            {feedQuery.isPending && (
              <div className="card-elevated mt-3 grid place-items-center p-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}
            {feedQuery.isError && (
              <div className="card-elevated mt-3 p-6 text-sm text-destructive">
                Feed nuk u lexua: {(feedQuery.error as Error).message}
              </div>
            )}

            <div className="mt-3 space-y-4">
              {visible.map((p) => {
                const M = CAT_META[p.offerType];
                const myComments = p.comments.filter((c) => c.authorId === me?.id).length;
                return (
                  <article key={p.id} className="card-elevated p-5">
                    <div className="flex items-center gap-3">
                      <UserBadge fullName={p.authorFullName} />
                      <div className="flex-1 text-xs text-muted-foreground">
                        {relative(p.createdAtMs)}
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${M.className}`}
                      >
                        <M.icon className="h-3.5 w-3.5" /> {M.label}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed">{p.body}</p>
                    {p.attachments.length > 0 && (
                      <ul className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {p.attachments.map((a) => (
                          <li
                            key={a}
                            className="inline-flex items-center gap-1.5 rounded-md bg-input/60 px-2 py-1"
                          >
                            <Paperclip className="h-3 w-3" /> {a}
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <span className="inline-flex items-center gap-1.5 text-[color:var(--color-success)]">
                          <ShieldCheck className="h-3.5 w-3.5" /> Autori i verifikuar
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                          <Tag className="h-3.5 w-3.5" /> {formatLek(p.price)}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                          <Star className="h-3.5 w-3.5 text-[color:var(--color-warning)]" />
                          {p.ratingCount > 0 ? `${p.rating.toFixed(1)} (${p.ratingCount})` : "pa vlerësime"}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                          <ShoppingBag className="h-3.5 w-3.5" /> {p.sales} shitje
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                          <MessageSquare className="h-3.5 w-3.5" /> {p.comments.length}
                        </span>
                      </div>
                      {p.authorId !== me?.id && (
                        <button
                          onClick={() => setInterestFor(p)}
                          className="inline-flex items-center gap-1.5 rounded-md bg-primary/15 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/25"
                        >
                          <HandCoins className="h-3.5 w-3.5" /> Shpreh interes
                        </button>
                      )}
                    </div>
                    <div className="mt-3 flex items-center gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                      <span>Vlerëso:</span>
                      {[1, 2, 3, 4, 5].map((v) => (
                        <button
                          key={v}
                          onClick={async () => {
                            await doRate({ data: { postId: p.id, stars: v } });
                            void qc.invalidateQueries({ queryKey: ["feed"] });
                          }}
                          aria-label={`Vlerëso ${v} yje`}
                        >
                          <Star
                            className={`h-4 w-4 ${
                              v <= (p.myRating ?? 0)
                                ? "fill-[color:var(--color-warning)] text-[color:var(--color-warning)]"
                                : "text-muted-foreground hover:text-[color:var(--color-warning)]"
                            }`}
                          />
                        </button>
                      ))}
                      {p.myRating && <span>Vlerësimi u regjistrua ({p.myRating}★).</span>}
                    </div>
                    <CommentSection
                      items={p.comments}
                      myCount={myComments}
                      disabled={isSuspended}
                      onSubmit={async (body) => {
                        await doComment({ data: { postId: p.id, body } });
                        await qc.invalidateQueries({ queryKey: ["feed"] });
                      }}
                    />
                  </article>
                );
              })}
              {!feedQuery.isPending && visible.length === 0 && (
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
                {posts.length === 0 && (
                  <li className="text-xs text-muted-foreground">Asnjë postim ende.</li>
                )}
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

      {justifyFor && (
        <PriceJustifyDialog
          reason={justifyFor.reason}
          onCancel={() => {
            setJustifyFor(null);
            setError("Çmimi jashtë normave pa justifikim — postimi nuk u publikua.");
          }}
          onSubmit={(justification) => {
            const price = justifyFor.price;
            setJustifyFor(null);
            publishMutation.mutate({ price, justification });
          }}
        />
      )}
    </div>
  );
}

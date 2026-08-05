import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2, MessageCircle, Send, HandCoins, Clock, Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { formatLek } from "@/lib/taxCalc";
import {
  listMyInterests,
  payServiceTax,
  sendInterestMessage,
  listNotifications,
  markNotificationsRead,
} from "@/lib/interests.functions";

export const Route = createFileRoute("/interests")({
  head: () => ({
    meta: [
      { title: "Interesat e mia — Lidhjet" },
      {
        name: "description",
        content: "Interesat, taksa e shërbimit dhe bisedat 24-orëshe për ofertat tuaja.",
      },
      { property: "og:title", content: "Interesat e mia — Lidhjet" },
      { property: "og:description", content: "Bisedat dhe interesat tuaja në Lidhjet." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InterestsPage,
});

function hoursLeft(iso: string) {
  return Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 3_600_000));
}

function InterestsPage() {
  const { session, loading } = useAuth();
  const qc = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const fetchInterests = useServerFn(listMyInterests);
  const fetchNotifications = useServerFn(listNotifications);
  const pay = useServerFn(payServiceTax);
  const sendMsg = useServerFn(sendInterestMessage);
  const markRead = useServerFn(markNotificationsRead);

  const interests = useQuery({
    queryKey: ["interests"],
    queryFn: () => fetchInterests(),
    enabled: !!session,
    refetchInterval: 30_000,
  });
  const notifications = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchNotifications(),
    enabled: !!session,
    refetchInterval: 30_000,
  });

  const fail = (e: unknown) => setError(e instanceof Error ? e.message : "Veprimi dështoi.");
  const done = () => {
    setError(null);
    void qc.invalidateQueries({ queryKey: ["interests"] });
    void qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  const payMut = useMutation({
    mutationFn: (id: string) => pay({ data: { interestId: id } }),
    onSuccess: done,
    onError: fail,
  });
  const msgMut = useMutation({
    mutationFn: (v: { id: string; body: string }) =>
      sendMsg({ data: { interestId: v.id, body: v.body } }),
    onSuccess: (_r, v) => {
      setDrafts((d) => ({ ...d, [v.id]: "" }));
      done();
    },
    onError: fail,
  });
  const readMut = useMutation({ mutationFn: () => markRead(), onSuccess: done, onError: fail });

  const unread = (notifications.data ?? []).filter((n) => !n.readAt).length;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link to="/feed" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Feed
          </Link>
          <h1 className="text-lg font-semibold">Interesat e mia</h1>
          <button
            onClick={() => readMut.mutate()}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-input px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Bell className="h-3.5 w-3.5" /> {unread} të palexuara
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {loading && (
          <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Po ngarkohet…
          </p>
        )}
        {!loading && !session && (
          <div className="card-elevated p-8 text-center text-sm text-muted-foreground">
            Duhet të jesh i identifikuar.
            <Link to="/auth" className="ml-2 text-primary hover:underline">
              Hyr
            </Link>
          </div>
        )}

        {error && (
          <p className="mb-4 rounded-md bg-destructive/10 p-3 text-xs text-destructive">{error}</p>
        )}

        {session && (
          <>
            {(notifications.data ?? []).length > 0 && (
              <section className="card-elevated mb-6 divide-y divide-border/60">
                {(notifications.data ?? []).slice(0, 5).map((n) => (
                  <div key={n.id} className="p-4 text-sm">
                    <span className={n.readAt ? "text-muted-foreground" : "font-medium"}>
                      {n.title}
                    </span>
                    {n.body && <p className="mt-1 text-xs text-muted-foreground">{n.body}</p>}
                  </div>
                ))}
              </section>
            )}

            <div className="space-y-4">
              {interests.isLoading && (
                <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Po lexohen interesat…
                </p>
              )}
              {!interests.isLoading && (interests.data?.length ?? 0) === 0 && (
                <div className="card-elevated p-10 text-center text-sm text-muted-foreground">
                  Asnjë interes ende.
                </div>
              )}

              {(interests.data ?? []).map((it) => (
                <article key={it.id} className="card-elevated p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold">
                      {it.role === "seller" ? "Blerës" : "Shitës"}: {it.counterpartName}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-input px-2 py-0.5 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" /> {hoursLeft(it.expiresAt)}h nga 24 · {it.status}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{it.postBody}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Çmimi: {formatLek(it.postPrice)}
                    {it.offerPrice != null && ` · Propozim: ${formatLek(it.offerPrice)}`}
                  </p>
                  {it.note && <p className="mt-1 text-xs text-muted-foreground">“{it.note}”</p>}

                  {it.role === "seller" && !it.taxPaid && it.status !== "expired" && (
                    <button
                      disabled={payMut.isPending}
                      onClick={() => payMut.mutate(it.id)}
                      className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                    >
                      {payMut.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <HandCoins className="h-4 w-4" />
                      )}
                      Paguaj taksën e shërbimit ({formatLek(it.taxAmount ?? 0)}) dhe hap bisedën
                    </button>
                  )}

                  {it.role === "buyer" && !it.taxPaid && (
                    <p className="mt-4 rounded-md bg-input/50 p-3 text-xs text-muted-foreground">
                      Në pritje që shitësi të hapë bisedën.
                    </p>
                  )}

                  {it.chatOpen && (
                    <div className="mt-4 rounded-lg border border-border bg-input/40 p-3">
                      <div className="mb-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MessageCircle className="h-3.5 w-3.5" /> Bisedë
                      </div>
                      <div className="max-h-48 space-y-2 overflow-y-auto">
                        {it.messages.map((m) => (
                          <div
                            key={m.id}
                            className={`rounded px-3 py-2 text-xs ${
                              m.senderId === session.user.id
                                ? "bg-primary/15 text-foreground"
                                : "bg-background text-muted-foreground"
                            }`}
                          >
                            {m.body}
                          </div>
                        ))}
                        {it.messages.length === 0 && (
                          <p className="text-xs text-muted-foreground">Asnjë mesazh ende.</p>
                        )}
                      </div>
                      <div className="mt-3 flex gap-2">
                        <input
                          value={drafts[it.id] ?? ""}
                          onChange={(e) => setDrafts((d) => ({ ...d, [it.id]: e.target.value }))}
                          placeholder="Shkruaj mesazh (pa kontakt)…"
                          className="flex-1 rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                        />
                        <button
                          disabled={!drafts[it.id]?.trim() || msgMut.isPending}
                          onClick={() =>
                            msgMut.mutate({ id: it.id, body: (drafts[it.id] ?? "").trim() })
                          }
                          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

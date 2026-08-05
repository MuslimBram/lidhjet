import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  ShieldCheck,
  ArrowLeft,
  Check,
  X,
  Bot,
  AlertTriangle,
  Lock,
  Users,
  Loader2,
  Clock,
  Ban,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  listPendingProfiles,
  listAllProfiles,
  decideProfile,
} from "@/lib/moderation.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Lidhjet" },
      {
        name: "description",
        content: "Rishikim manual i llogarive në pritje, rreziku AI dhe shkeljet e përdoruesve.",
      },
      { property: "og:title", content: "Admin — Lidhjet" },
      { property: "og:description", content: "Moderim i llogarive dhe shkeljeve në Lidhjet." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

function riskTone(r: number) {
  if (r >= 70) return "bg-destructive/15 text-destructive ring-1 ring-destructive/40";
  if (r >= 40)
    return "bg-[color:var(--color-warning)]/15 text-[color:var(--color-warning)] ring-1 ring-[color:var(--color-warning)]/40";
  return "bg-[color:var(--color-success)]/15 text-[color:var(--color-success)] ring-1 ring-[color:var(--color-success)]/40";
}

function hoursLeft(iso: string) {
  return Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 3_600_000));
}

function AdminPage() {
  const { session, role, loading } = useAuth();
  const isStaff = role === "owner" || role === "admin";
  const qc = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchPending = useServerFn(listPendingProfiles);
  const fetchAll = useServerFn(listAllProfiles);
  const decide = useServerFn(decideProfile);

  const pending = useQuery({
    queryKey: ["admin", "pending"],
    queryFn: () => fetchPending(),
    enabled: isStaff,
  });
  const all = useQuery({
    queryKey: ["admin", "profiles"],
    queryFn: () => fetchAll(),
    enabled: isStaff,
  });

  const decideMut = useMutation({
    mutationFn: (v: { id: string; approve: boolean }) => decide({ data: v }),
    onSuccess: () => {
      setActionError(null);
      void qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: unknown) =>
      setActionError(e instanceof Error ? e.message : "Vendimi nuk u regjistrua."),
  });

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Kryefaqja
          </Link>
          <Link to="/" className="flex items-center gap-2 text-lg font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="h-4 w-4" />
            </span>
            Lidhjet · Admin
          </Link>
          <span className="rounded-md border border-border bg-input px-2 py-1.5 text-xs text-muted-foreground">
            Roli: {role}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {loading && (
          <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Po ngarkohet…
          </p>
        )}

        {!loading && !session && (
          <div className="card-elevated p-8 text-center">
            <Lock className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              Duhet të jesh i identifikuar për të hapur panelin.
            </p>
            <Link
              to="/auth"
              className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Hyr
            </Link>
          </div>
        )}

        {!loading && session && !isStaff && (
          <div className="card-elevated p-8 text-center">
            <Lock className="mx-auto h-6 w-6 text-[color:var(--color-warning)]" />
            <p className="mt-3 text-sm text-muted-foreground">
              Detajet e të regjistruarve (email, telefon, oferta) shfaqen vetëm për Owner dhe Admin.
            </p>
          </div>
        )}

        {isStaff && (
          <>
            <h1 className="text-xl font-semibold">
              Llogari në pritje ({pending.data?.length ?? 0})
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Rreziku AI (0–100) dhe shënimet automatike ruhen në bazë për audit. Vendimi final është
              i njeriut.
            </p>

            {actionError && (
              <p className="mt-3 rounded-md bg-destructive/10 p-3 text-xs text-destructive">
                {actionError}
              </p>
            )}
            {pending.isError && (
              <p className="mt-3 rounded-md bg-destructive/10 p-3 text-xs text-destructive">
                {(pending.error as Error).message}
              </p>
            )}

            <div className="mt-6 space-y-4">
              {pending.isLoading && (
                <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Po lexohen profilet…
                </p>
              )}

              {(pending.data ?? []).map((u) => (
                <div key={u.id} className="card-elevated p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold">
                          {u.fullName || "(pa emër)"}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${riskTone(u.aiRisk)}`}
                        >
                          <Bot className="h-3 w-3" /> Rrezik {u.aiRisk}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-input px-2 py-0.5 text-[11px] text-muted-foreground">
                          <Clock className="h-3 w-3" /> {hoursLeft(u.reviewEndsAt)}h nga 24
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {u.email ?? "—"} · {u.phone ?? "—"} · {u.offerType} ·{" "}
                        {new Date(u.createdAt).toLocaleString("sq-AL")} · status:{" "}
                        {u.verificationStatus}
                      </div>

                      {u.aiNotes.length > 0 && (
                        <ul className="mt-3 space-y-1 text-sm">
                          {u.aiNotes.map((n, i) => (
                            <li key={i} className="flex items-start gap-2 text-muted-foreground">
                              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                              <span>{n}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        disabled={decideMut.isPending}
                        onClick={() => decideMut.mutate({ id: u.id, approve: true })}
                        className="inline-flex items-center gap-1.5 rounded-md bg-[color:var(--color-success)]/15 px-3 py-2 text-sm font-medium text-[color:var(--color-success)] hover:bg-[color:var(--color-success)]/25 disabled:opacity-50"
                      >
                        <Check className="h-4 w-4" /> Mirato
                      </button>
                      <button
                        disabled={decideMut.isPending}
                        onClick={() => decideMut.mutate({ id: u.id, approve: false })}
                        className="inline-flex items-center gap-1.5 rounded-md bg-destructive/15 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/25 disabled:opacity-50"
                      >
                        <X className="h-4 w-4" /> Refuzo
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {!pending.isLoading && (pending.data?.length ?? 0) === 0 && (
                <div className="card-elevated p-10 text-center text-sm text-muted-foreground">
                  S'ka llogari për t'u shqyrtuar.
                </div>
              )}
            </div>

            <section className="mt-10">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Users className="h-4 w-4 text-primary" /> Të regjistruar ({all.data?.length ?? 0})
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Regjistri i plotë me statusin e verifikimit, pezullimet dhe shkeljet e regjistruara.
              </p>
              {all.isError && (
                <p className="mt-3 rounded-md bg-destructive/10 p-3 text-xs text-destructive">
                  {(all.error as Error).message}
                </p>
              )}
              <div className="card-elevated mt-3 divide-y divide-border/60">
                {all.isLoading && (
                  <p className="p-5 text-sm text-muted-foreground">Po lexohet regjistri…</p>
                )}
                {!all.isLoading && (all.data?.length ?? 0) === 0 && (
                  <p className="p-5 text-sm text-muted-foreground">Asnjë profil në bazë.</p>
                )}
                {(all.data ?? []).map((u) => {
                  const suspended =
                    !!u.suspendedUntil && new Date(u.suspendedUntil).getTime() > Date.now();
                  return (
                    <div key={u.id} className="p-4 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">
                          {u.fullName || "(pa emër)"}
                          {suspended && (
                            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] text-destructive">
                              <Ban className="h-3 w-3" /> pezulluar deri{" "}
                              {new Date(u.suspendedUntil!).toLocaleDateString("sq-AL")}
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {u.email ?? "—"} · {u.phone ?? "—"} · {u.offerType} ·{" "}
                          {u.verificationStatus} · rrezik {u.aiRisk} ·{" "}
                          {new Date(u.createdAt).toLocaleString("sq-AL")}
                        </span>
                      </div>
                      {u.violations.length > 0 && (
                        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                          {u.violations.map((v, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-destructive" />
                              <span>
                                [{v.kind}] {v.reason} ·{" "}
                                {new Date(v.createdAt).toLocaleString("sq-AL")}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, ArrowLeft, Check, X, Bot, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Lidhjet" },
      { name: "description", content: "Rishikim manual i llogarive në pritje." },
    ],
  }),
  component: AdminPage,
});

interface Pending {
  id: string;
  name: string;
  contact: string;
  offer: string;
  aiRisk: number;
  aiNotes: string[];
  createdHoursAgo: number;
}

const SEED: Pending[] = [
  {
    id: "u1",
    name: "Genti Basha",
    contact: "genti.basha@example.com",
    offer: "Shërbim — Elektricist në Tiranë",
    aiRisk: 12,
    aiNotes: ["Emër konsistent", "Domain email jo i përkohshëm", "Foto profili OK"],
    createdHoursAgo: 18,
  },
  {
    id: "u2",
    name: "X Y",
    contact: "temp8391@mailinator.com",
    offer: "Tregti — nuk specifikuar",
    aiRisk: 87,
    aiNotes: [
      "Domain email i njohur si i përkohshëm (mailinator)",
      "Emër shumë i shkurtër / iniciale",
      "Kategori pa detaje",
    ],
    createdHoursAgo: 3,
  },
  {
    id: "u3",
    name: "Anila Krasniqi",
    contact: "+383 44 123 456",
    offer: "Punë — përkthyese SQ/EN",
    aiRisk: 24,
    aiNotes: ["Numër me operator të njohur", "Emër i plotë", "Përshkrim i detajuar"],
    createdHoursAgo: 25,
  },
];

function riskTone(r: number) {
  if (r >= 70) return "bg-destructive/15 text-destructive ring-1 ring-destructive/40";
  if (r >= 40)
    return "bg-[color:var(--color-warning)]/15 text-[color:var(--color-warning)] ring-1 ring-[color:var(--color-warning)]/40";
  return "bg-[color:var(--color-success)]/15 text-[color:var(--color-success)] ring-1 ring-[color:var(--color-success)]/40";
}

function AdminPage() {
  const [items, setItems] = useState<Pending[]>(SEED);

  function decide(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Kryefaqja
          </Link>
          <Link to="/" className="flex items-center gap-2 text-lg font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="h-4 w-4" />
            </span>
            Lidhjet · Admin
          </Link>
          <span className="w-16" />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Llogari në pritje ({items.length})</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Kontrolli AI (rrezik 0–100) + shënime automatike. Vendimi final është i njeriut.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {items.map((u) => (
            <div key={u.id} className="card-elevated p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold">{u.name}</h3>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${riskTone(u.aiRisk)}`}
                    >
                      <Bot className="h-3 w-3" /> Rrezik {u.aiRisk}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {u.contact} · {u.offer} · {u.createdHoursAgo}h më parë
                  </div>
                  <ul className="mt-3 space-y-1 text-sm">
                    {u.aiNotes.map((n, i) => (
                      <li key={i} className="flex items-start gap-2 text-muted-foreground">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        <span>{n}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => decide(u.id)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-[color:var(--color-success)]/15 px-3 py-2 text-sm font-medium text-[color:var(--color-success)] hover:bg-[color:var(--color-success)]/25"
                  >
                    <Check className="h-4 w-4" /> Mirato
                  </button>
                  <button
                    onClick={() => decide(u.id)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-destructive/15 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/25"
                  >
                    <X className="h-4 w-4" /> Refuzo
                  </button>
                </div>
              </div>
            </div>
          ))}

          {items.length === 0 && (
            <div className="card-elevated p-10 text-center text-sm text-muted-foreground">
              S'ka llogari për t'u shqyrtuar.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

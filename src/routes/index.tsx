import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Smartphone,
  Mail,
  Bot,
  ShieldCheck,
  UserCheck,
  ClipboardList,
  FileText,
  Hourglass,
  Lock,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lidhjet — Platformë e sigurt me AI & 2FA" },
      {
        name: "description",
        content:
          "Rrjet i besueshëm për pune, shërbime dhe tregti — me verifikim AI, 2FA dhe kontroll 24-orësh të llogarive.",
      },
      { property: "og:title", content: "Lidhjet — Platformë e sigurt" },
      {
        property: "og:description",
        content:
          "Rrjet i besueshëm me mbrojtje AI, 2FA dhe verifikim 24 orësh.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const features = [
  {
    icon: Smartphone,
    title: "Regjistrim me Telefon",
    desc: "Verifikim SMS + 2FA",
  },
  {
    icon: Mail,
    title: "Regjistrim me Email",
    desc: "Verifikim email + 2FA",
  },
  {
    icon: Bot,
    title: "Kontroll AI",
    desc: "Email/numra të përkohshëm",
  },
  {
    icon: ShieldCheck,
    title: "Skanim Maluer",
    desc: "PDF, DOC, ZIP, foto, link",
  },
  {
    icon: UserCheck,
    title: "Emër i Vërtetë",
    desc: "Pa iniciale, numra, simbole",
  },
  {
    icon: ClipboardList,
    title: "Kategori Ofertash",
    desc: "Punë, shërbim, tregti",
  },
];

const steps = [
  { icon: FileText, title: "Regjistrim", desc: "Email/Tel + 2FA", tone: "primary" },
  { icon: Bot, title: "Kontroll AI", desc: "Emër, email, numër", tone: "accent" },
  { icon: Hourglass, title: "Pritje 24h", desc: "Analizë e thelluar", tone: "warning" },
  { icon: Lock, title: "2FA Final", desc: "Miratim përfundimtar", tone: "muted" },
  { icon: CheckCircle2, title: "Aktiv", desc: "Posto & komento", tone: "success" },
];

function toneClass(t: string) {
  switch (t) {
    case "primary":
      return "bg-primary/15 text-primary ring-1 ring-primary/30";
    case "accent":
      return "bg-accent/15 text-accent ring-1 ring-accent/30";
    case "warning":
      return "bg-[color:var(--color-warning)]/15 text-[color:var(--color-warning)] ring-1 ring-[color:var(--color-warning)]/30";
    case "success":
      return "bg-[color:var(--color-success)]/15 text-[color:var(--color-success)] ring-1 ring-[color:var(--color-success)]/30";
    default:
      return "bg-muted text-muted-foreground ring-1 ring-border";
  }
}

function Home() {
  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 text-lg font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="h-4 w-4" />
            </span>
            Lidhjet
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <a href="#karakteristikat" className="text-muted-foreground hover:text-foreground">
              Karakteristikat
            </a>
            <a href="#siguria" className="text-muted-foreground hover:text-foreground">
              Siguria
            </a>
            <Link
              to="/"
              className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Regjistrohu
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-12 text-center">
        <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Verifikim AI + 2FA për çdo anëtar
        </div>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          Rrjet i besueshëm për <span className="text-primary">punë, shërbime dhe tregti</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">
          Çdo llogari verifikohet nga AI për email/numra të përkohshëm dhe emra të dyshimtë.
          24 orë analizë e thelluar përpara aktivizimit. Një postim në ditë, komente të pakufizuara.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            to="/"
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)] transition-colors hover:bg-primary/90"
          >
            Fillo tani
          </Link>
          <a
            href="#siguria"
            className="rounded-lg border border-border bg-surface px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-elevated"
          >
            Si funksionon
          </a>
        </div>
      </section>

      {/* Features */}
      <section id="karakteristikat" className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Karakteristikat kryesore
        </h2>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="card-elevated group p-6 transition-transform hover:-translate-y-0.5"
            >
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Security path */}
      <section id="siguria" className="mx-auto max-w-6xl px-6 py-12">
        <div className="card-elevated p-8">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Rruga e sigurisë (24h)
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
            {steps.map((s, i) => (
              <div key={s.title} className="relative flex flex-col items-center text-center">
                <div
                  className={`grid h-14 w-14 place-items-center rounded-full ${toneClass(s.tone)}`}
                >
                  <s.icon className="h-6 w-6" />
                </div>
                <div className="mt-3 text-sm font-semibold">{s.title}</div>
                <div className="text-xs text-muted-foreground">{s.desc}</div>
                {i < steps.length - 1 && (
                  <div className="pointer-events-none absolute right-[-50%] top-7 hidden h-px w-full bg-gradient-to-r from-border to-transparent lg:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="mt-8 border-t border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-6 text-center text-xs text-muted-foreground">
          Lidhjet © 2026 — Platformë e sigurt me mbrojtje AI & verifikim dy-faktorësh
        </div>
      </footer>
    </div>
  );
}

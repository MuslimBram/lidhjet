import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Smartphone, ShieldCheck, ArrowLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Regjistrim & Hyrje — Lidhjet" },
      {
        name: "description",
        content:
          "Regjistrohu me email ose telefon. Verifikim me 2FA dhe kontroll AI për siguri maksimale.",
      },
      { property: "og:title", content: "Regjistrim & Hyrje — Lidhjet" },
      {
        property: "og:description",
        content: "Regjistrohu me email ose telefon dhe 2FA.",
      },
    ],
  }),
  component: AuthPage,
});

type Method = "email" | "phone";
type Step = "identify" | "otp" | "profile" | "done";

function AuthPage() {
  const [method, setMethod] = useState<Method>("email");
  const [step, setStep] = useState<Step>("identify");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [fullName, setFullName] = useState("");
  const [offerType, setOfferType] = useState("pune");
  const [offerDetails, setOfferDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function next() {
    setError(null);
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (step === "identify") {
        if (!identifier) return setError("Plotësoni fushën.");
        setStep("otp");
      } else if (step === "otp") {
        if (otp.length < 6) return setError("Kodi duhet të ketë 6 shifra.");
        setStep("profile");
      } else if (step === "profile") {
        if (fullName.trim().split(/\s+/).length < 2)
          return setError(
            "Ju lutem shkruani emrin dhe mbiemrin e plotë (pa iniciale ose numra).",
          );
        setStep("done");
      }
    }, 500);
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Kthehu
          </Link>
          <Link to="/" className="flex items-center gap-2 text-lg font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="h-4 w-4" />
            </span>
            Lidhjet
          </Link>
          <span className="w-16" />
        </div>
      </header>

      <main className="mx-auto flex max-w-md flex-col px-6 py-10">
        {step !== "done" && (
          <>
            <h1 className="text-2xl font-bold tracking-tight">Krijo llogari të sigurt</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Verifikim 2FA i menjëhershëm + kontroll AI për email/numra të përkohshëm.
            </p>

            {/* Stepper */}
            <ol className="mt-6 flex items-center gap-2 text-xs">
              {(["identify", "otp", "profile"] as Step[]).map((s, i) => {
                const active = step === s;
                const done =
                  (step === "otp" && s === "identify") ||
                  (step === "profile" && (s === "identify" || s === "otp"));
                return (
                  <li
                    key={s}
                    className={`flex-1 rounded-md border px-2 py-1.5 text-center ${
                      active
                        ? "border-primary bg-primary/15 text-primary"
                        : done
                          ? "border-[color:var(--color-success)]/40 bg-[color:var(--color-success)]/10 text-[color:var(--color-success)]"
                          : "border-border text-muted-foreground"
                    }`}
                  >
                    {i + 1}. {s === "identify" ? "Identifikim" : s === "otp" ? "2FA" : "Profili"}
                  </li>
                );
              })}
            </ol>

            <div className="card-elevated mt-6 p-6">
              {step === "identify" && (
                <>
                  <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg bg-input p-1">
                    <button
                      onClick={() => setMethod("email")}
                      className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        method === "email"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Mail className="h-4 w-4" /> Email
                    </button>
                    <button
                      onClick={() => setMethod("phone")}
                      className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        method === "phone"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Smartphone className="h-4 w-4" /> Telefon
                    </button>
                  </div>
                  <label className="text-sm font-medium">
                    {method === "email" ? "Adresa e email-it" : "Numri i telefonit"}
                  </label>
                  <input
                    type={method === "email" ? "email" : "tel"}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={method === "email" ? "ju@example.com" : "+355 6X XXX XXXX"}
                    className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none ring-primary/40 focus:ring-2"
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    AI kontrollon nëse është email/numër i përkohshëm.
                  </p>
                </>
              )}

              {step === "otp" && (
                <>
                  <label className="text-sm font-medium">Kodi 2FA (6 shifra)</label>
                  <input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    inputMode="numeric"
                    placeholder="123456"
                    className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-center text-lg tracking-[0.5em] outline-none ring-primary/40 focus:ring-2"
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Kodi u dërgua në {identifier}. (Demo: fut çdo 6 shifra.)
                  </p>
                </>
              )}

              {step === "profile" && (
                <>
                  <label className="text-sm font-medium">Emri i plotë (i vërtetë)</label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Emri Mbiemri"
                    className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none ring-primary/40 focus:ring-2"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Pa iniciale, numra apo simbole të çuditshme.
                  </p>

                  <label className="mt-4 block text-sm font-medium">Cfarë ofron?</label>
                  <select
                    value={offerType}
                    onChange={(e) => setOfferType(e.target.value)}
                    className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="pune">Punë</option>
                    <option value="sherbim">Shërbim</option>
                    <option value="tregti">Tregti</option>
                    <option value="tjeter">Tjetër</option>
                  </select>

                  <label className="mt-4 block text-sm font-medium">Detaje të shkurtra</label>
                  <textarea
                    value={offerDetails}
                    onChange={(e) => setOfferDetails(e.target.value)}
                    rows={3}
                    placeholder="P.sh. Elektricist në Tiranë, 8 vite eksperiencë…"
                    className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </>
              )}

              {error && (
                <p className="mt-3 rounded-md bg-destructive/15 px-3 py-2 text-xs text-destructive">
                  {error}
                </p>
              )}

              <button
                onClick={next}
                disabled={loading}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {step === "identify" ? "Dërgo kodin 2FA" : step === "otp" ? "Verifiko" : "Përfundo"}
              </button>
            </div>
          </>
        )}

        {step === "done" && (
          <div className="card-elevated p-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[color:var(--color-warning)]/15 text-[color:var(--color-warning)] ring-1 ring-[color:var(--color-warning)]/30">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">Llogaria u dërgua për verifikim</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              AI po analizon emrin, email-in dhe të dhënat. Pas 24 orësh do të kërkohet 2FA
              përfundimtar përpara aktivizimit.
            </p>
            <Link
              to="/feed"
              className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Shiko feed-in publik
            </Link>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Backend (Lovable Cloud) është i pa aktivizuar — ky demo tregon flow-n; verifikimi real
          aktivizohet me kredite.
        </p>
      </main>
    </div>
  );
}

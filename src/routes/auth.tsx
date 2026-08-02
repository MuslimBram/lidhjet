import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, Smartphone, ShieldCheck, ArrowLeft, Loader2, BellRing } from "lucide-react";
import {
  createChallenge,
  getChallenge,
  verifyCode,
  canResend,
  clearChallenge,
  OTP_MAX_ATTEMPTS,
  type OtpChallenge,
} from "@/lib/otp";
import { ensureNotificationPermission, notifyUser } from "@/lib/notify";
import { registerUser, setCurrentUserByIdentifier, getUsers } from "@/lib/users";

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
type Mode = "register" | "login";
type Step = "identify" | "otp" | "profile" | "done";

function validateFullName(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 && parts.every((p) => p.length >= 2 && /^[\p{L}'’-]+$/u.test(p));
}

function AuthPage() {
  const [mode, setMode] = useState<Mode>("register");
  const [method, setMethod] = useState<Method>("email");
  const [step, setStep] = useState<Step>("identify");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [fullName, setFullName] = useState("");
  const [offerType, setOfferType] = useState("pune");
  const [offerDetails, setOfferDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showClarify, setShowClarify] = useState(false);
  const [tempName, setTempName] = useState("");
  const [tempError, setTempError] = useState<string | null>(null);

  function switchMode(next: Mode) {
    setMode(next);
    setStep("identify");
    setError(null);
    setOtp("");
  }

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
        if (mode === "login") {
          setStep("done");
        } else {
          setStep("profile");
        }
      } else if (step === "profile") {
        if (!validateFullName(fullName)) {
          setTempName(fullName);
          setTempError(null);
          setShowClarify(true);
          return;
        }
        setStep("done");
      }
    }, 500);
  }

  function saveClarified() {
    if (!validateFullName(tempName)) {
      setTempError("Ju lutemi vendosni Emrin dhe Mbiemrin e plotë (pa iniciale, numra ose simbole).");
      return;
    }
    setFullName(tempName.trim().replace(/\s+/g, " "));
    setShowClarify(false);
    setStep("done");
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
            <h1 className="text-2xl font-bold tracking-tight">
              {mode === "register" ? "Krijo llogari të sigurt" : "Hyr në llogarinë tënde"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "register"
                ? "Verifikim 2FA i menjëhershëm + kontroll AI për email/numra të përkohshëm."
                : "Fut email-in ose numrin dhe kodin 2FA për të hyrë."}
            </p>

            {/* Mode toggle: Regjistrohu / Hyr */}
            <div className="mt-5 grid grid-cols-2 gap-2 rounded-lg bg-input p-1">
              <button
                onClick={() => switchMode("register")}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  mode === "register"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Regjistrohu
              </button>
              <button
                onClick={() => switchMode("login")}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  mode === "login"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Kam llogari — Hyr
              </button>
            </div>

            {/* Stepper */}
            <ol className="mt-6 flex items-center gap-2 text-xs">
              {((mode === "register"
                ? ["identify", "otp", "profile"]
                : ["identify", "otp"]) as Step[]).map((s, i) => {
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
                {step === "identify"
                  ? "Dërgo kodin 2FA"
                  : step === "otp"
                    ? mode === "login"
                      ? "Hyr"
                      : "Verifiko"
                    : "Përfundo"}
              </button>
            </div>
          </>
        )}

        {step === "done" && (
          <div className="card-elevated p-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[color:var(--color-warning)]/15 text-[color:var(--color-warning)] ring-1 ring-[color:var(--color-warning)]/30">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">
              {mode === "login" ? "Hyrja u konfirmua" : "Llogaria u dërgua për verifikim"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "login"
                ? "2FA u verifikua. Mund të kaloni në feed."
                : "AI po analizon emrin, email-in dhe të dhënat. Pas 24 orësh do të kërkohet 2FA përfundimtar përpara aktivizimit."}
            </p>
            <Link
              to="/feed"
              className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {mode === "login" ? "Vazhdo në feed" : "Shiko feed-in publik"}
            </Link>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Backend (Lovable Cloud) është i pa aktivizuar — ky demo tregon flow-n; verifikimi real
          aktivizohet me kredite.
        </p>
      </main>

      {showClarify && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="card-elevated w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-destructive">Sqaro emrin!</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Emri duket i shkurtër ose i paplotë. Shkruani <strong>Emrin dhe Mbiemrin</strong> (të
              paktën 2 fjalë, pa iniciale, numra ose simbole).
            </p>
            <input
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder="P.sh. Arben Hoxha"
              className="mt-4 w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
            {tempError && (
              <p className="mt-2 rounded-md bg-destructive/15 px-3 py-2 text-xs text-destructive">
                {tempError}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowClarify(false)}
                className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Anulo
              </button>
              <button
                onClick={saveClarified}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Ruaj dhe vazhdo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

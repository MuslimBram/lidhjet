import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth_/callback")({
  head: () => ({
    meta: [
      { title: "Duke konfirmuar hyrjen — Lidhjet" },
      { name: "description", content: "Konfirmimi i sigurt i hyrjes në Lidhjet." },
      { property: "og:title", content: "Duke konfirmuar hyrjen — Lidhjet" },
      { property: "og:description", content: "Konfirmimi i sigurt i hyrjes në Lidhjet." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function finishSignIn() {
      const params = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const authError = params.get("error_description") ?? hash.get("error_description");
      if (authError) {
        if (active) setError(decodeURIComponent(authError.replace(/\+/g, " ")));
        return;
      }

      const code = params.get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError && !/code verifier/i.test(exchangeError.message)) {
          if (active) setError(exchangeError.message);
          return;
        }
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!active) return;
      if (sessionError || !data.session) {
        setError("Linku nuk krijoi një sesion. Kërkoni një link të ri dhe hapeni në të njëjtin shfletues.");
        return;
      }

      await navigate({ to: "/feed", replace: true });
    }

    void finishSignIn();
    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="card-elevated w-full max-w-md p-8 text-center">
        {error ? (
          <>
            <ShieldCheck className="mx-auto h-9 w-9 text-destructive" />
            <h1 className="mt-4 text-xl font-semibold">Hyrja nuk u konfirmua</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <Link
              to="/auth"
              className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Kërko link të ri
            </Link>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <h1 className="mt-4 text-xl font-semibold">Po konfirmojmë hyrjen…</h1>
            <p className="mt-2 text-sm text-muted-foreground">Prisni pak; do të kaloni automatikisht në feed.</p>
          </>
        )}
      </div>
    </main>
  );
}
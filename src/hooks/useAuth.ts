import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Role } from "@/lib/roles";

export interface Profile {
  id: string;
  full_name: string;
  offer_type: string;
  phone: string | null;
  email: string | null;
  verification_status: string;
  ai_risk_score: number;
  ai_notes: string | null;
  approved_at: string | null;
  review_ends_at: string;
  notifications_enabled: boolean;
  notification_mode: string;
  suspended_until: string | null;
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<Role>("user");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (userId: string) => {
    const [{ data: p }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    setProfile((p as Profile | null) ?? null);
    const list = (roles ?? []).map((r) => r.role as Role);
    setRole(list.includes("owner") ? "owner" : list.includes("admin") ? "admin" : "user");
  }, []);

  useEffect(() => {
    let alive = true;
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!alive) return;
      setSession(s);
      if (s?.user) void load(s.user.id);
      else {
        setProfile(null);
        setRole("user");
      }
    });
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      setSession(data.session);
      if (data.session?.user) await load(data.session.user.id);
      setLoading(false);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [load]);

  const refresh = useCallback(async () => {
    if (session?.user) await load(session.user.id);
  }, [session, load]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const isSuspended =
    !!profile?.suspended_until && new Date(profile.suspended_until).getTime() > Date.now();

  return { session, user: session?.user ?? null, profile, role, loading, isSuspended, refresh, signOut };
}

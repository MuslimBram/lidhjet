import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface PendingProfile {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  offerType: string;
  aiRisk: number;
  aiNotes: string[];
  createdAt: string;
  reviewEndsAt: string;
  verificationStatus: string;
}

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface AiVerdict {
  risk: number;
  notes: string[];
  questions: string[];
}

async function assess(input: {
  fullName: string;
  email: string | null;
  phone: string | null;
  offerType: string;
}): Promise<AiVerdict> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Mungon konfigurimi i AI.");

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({
      model: "openai/gpt-5.6-sol",
      reasoning_effort: "none",
      messages: [
        {
          role: "system",
          content:
            "Ti vlerëson rrezikun e regjistrimeve në një platformë shqiptare. Kontrollo: " +
            "email/numër i përkohshëm (mailinator, temp-mail, guerrillamail, yopmail, 10minutemail etc.), " +
            "emër i shkurtër/inicialë/numra/karaktere të çuditshme, mospërputhje midis emrit dhe emailit, " +
            "operator telefonik i panjohur ose format i pavlefshëm, dhe përshkrim oferte i pa specifikuar. " +
            "Kthe VETËM JSON: {\"risk\": 0-100, \"notes\": [\"...\"], \"questions\": [\"...\"]}. " +
            "notes dhe questions në shqip. questions = pyetje sqaruese kur ka dyshime (pse ke këtë email/numër, " +
            "pse ky emër prezantimi), bosh kur rreziku është i ulët.",
        },
        {
          role: "user",
          content: JSON.stringify(input),
        },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (res.status === 429) throw new Error("Shumë kërkesa te AI — provoni pas pak.");
  if (res.status === 402) throw new Error("Kreditet e AI kanë përfunduar.");
  if (!res.ok) throw new Error(`AI gabim: ${res.status} ${await res.text()}`);

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = json.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as Partial<AiVerdict>;
  return {
    risk: Math.max(0, Math.min(100, Math.round(Number(parsed.risk ?? 50)))),
    notes: Array.isArray(parsed.notes) ? parsed.notes.map(String).slice(0, 8) : [],
    questions: Array.isArray(parsed.questions) ? parsed.questions.map(String).slice(0, 4) : [],
  };
}

/** AI check of the signed-in user's own registration data (runs right after signup). */
export const assessMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("full_name, email, phone, offer_type")
      .eq("id", userId)
      .maybeSingle();
    if (error || !profile) throw new Error("Profili nuk u gjet.");

    const verdict = await assess({
      fullName: profile.full_name,
      email: profile.email,
      phone: profile.phone,
      offerType: profile.offer_type,
    });

    await supabase
      .from("profiles")
      .update({
        ai_risk_score: verdict.risk,
        ai_notes: [...verdict.notes, ...verdict.questions.map((q) => `Pyetje: ${q}`)].join("\n"),
        verification_status: verdict.risk >= 70 ? "review" : "pending",
      })
      .eq("id", userId);

    return verdict;
  });

async function assertStaff(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
  if (error || data !== true) throw new Error("Vetëm Owner/Admin.");
}

export const listPendingProfiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PendingProfile[]> => {
    await assertStaff(context);
    const { data, error } = await context.supabase
      .from("profiles")
      .select("*")
      .in("verification_status", ["pending", "review"])
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((p) => ({
      id: p.id,
      fullName: p.full_name,
      email: p.email,
      phone: p.phone,
      offerType: p.offer_type,
      aiRisk: p.ai_risk_score,
      aiNotes: (p.ai_notes ?? "").split("\n").filter(Boolean),
      createdAt: p.created_at,
      reviewEndsAt: p.review_ends_at,
      verificationStatus: p.verification_status,
    }));
  });

export const decideProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; approve: boolean }) => input)
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await context.supabase
      .from("profiles")
      .update({
        verification_status: data.approve ? "approved" : "rejected",
        approved_at: data.approve ? new Date().toISOString() : null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyRoleInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
    return { isStaff: data === true };
  });

export interface StaffProfileRow {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  offerType: string;
  verificationStatus: string;
  aiRisk: number;
  aiNotes: string[];
  createdAt: string;
  reviewEndsAt: string;
  approvedAt: string | null;
  suspendedUntil: string | null;
  violations: { kind: string; reason: string; createdAt: string }[];
}

/** Full registry of profiles + their violations. Owner/Admin only. */
export const listAllProfiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StaffProfileRow[]> => {
    await assertStaff(context);
    const [{ data: profiles, error }, { data: violations }] = await Promise.all([
      context.supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      context.supabase.from("violations").select("*").order("created_at", { ascending: false }),
    ]);
    if (error) throw new Error(error.message);
    return (profiles ?? []).map((p) => ({
      id: p.id,
      fullName: p.full_name,
      email: p.email,
      phone: p.phone,
      offerType: p.offer_type,
      verificationStatus: p.verification_status,
      aiRisk: p.ai_risk_score,
      aiNotes: (p.ai_notes ?? "").split("\n").filter(Boolean),
      createdAt: p.created_at,
      reviewEndsAt: p.review_ends_at,
      approvedAt: p.approved_at,
      suspendedUntil: p.suspended_until,
      violations: (violations ?? [])
        .filter((v: { user_id: string }) => v.user_id === p.id)
        .map((v: { kind: string; reason: string; created_at: string }) => ({
          kind: v.kind,
          reason: v.reason,
          createdAt: v.created_at,
        })),
    }));
  });

/** Status of the signed-in user's own 24h review window. */
export const getMyReviewStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("verification_status, review_ends_at, ai_risk_score, ai_notes, approved_at")
      .eq("id", context.userId)
      .maybeSingle();
    if (error || !data) throw new Error("Profili nuk u gjet.");
    return {
      status: data.verification_status,
      reviewEndsAt: data.review_ends_at,
      risk: data.ai_risk_score,
      notes: (data.ai_notes ?? "").split("\n").filter(Boolean),
      approvedAt: data.approved_at,
      expired: new Date(data.review_ends_at).getTime() <= Date.now(),
    };
  });

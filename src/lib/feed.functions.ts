import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { detectContact } from "@/lib/contactDetect";
import { checkPrice } from "@/lib/priceCheck";
import { calcServiceTax } from "@/lib/taxCalc";
import { jaccard, DUPLICATE_THRESHOLD } from "@/lib/similarity";

export type Category = "pune" | "sherbim" | "tregti" | "tjeter";

export interface FeedComment {
  id: string;
  authorId: string;
  author: string;
  body: string;
}

export interface FeedPost {
  id: string;
  authorId: string;
  authorFullName: string;
  offerType: Category;
  category: Category;
  body: string;
  price: number;
  createdAt: string;
  createdAtMs: number;
  rating: number;
  ratingCount: number;
  myRating: number | null;
  sales: number;
  comments: FeedComment[];
  attachments: string[];
  justification: string | null;
}

export interface FeedData {
  posts: FeedPost[];
  me: { id: string; fullName: string; suspendedUntil: string | null; violations: number };
}

const asCategory = (v: string | null): Category =>
  v === "pune" || v === "sherbim" || v === "tregti" ? v : "tjeter";

export const getFeed = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FeedData> => {
    const { supabase, userId } = context;

    const [posts, profiles, comments, ratings, attachments, myProfile, violations] =
      await Promise.all([
        supabase
          .from("posts")
          .select("*")
          .eq("status", "approved")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase.rpc("list_public_profiles"),
        supabase.from("comments").select("*").order("created_at", { ascending: true }),
        supabase.from("ratings").select("post_id, user_id, stars"),
        supabase.from("attachments").select("post_id, file_name"),
        supabase.from("profiles").select("full_name, suspended_until").eq("id", userId).maybeSingle(),
        supabase.from("violations").select("id").eq("user_id", userId),
      ]);

    if (posts.error) throw new Error(posts.error.message);

    const names = new Map<string, string>();
    for (const p of profiles.data ?? []) names.set(p.id, p.full_name || "Anëtar");

    const rows = posts.data ?? [];
    const list: FeedPost[] = rows.map((p) => {
      const rs = (ratings.data ?? []).filter((r) => r.post_id === p.id);
      const sum = rs.reduce((a, r) => a + r.stars, 0);
      const mine = rs.find((r) => r.user_id === userId);
      return {
        id: p.id,
        authorId: p.author_id,
        authorFullName: names.get(p.author_id) ?? "Anëtar",
        offerType: asCategory(p.offer_type),
        category: asCategory(p.category),
        body: p.body,
        price: Number(p.price),
        createdAt: p.created_at,
        createdAtMs: new Date(p.created_at).getTime(),
        rating: rs.length ? sum / rs.length : 0,
        ratingCount: rs.length,
        myRating: mine?.stars ?? null,
        sales: p.sales,
        comments: (comments.data ?? [])
          .filter((c) => c.post_id === p.id)
          .map((c) => ({
            id: c.id,
            authorId: c.author_id,
            author: names.get(c.author_id) ?? "Anëtar",
            body: c.body,
          })),
        attachments: (attachments.data ?? [])
          .filter((a) => a.post_id === p.id)
          .map((a) => a.file_name),
        justification: p.price_justification,
      };
    });

    return {
      posts: list,
      me: {
        id: userId,
        fullName: myProfile.data?.full_name ?? "",
        suspendedUntil: myProfile.data?.suspended_until ?? null,
        violations: (violations.data ?? []).length,
      },
    };
  });

interface CreatePostInput {
  body: string;
  category: Category;
  price: number;
  justification?: string;
  files?: { name: string; path: string; mime: string; size: number; verdict: string; notes?: string }[];
}

export const createPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CreatePostInput) => {
    if (!input || typeof input.body !== "string" || input.body.trim().length < 5) {
      throw new Error("Postimi duhet të ketë të paktën 5 karaktere.");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const body = data.body.trim();

    // 1) Contact info is never allowed in a public post.
    const hits = detectContact(body);
    if (hits.length > 0) {
      const reason = `Postimi përmban informacion kontakti (${hits
        .map((h) => h.label)
        .join(", ")}).`;
      await supabase.from("violations").insert({ user_id: userId, kind: "contact", reason });
      throw new Error(reason);
    }

    // 2) Price outside category norms requires a justification.
    const pc = checkPrice(data.price, data.category);
    if (!pc.ok && !data.justification?.trim()) {
      const reason = pc.reason ?? "Çmimi jashtë normave pa justifikim.";
      await supabase.from("violations").insert({ user_id: userId, kind: "price", reason });
      throw new Error(reason);
    }

    // 3) Deduplicate: drop the author's older near-identical posts.
    const { data: mine } = await supabase
      .from("posts")
      .select("id, body")
      .eq("author_id", userId);
    const dupes = (mine ?? []).filter((p) => jaccard(p.body, body) >= DUPLICATE_THRESHOLD);
    if (dupes.length > 0) {
      await supabase
        .from("posts")
        .delete()
        .in(
          "id",
          dupes.map((d) => d.id),
        );
    }

    const { data: created, error } = await supabase
      .from("posts")
      .insert({
        author_id: userId,
        body,
        category: data.category,
        offer_type: data.category,
        price: data.price,
        service_tax: calcServiceTax(data.price),
        price_justification: data.justification?.trim() ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    if (data.files?.length) {
      await supabase.from("attachments").insert(
        data.files.map((f) => ({
          post_id: created.id,
          owner_id: userId,
          storage_path: f.path,
          file_name: f.name,
          mime_type: f.mime,
          size_bytes: f.size,
          scan_verdict: f.verdict,
          scan_notes: f.notes ?? null,
        })),
      );
    }

    return { id: created.id, removedDuplicates: dupes.length };
  });

export const addComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { postId: string; body: string }) => {
    if (!input?.postId || !input?.body?.trim()) throw new Error("Komenti është bosh.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const body = data.body.trim();
    const hits = detectContact(body);
    if (hits.length > 0) {
      const reason = `Komenti përmban informacion kontakti (${hits
        .map((h) => h.label)
        .join(", ")}).`;
      await supabase.from("violations").insert({ user_id: userId, kind: "contact", reason });
      throw new Error(reason);
    }
    const { error } = await supabase
      .from("comments")
      .insert({ post_id: data.postId, author_id: userId, body });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const ratePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { postId: string; stars: number }) => {
    if (!input?.postId || input.stars < 1 || input.stars > 5) throw new Error("Vlerësim i pavlefshëm.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("ratings")
      .select("id")
      .eq("post_id", data.postId)
      .eq("user_id", userId)
      .maybeSingle();
    const res = existing
      ? await supabase.from("ratings").update({ stars: data.stars }).eq("id", existing.id)
      : await supabase
          .from("ratings")
          .insert({ post_id: data.postId, user_id: userId, stars: data.stars });
    if (res.error) throw new Error(res.error.message);
    return { ok: true };
  });

export const reportViolation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { kind: "contact" | "price"; reason: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase
      .from("violations")
      .insert({ user_id: userId, kind: data.kind, reason: data.reason });
    const { data: rows } = await supabase.from("violations").select("id").eq("user_id", userId);
    const { data: prof } = await supabase
      .from("profiles")
      .select("suspended_until")
      .eq("id", userId)
      .maybeSingle();
    return { count: (rows ?? []).length, suspendedUntil: prof?.suspended_until ?? null };
  });

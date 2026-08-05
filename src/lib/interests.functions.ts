import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { detectContact } from "@/lib/contactDetect";
import { calcServiceTax } from "@/lib/taxCalc";

export interface InterestMessage {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
}

export interface InterestRow {
  id: string;
  postId: string;
  postBody: string;
  postPrice: number;
  role: "buyer" | "seller";
  counterpartName: string;
  offerPrice: number | null;
  note: string | null;
  status: string;
  /** Only ever populated for the seller — buyers never learn the service tax. */
  taxAmount: number | null;
  taxPaid: boolean;
  chatOpen: boolean;
  expiresAt: string;
  createdAt: string;
  messages: InterestMessage[];
}

export interface AppNotification {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  readAt: string | null;
  createdAt: string;
}

function assertClean(text: string, label: string) {
  const hits = detectContact(text);
  if (hits.length > 0) {
    throw new Error(`${label} nuk mund të përmbajë kontakt (${hits.map((h) => h.label).join(", ")}).`);
  }
}

export const createInterest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { postId: string; offerPrice?: number | null; note?: string }) => {
    if (!input?.postId) throw new Error("Postimi mungon.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: post, error: postErr } = await supabase
      .from("posts")
      .select("id, author_id, price")
      .eq("id", data.postId)
      .maybeSingle();
    if (postErr || !post) throw new Error("Oferta nuk u gjet.");
    if (post.author_id === userId) throw new Error("Nuk mund të shprehni interes për ofertën tuaj.");

    const note = data.note?.trim() ?? "";
    if (note) assertClean(note, "Kërkesa");

    const price = Number(post.price);
    const offer =
      data.offerPrice != null && Number.isFinite(data.offerPrice) && data.offerPrice > 0
        ? Math.round(data.offerPrice)
        : null;
    if (offer != null && offer >= price) throw new Error("Propozimi duhet të jetë më i vogël se çmimi.");

    const { data: existing } = await supabase
      .from("interests")
      .select("id")
      .eq("post_id", data.postId)
      .eq("buyer_id", userId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("interests")
        .update({ offer_price: offer, note: note || null })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { id: existing.id, updated: true };
    }

    const { data: created, error } = await supabase
      .from("interests")
      .insert({
        post_id: data.postId,
        buyer_id: userId,
        seller_id: post.author_id,
        offer_price: offer,
        note: note || null,
        tax_amount: calcServiceTax(offer ?? price),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: created.id, updated: false };
  });

export const listMyInterests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<InterestRow[]> => {
    const { supabase, userId } = context;

    const { data: rows, error } = await supabase
      .from("interests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const list = rows ?? [];
    if (list.length === 0) return [];

    const [{ data: posts }, { data: profiles }, { data: messages }] = await Promise.all([
      supabase
        .from("posts")
        .select("id, body, price")
        .in("id", Array.from(new Set(list.map((r) => r.post_id)))),
      supabase.rpc("list_public_profiles"),
      supabase
        .from("interest_messages")
        .select("*")
        .in("interest_id", list.map((r) => r.id))
        .order("created_at", { ascending: true }),
    ]);

    const names = new Map<string, string>();
    for (const p of profiles ?? []) names.set(p.id, p.full_name || "Anëtar");
    const postMap = new Map((posts ?? []).map((p) => [p.id, p]));

    return list.map((r) => {
      const isSeller = r.seller_id === userId;
      const post = postMap.get(r.post_id);
      const chatOpen = r.tax_paid && (r.status === "open" || r.status === "chat");
      return {
        id: r.id,
        postId: r.post_id,
        postBody: post?.body ?? "(oferta u fshi)",
        postPrice: Number(post?.price ?? 0),
        role: isSeller ? "seller" : "buyer",
        counterpartName: names.get(isSeller ? r.buyer_id : r.seller_id) ?? "Anëtar",
        offerPrice: r.offer_price == null ? null : Number(r.offer_price),
        note: r.note,
        status: r.status,
        taxAmount: isSeller ? Number(r.tax_amount) : null,
        taxPaid: r.tax_paid,
        chatOpen,
        expiresAt: r.expires_at,
        createdAt: r.created_at,
        messages: chatOpen
          ? (messages ?? [])
              .filter((m) => m.interest_id === r.id)
              .map((m) => ({
                id: m.id,
                senderId: m.sender_id,
                body: m.body,
                createdAt: m.created_at,
              }))
          : [],
      };
    });
  });

/** The seller pays the service tax to unlock the chat with the interested buyer. */
export const payServiceTax = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { interestId: string }) => {
    if (!input?.interestId) throw new Error("Interesi mungon.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("interests")
      .select("id, seller_id, status, expires_at, tax_amount, tax_paid")
      .eq("id", data.interestId)
      .maybeSingle();
    if (error || !row) throw new Error("Interesi nuk u gjet.");
    if (row.seller_id !== userId) throw new Error("Vetëm shitësi paguan taksën e shërbimit.");
    if (new Date(row.expires_at).getTime() <= Date.now())
      throw new Error("Dritarja 24-orëshe skadoi.");
    if (row.tax_paid) return { ok: true, alreadyPaid: true };

    const { error: upErr } = await supabase
      .from("interests")
      .update({ tax_paid: true, tax_paid_at: new Date().toISOString(), status: "chat" })
      .eq("id", row.id);
    if (upErr) throw new Error(upErr.message);
    return { ok: true, alreadyPaid: false, amount: Number(row.tax_amount) };
  });

export const sendInterestMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { interestId: string; body: string }) => {
    if (!input?.interestId || !input?.body?.trim()) throw new Error("Mesazhi është bosh.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const body = data.body.trim();
    assertClean(body, "Mesazhi");

    const { data: row } = await supabase
      .from("interests")
      .select("id, buyer_id, seller_id, tax_paid, status, expires_at")
      .eq("id", data.interestId)
      .maybeSingle();
    if (!row) throw new Error("Biseda nuk u gjet.");
    if (!row.tax_paid) throw new Error("Biseda hapet pasi shitësi paguan taksën e shërbimit.");
    if (new Date(row.expires_at).getTime() <= Date.now())
      throw new Error("Dritarja 24-orëshe skadoi.");

    const { error } = await supabase
      .from("interest_messages")
      .insert({ interest_id: row.id, sender_id: userId, body });
    if (error) throw new Error(error.message);

    const other = row.buyer_id === userId ? row.seller_id : row.buyer_id;
    await supabase.from("notifications").insert({
      user_id: other,
      kind: "message",
      title: "Mesazh i re në bisedë",
      body: body.slice(0, 120),
    });
    return { ok: true };
  });

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AppNotification[]> => {
    const { data, error } = await context.supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []).map((n) => ({
      id: n.id,
      kind: n.kind,
      title: n.title,
      body: n.body,
      readAt: n.read_at,
      createdAt: n.created_at,
    }));
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", context.userId)
      .is("read_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

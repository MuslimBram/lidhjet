import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

export type AiImageVerdict = "clean" | "warning" | "blocked";

export interface AiImageScan {
  verdict: AiImageVerdict;
  reasons: string[];
  hasContact: boolean;
}

interface RawVerdict {
  has_contact?: boolean;
  unsafe?: boolean;
  reasons?: unknown;
}

/**
 * Server-side AI inspection of an image before it is published:
 * detects contact info baked into the picture (phone, email, social handles,
 * QR codes) and unsafe/illegal content. A contact hit is recorded as a
 * violation, so three attempts trigger the automatic 7-day suspension.
 */
export const scanImageAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { dataUrl: string; fileName: string }) => {
    if (!input?.dataUrl?.startsWith("data:image/")) throw new Error("Skedar i pavlefshëm imazhi.");
    if (input.dataUrl.length > 8_000_000) throw new Error("Imazhi është shumë i madh për skanim.");
    return input;
  })
  .handler(async ({ data, context }): Promise<AiImageScan> => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Mungon konfigurimi i AI.");

    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          {
            role: "system",
            content:
              "Ti inspekton imazhe para publikimit në një platformë shqiptare. Kërko: " +
              "numër telefoni, email, @handle rrjetesh sociale, link, kod QR ose çdo mënyrë " +
              "kontakti të shkruar në foto; dhe përmbajtje të papërshtatshme/ilegale. " +
              'Kthe VETËM JSON: {"has_contact": bool, "unsafe": bool, "reasons": ["..."]} ' +
              "me reasons në shqip (bosh kur imazhi është në rregull).",
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Skedari: ${data.fileName}` },
              { type: "image_url", image_url: { url: data.dataUrl } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) throw new Error("Shumë kërkesa te AI — provoni pas pak.");
    if (res.status === 402) throw new Error("Kreditet e AI kanë përfunduar.");
    if (!res.ok) throw new Error(`AI gabim: ${res.status} ${await res.text()}`);

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    let parsed: RawVerdict = {};
    try {
      parsed = JSON.parse(json.choices?.[0]?.message?.content ?? "{}") as RawVerdict;
    } catch {
      parsed = {};
    }

    const reasons = Array.isArray(parsed.reasons) ? parsed.reasons.map(String).slice(0, 6) : [];
    const hasContact = parsed.has_contact === true;
    const unsafe = parsed.unsafe === true;
    const verdict: AiImageVerdict = hasContact || unsafe ? "blocked" : reasons.length ? "warning" : "clean";

    if (hasContact) {
      await context.supabase.from("violations").insert({
        user_id: context.userId,
        kind: "contact",
        reason: `Kontakt i zbuluar nga AI në imazhin "${data.fileName}"${
          reasons.length ? `: ${reasons.join("; ")}` : ""
        }`,
      });
    }

    return { verdict, reasons, hasContact };
  });

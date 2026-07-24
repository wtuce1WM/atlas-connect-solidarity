// Public embed assistant scoped to a single business.
// - Anonymous (no auth): designed to be iframed on the business's own site.
// - No persistence: single-conversation, no user data written.
// - Injects business context (name, city, hours, phone, website, hook, description, price)
//   into the system prompt so the model answers as the business's concierge.
// SSE stream: events { type: "chunk", delta } and { type: "done" } / { type: "error" }.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.6-flash";

type Msg = { role: "system" | "user" | "assistant"; content: string };

function pickLang(v: unknown): "fr" | "en" | "ar" {
  return v === "en" || v === "ar" ? v : "fr";
}

function fmtHours(oh: any): string {
  if (!oh || typeof oh !== "object") return "";
  const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const keys = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const lines: string[] = [];
  keys.forEach((k, i) => {
    const day = oh[k];
    if (!day) return;
    if (day.closed) { lines.push(`${days[i]}: fermé`); return; }
    const slots = Array.isArray(day.slots) ? day.slots : [];
    const parts = slots
      .filter((s: any) => s && s.open && s.close)
      .map((s: any) => `${s.open}–${s.close}`);
    if (parts.length) lines.push(`${days[i]}: ${parts.join(", ")}`);
  });
  return lines.join(" · ");
}

function buildSystemPrompt(biz: any, lang: "fr" | "en" | "ar"): string {
  const hook = lang === "en" ? (biz.hook_en || biz.hook_fr) : lang === "ar" ? (biz.hook_ar || biz.hook_fr) : biz.hook_fr;
  const description = lang === "en" ? (biz.description_en || biz.description) : lang === "ar" ? (biz.description_ar || biz.description) : biz.description;
  const price = biz.manual_price_range || (biz.min_price ? `à partir de ${biz.min_price} MAD` : "");
  const hours = fmtHours(biz.opening_hours);

  const langLabel = lang === "en" ? "English" : lang === "ar" ? "Arabic (العربية)" : "French";

  const facts = [
    `Nom: ${biz.name}`,
    biz.city ? `Ville: ${biz.city}` : "",
    biz.neighborhood ? `Quartier: ${biz.neighborhood}` : "",
    biz.address ? `Adresse: ${biz.address}` : "",
    hook ? `Accroche: ${hook}` : "",
    description ? `Description: ${String(description).slice(0, 1200)}` : "",
    price ? `Prix indicatif: ${price}` : "",
    hours ? `Horaires: ${hours}` : "",
    biz.phone ? `Téléphone: ${biz.phone}` : "",
    biz.whatsapp ? `WhatsApp: ${biz.whatsapp}` : "",
    biz.website ? `Site: ${biz.website}` : "",
  ].filter(Boolean).join("\n");

  return `You are the friendly, concise digital concierge of "${biz.name}". You ONLY answer about this establishment.
Always respond in ${langLabel} regardless of the user's language.

FACTS (source of truth — never contradict, never invent details beyond these):
${facts}

Rules:
- Stay strictly scoped to "${biz.name}". If asked about competitors or unrelated places, politely redirect to what "${biz.name}" offers.
- If a fact is unknown (not in FACTS), say so and suggest the visitor call ${biz.phone || "the establishment"} or use WhatsApp ${biz.whatsapp || ""}.
- Be short (2–4 sentences), warm, and useful. Use bullet points only when listing 3+ items.
- Never mention that you are an AI, a model, or a system.
- Never output HTML, JSON, or code fences. Plain markdown only.
- For bookings, invite to use WhatsApp/phone/website above.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE);

    const body = await req.json().catch(() => ({}));
    const slugOrId = String(body.businessSlug || body.businessId || "").trim();
    const messages: Msg[] = Array.isArray(body.messages) ? body.messages.slice(-16) : [];
    const language = pickLang(body.language);

    if (!slugOrId) {
      return new Response(JSON.stringify({ error: "businessSlug required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!messages.length) {
      return new Response(JSON.stringify({ error: "messages required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Resolve business by slug first, then by id.
    let bizQ = admin
      .from("businesses")
      .select("id, slug, name, city, neighborhood, address, hook_fr, hook_en, hook_ar, description, description_en, description_ar, min_price, manual_price_range, phone, whatsapp, website, opening_hours, is_active")
      .eq("is_active", true)
      .limit(1);
    const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
    bizQ = looksLikeUuid ? bizQ.eq("id", slugOrId) : bizQ.eq("slug", slugOrId);
    const { data: bizRows, error: bizErr } = await bizQ;
    if (bizErr || !bizRows || !bizRows.length) {
      return new Response(JSON.stringify({ error: "business_not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const biz = bizRows[0];

    const system = buildSystemPrompt(biz, language);

    // Sanitize incoming messages: keep only user/assistant roles.
    const convo: Msg[] = [
      { role: "system", content: system },
      ...messages
        .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .map((m) => ({ role: m.role, content: String(m.content).slice(0, 4000) })),
    ];

    // Stream from gateway.
    const gwResp = await fetch(GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: convo,
        stream: true,
        temperature: 0.4,
      }),
    });

    if (!gwResp.ok || !gwResp.body) {
      const errTxt = await gwResp.text().catch(() => "");
      const status = gwResp.status === 429 ? 429 : gwResp.status === 402 ? 402 : 500;
      return new Response(JSON.stringify({ error: "gateway_error", status, detail: errTxt.slice(0, 500) }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Re-stream as our own simple SSE.
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const emit = (obj: any) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        try {
          const reader = gwResp.body!.getReader();
          const decoder = new TextDecoder();
          let buf = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const parts = buf.split("\n\n");
            buf = parts.pop() || "";
            for (const part of parts) {
              const line = part.split("\n").find((l) => l.startsWith("data:"));
              if (!line) continue;
              const payload = line.slice(5).trim();
              if (!payload || payload === "[DONE]") continue;
              try {
                const evt = JSON.parse(payload);
                const delta = evt?.choices?.[0]?.delta?.content;
                if (typeof delta === "string" && delta.length) {
                  emit({ type: "chunk", delta });
                }
              } catch { /* skip partial */ }
            }
          }
          emit({ type: "done" });
        } catch (e) {
          emit({ type: "error", message: (e as Error).message });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Traduit à la volée les champs Nom / Accroche / Description d'un établissement (FR -> EN).
// Ne touche PAS la base : renvoie simplement les traductions au client (brouillon affilié).
// Accès : staff ou affilié propriétaire de l'établissement ciblé.

import { assertStaffOrAffiliateBusiness } from "../_shared/auth-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function extractJson(content: string) {
  let text = content.trim().replace(/^\uFEFF/, "");
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }
  try {
    return JSON.parse(text);
  } catch (_) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
    throw _;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const businessId: string | undefined = body.business_id;
    const fields: Record<string, string> = body.fields ?? {};

    if (!businessId) return json({ error: "business_id requis" }, 400);

    const entries = Object.entries(fields).filter(
      ([, v]) => typeof v === "string" && v.trim().length > 0,
    );
    if (entries.length === 0) return json({ translations: {} });

    const auth = await assertStaffOrAffiliateBusiness(req, corsHeaders, businessId);
    if (auth instanceof Response) return auth;

    if (!LOVABLE_API_KEY) return json({ error: "Clé IA absente" }, 500);

    const payload = Object.fromEntries(entries);
    const sys = `You are a professional translator for a Moroccan travel guide.
Translate ALL string values of the provided JSON object from French to English.
RULES:
- Preserve the EXACT JSON structure and keys. Do NOT rename or remove keys.
- Preserve HTML tags inside string values (<strong>, <a>, <br/>, <p>, <ul>, <li>, etc.).
- Keep proper nouns (riad names, restaurant names, places, brands) untouched.
- Preserve URLs, numbers and punctuation.
- Empty strings stay empty.
- Output ONLY valid minified JSON, no commentary, no markdown fences.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": LOVABLE_API_KEY },
      body: JSON.stringify({
        model: "google/gemini-3.8-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: JSON.stringify(payload) },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      if (resp.status === 402) return json({ error: "Crédits IA épuisés." }, 402);
      if (resp.status === 429) return json({ error: "Trop de requêtes, réessayez." }, 429);
      return json({ error: `IA ${resp.status}: ${t.slice(0, 200)}` }, 502);
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return json({ error: "Réponse IA vide" }, 502);

    const parsed = extractJson(content);
    const translations: Record<string, string> = {};
    for (const [k] of entries) {
      const v = (parsed as Record<string, unknown>)?.[k];
      if (typeof v === "string") translations[k] = v;
    }
    return json({ translations });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});

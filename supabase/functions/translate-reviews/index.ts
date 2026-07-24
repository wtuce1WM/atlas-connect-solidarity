// Batch-translate reviews (text -> text_fr, text_en, text_ar) via Lovable AI Gateway.
// Idempotent: only translates missing fields unless ?force=1.
// Call in a loop until { done: true }.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MODEL = "google/gemini-3.1-flash-lite";

interface Row {
  id: string;
  text: string | null;
  text_fr: string | null;
  text_en: string | null;
  text_ar: string | null;
  language: string | null;
}

async function translateOne(row: Row, force: boolean): Promise<Partial<Row> | null> {
  const source = row.text_fr || row.text || row.text_en || row.text_ar;
  if (!source) return null;

  const need = {
    fr: force || !row.text_fr,
    en: force || !row.text_en,
    ar: force || !row.text_ar,
  };
  if (!need.fr && !need.en && !need.ar) return null;

  const targets: string[] = [];
  if (need.fr) targets.push("fr");
  if (need.en) targets.push("en");
  if (need.ar) targets.push("ar");

  const prompt = `You translate short customer reviews. Return STRICT JSON only, no prose.
Source review:
"""${source}"""

Return an object with exactly these keys: ${targets.map(t => `"${t}"`).join(", ")}.
- "fr": natural French translation
- "en": natural English translation
- "ar": natural Modern Standard Arabic translation
Preserve tone, keep it concise, no quotes around the value.`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: "You are a professional translator. Output strict JSON." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`AI ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;
  let parsed: Record<string, string>;
  try {
    parsed = JSON.parse(content);
  } catch {
    return null;
  }
  const update: Partial<Row> = {};
  if (need.fr && parsed.fr) update.text_fr = parsed.fr.trim();
  if (need.en && parsed.en) update.text_en = parsed.en.trim();
  if (need.ar && parsed.ar) update.text_ar = parsed.ar.trim();
  return Object.keys(update).length ? update : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 50);
  const force = url.searchParams.get("force") === "1";

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Pick rows that still miss at least one translation
  let q = sb
    .from("reviews")
    .select("id, text, text_fr, text_en, text_ar, language")
    .not("text", "is", null);
  if (!force) {
    q = q.or("text_fr.is.null,text_en.is.null,text_ar.is.null");
  }
  const { data: rows, error } = await q.limit(limit);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const pool = (rows ?? []) as Row[];
  if (pool.length === 0) {
    return new Response(JSON.stringify({ done: true, processed: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let updated = 0;
  let skipped = 0;
  let failed = 0;
  const errors: string[] = [];

  // Sequential to avoid rate limits
  for (const row of pool) {
    try {
      const update = await translateOne(row, force);
      if (!update) { skipped++; continue; }
      const { error: upErr } = await sb.from("reviews").update(update).eq("id", row.id);
      if (upErr) { failed++; errors.push(upErr.message); }
      else updated++;
    } catch (e) {
      failed++;
      errors.push(String(e).slice(0, 200));
      // On 429/402, stop early
      if (String(e).includes("429") || String(e).includes("402")) break;
    }
  }

  // Remaining count
  const { count: remaining } = await sb
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .or("text_fr.is.null,text_en.is.null,text_ar.is.null");

  return new Response(
    JSON.stringify({
      done: (remaining ?? 0) === 0,
      batch_size: pool.length,
      updated, skipped, failed,
      remaining,
      errors: errors.slice(0, 5),
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});

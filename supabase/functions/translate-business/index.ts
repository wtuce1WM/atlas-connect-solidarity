// Translate ONE business (hook + description + all its front_highlights) progressively.
// Staff-only. One business = atomic, with internal chunking for businesses that have many highlights.

import { createClient } from "npm:@supabase/supabase-js@^2";
import { corsHeaders } from "npm:@supabase/supabase-js@^2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const LANG_LABEL: Record<string, string> = {
  en: "English",
  ar: "Arabic (Modern Standard Arabic, ar-MA)",
};

const HIGHLIGHT_FIELDS = [
  "title",
  "description",
  "section_title",
  "section_intro",
  "metric_title",
  "metric_value",
] as const;

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isFilled(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function extractJson(content: string) {
  let text = content.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }
  try {
    return JSON.parse(text);
  } catch (_) {
    const objStart = text.indexOf("{");
    const arrStart = text.indexOf("[");
    const starts = [objStart, arrStart].filter((i) => i >= 0);
    const start = starts.length ? Math.min(...starts) : -1;
    const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
    if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
    throw _;
  }
}

async function translateJson(payload: Record<string, unknown>, target: string) {
  const langLabel = LANG_LABEL[target] ?? target;
  const sys = `You are a professional translator for a Moroccan travel guide.
Translate ALL string values of the provided JSON object from French to ${langLabel}.
RULES:
- Preserve the EXACT JSON structure and keys. Do NOT rename or remove keys.
- Preserve HTML tags inside string values (<strong>, <a>, <br/>, <p>, <ul>, <li>, etc.).
- Keep proper nouns (riad names, restaurant names, places, brands) untouched.
- Keep numeric metric values (e.g. "100%", "5★", "24/7") unchanged unless they contain translatable words.
- Preserve ids, slugs, URLs, numbers, booleans and null values exactly.
- Empty strings stay empty.
- Output ONLY valid minified JSON, no commentary, no markdown fences.`;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": LOVABLE_API_KEY,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: JSON.stringify(payload) },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`AI gateway ${resp.status}: ${t.slice(0, 300)}`);
  }
  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty AI response");
  return extractJson(content);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonRes({ error: "Missing auth" }, 401);

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) return jsonRes({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: isStaff } = await admin.rpc("is_staff", { _user_id: userData.user.id });
    if (!isStaff) return jsonRes({ error: "Staff only" }, 403);

    const { business_id, target } = await req.json();
    if (!business_id || !["en", "ar"].includes(target)) {
      return jsonRes({ error: "business_id and target ('en'|'ar') required" }, 400);
    }

    const hookKey = `hook_${target}` as const;
    const descKey = `description_${target}` as const;

    // 1) Load business
    const { data: biz, error: bErr } = await admin
      .from("businesses")
      .select(`id, name, hook_fr, description_fr, ${hookKey}, ${descKey}`)
      .eq("id", business_id)
      .maybeSingle();
    if (bErr || !biz) return jsonRes({ error: "Business not found", details: bErr?.message }, 404);

    const bizUpdate: Record<string, unknown> = {};
    const bizPayload: Record<string, string> = {};
    if (isFilled(biz.hook_fr) && !isFilled((biz as any)[hookKey])) {
      bizPayload.hook = biz.hook_fr as string;
    }
    if (isFilled(biz.description_fr) && !isFilled((biz as any)[descKey])) {
      bizPayload.description = biz.description_fr as string;
    }

    if (Object.keys(bizPayload).length > 0) {
      const translated = await translateJson(bizPayload, target);
      if ("hook" in bizPayload && isFilled(translated.hook)) bizUpdate[hookKey] = translated.hook;
      if ("description" in bizPayload && isFilled(translated.description)) bizUpdate[descKey] = translated.description;
      if (Object.keys(bizUpdate).length > 0) {
        const { error: uErr } = await admin.from("businesses").update(bizUpdate).eq("id", biz.id);
        if (uErr) return jsonRes({ error: "Business update failed", details: uErr.message }, 500);
      }
    }

    // 2) Load highlights for this business
    const selectCols = ["id", ...HIGHLIGHT_FIELDS.flatMap((f) => [`${f}_fr`, `${f}_${target}`])].join(", ");
    const { data: highlights, error: hErr } = await admin
      .from("front_highlights")
      .select(selectCols)
      .eq("business_id", business_id)
      .order("sort_order", { ascending: true });
    if (hErr) return jsonRes({ error: "Highlights load failed", details: hErr.message }, 500);

    const list = (highlights ?? []) as Array<Record<string, unknown>>;

    // Identify rows that still need translation
    const pending = list
      .map((row) => {
        const missing: Record<string, string> = {};
        for (const f of HIGHLIGHT_FIELDS) {
          const src = row[`${f}_fr`];
          const dst = row[`${f}_${target}`];
          if (isFilled(src) && !isFilled(dst)) missing[f] = src as string;
        }
        return { id: row.id as string, missing };
      })
      .filter((r) => Object.keys(r.missing).length > 0);

    const total_highlights = list.length;
    const completed_highlights = total_highlights - pending.length;

    if (pending.length === 0) {
      return jsonRes({
        ok: true,
        business_id,
        target,
        done: true,
        highlights_done: completed_highlights,
        highlights_total: total_highlights,
        translated_meta: Object.keys(bizUpdate),
      });
    }

    // 3) Translate one chunk of highlights (size depends on language richness)
    const chunkSize = target === "ar" ? 6 : 10;
    const chunk = pending.slice(0, chunkSize);

    const payload: Record<string, Record<string, string>> = {};
    for (const item of chunk) payload[item.id] = item.missing;

    const translated = await translateJson(payload, target);

    // 4) Persist each highlight individually
    let saved = 0;
    for (const item of chunk) {
      const t = translated[item.id];
      if (!t || typeof t !== "object") continue;
      const upd: Record<string, unknown> = {};
      for (const f of HIGHLIGHT_FIELDS) {
        if (f in item.missing && isFilled(t[f])) {
          upd[`${f}_${target}`] = t[f];
        }
      }
      if (Object.keys(upd).length === 0) continue;
      const { error: uErr } = await admin.from("front_highlights").update(upd).eq("id", item.id);
      if (!uErr) saved++;
    }

    const newCompleted = completed_highlights + saved;
    const done = newCompleted >= total_highlights && Object.keys(bizUpdate).length >= 0 && pending.length === chunk.length && saved === chunk.length;

    return jsonRes({
      ok: true,
      business_id,
      target,
      done: newCompleted >= total_highlights,
      highlights_done: newCompleted,
      highlights_total: total_highlights,
      chunk_saved: saved,
      translated_meta: Object.keys(bizUpdate),
    });
  } catch (e) {
    return jsonRes({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

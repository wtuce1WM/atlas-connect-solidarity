// Translate ONE blog post (title, excerpt, hero, intro, entries) in a SINGLE Gemini call.
// Staff-only. Atomic: either the whole article is translated and saved, or it fails.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const LANG_LABEL: Record<string, string> = {
  en: "English",
  ar: "Arabic (Modern Standard Arabic, ar-MA)",
};

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function translateWhole(payload: Record<string, unknown>, target: string) {
  const langLabel = LANG_LABEL[target] ?? target;
  const sys = `You are a professional translator for a Moroccan travel guide.
Translate ALL string values of the provided JSON object from French to ${langLabel}.
RULES:
- Preserve the EXACT JSON structure and keys. Do NOT rename or remove keys.
- Preserve HTML tags inside string values (e.g. <strong>, <a>, <br/>).
- Keep proper nouns (riad names, places, brands) untouched.
- Output ONLY the translated JSON, no commentary, no markdown fences.`;

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
    }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`AI gateway ${resp.status}: ${t.slice(0, 300)}`);
  }
  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty AI response");
  return JSON.parse(content);
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

    const { slug, target } = await req.json();
    if (!slug || !["en", "ar"].includes(target)) {
      return jsonRes({ error: "slug and target ('en'|'ar') required" }, 400);
    }

    const { data: post, error: pErr } = await admin
      .from("blog_posts")
      .select("id, title_fr, excerpt_fr, hero_title_top_fr, hero_title_bottom_fr, hero_subtitle_fr, intro_fr, entries_fr")
      .eq("slug", slug)
      .maybeSingle();
    if (pErr || !post) return jsonRes({ error: "Post not found", details: pErr?.message }, 404);

    const sourcePayload = {
      title: post.title_fr ?? "",
      excerpt: post.excerpt_fr ?? "",
      hero_title_top: post.hero_title_top_fr ?? "",
      hero_title_bottom: post.hero_title_bottom_fr ?? "",
      hero_subtitle: post.hero_subtitle_fr ?? "",
      intro: post.intro_fr ?? "",
      entries: post.entries_fr ?? [],
    };

    const translated = await translateWhole(sourcePayload, target);

    const update: Record<string, unknown> = {
      [`title_${target}`]: translated.title ?? null,
      [`excerpt_${target}`]: translated.excerpt ?? null,
      [`hero_title_top_${target}`]: translated.hero_title_top ?? null,
      [`hero_title_bottom_${target}`]: translated.hero_title_bottom ?? null,
      [`hero_subtitle_${target}`]: translated.hero_subtitle ?? null,
      [`intro_${target}`]: translated.intro ?? null,
      [`entries_${target}`]: translated.entries ?? [],
    };

    const { error: uErr } = await admin.from("blog_posts").update(update).eq("id", post.id);
    if (uErr) return jsonRes({ error: "Update failed", details: uErr.message }, 500);

    return jsonRes({
      ok: true,
      slug,
      target,
      entries_count: Array.isArray(translated.entries) ? translated.entries.length : 0,
    });
  } catch (e) {
    return jsonRes({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

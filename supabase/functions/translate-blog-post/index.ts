// Translate ONE blog post progressively.
// Staff-only. Small JSON chunks avoid malformed long model outputs and edge timeouts.

import { createClient } from "npm:@supabase/supabase-js@^2";
import { corsHeaders } from "npm:@supabase/supabase-js@^2/cors";

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

function extractJson(content: string) {
  let text = content.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }

  try {
    return JSON.parse(text);
  } catch (_) {
    const objectStart = text.indexOf("{");
    const arrayStart = text.indexOf("[");
    const starts = [objectStart, arrayStart].filter((i) => i >= 0);
    const start = starts.length ? Math.min(...starts) : -1;
    const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }
    throw _;
  }
}

async function translateJson(payload: Record<string, unknown>, target: string) {
  const langLabel = LANG_LABEL[target] ?? target;
  const sys = `You are a professional translator for a Moroccan travel guide.
Translate ALL string values of the provided JSON object from French to ${langLabel}.
RULES:
- Preserve the EXACT JSON structure and keys. Do NOT rename or remove keys.
- Preserve HTML tags inside string values (e.g. <strong>, <a>, <br/>).
- Keep proper nouns (riad names, places, brands) untouched.
- Preserve ids, slugs, URLs, numbers, booleans and null values exactly.
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

function isFilled(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
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

    const titleKey = `title_${target}`;
    const excerptKey = `excerpt_${target}`;
    const heroTopKey = `hero_title_top_${target}`;
    const heroBottomKey = `hero_title_bottom_${target}`;
    const heroSubtitleKey = `hero_subtitle_${target}`;
    const introKey = `intro_${target}`;
    const entriesKey = `entries_${target}`;

    const { data: post, error: pErr } = await admin
      .from("blog_posts")
      .select(`id, title_fr, excerpt_fr, hero_title_top_fr, hero_title_bottom_fr, hero_subtitle_fr, intro_fr, entries_fr, ${titleKey}, ${excerptKey}, ${heroTopKey}, ${heroBottomKey}, ${heroSubtitleKey}, ${introKey}, ${entriesKey}`)
      .eq("slug", slug)
      .maybeSingle();
    if (pErr || !post) return jsonRes({ error: "Post not found", details: pErr?.message }, 404);

    const sourceEntries = Array.isArray(post.entries_fr) ? post.entries_fr : [];
    const existingEntries = Array.isArray(post[entriesKey]) ? post[entriesKey] : [];
    const safeExistingEntries = existingEntries.slice(0, sourceEntries.length);
    const update: Record<string, unknown> = {};

    const needsMeta =
      (isFilled(post.title_fr) && !isFilled(post[titleKey])) ||
      (isFilled(post.excerpt_fr) && !isFilled(post[excerptKey])) ||
      (isFilled(post.hero_title_top_fr) && !isFilled(post[heroTopKey])) ||
      (isFilled(post.hero_title_bottom_fr) && !isFilled(post[heroBottomKey])) ||
      (isFilled(post.hero_subtitle_fr) && !isFilled(post[heroSubtitleKey])) ||
      (isFilled(post.intro_fr) && !isFilled(post[introKey]));

    if (needsMeta) {
      const translatedMeta = await translateJson({
        title: post.title_fr ?? "",
        excerpt: post.excerpt_fr ?? "",
        hero_title_top: post.hero_title_top_fr ?? "",
        hero_title_bottom: post.hero_title_bottom_fr ?? "",
        hero_subtitle: post.hero_subtitle_fr ?? "",
        intro: post.intro_fr ?? "",
      }, target);

      if (isFilled(post.title_fr) && !isFilled(post[titleKey])) update[titleKey] = translatedMeta.title ?? null;
      if (isFilled(post.excerpt_fr) && !isFilled(post[excerptKey])) update[excerptKey] = translatedMeta.excerpt ?? null;
      if (isFilled(post.hero_title_top_fr) && !isFilled(post[heroTopKey])) update[heroTopKey] = translatedMeta.hero_title_top ?? null;
      if (isFilled(post.hero_title_bottom_fr) && !isFilled(post[heroBottomKey])) update[heroBottomKey] = translatedMeta.hero_title_bottom ?? null;
      if (isFilled(post.hero_subtitle_fr) && !isFilled(post[heroSubtitleKey])) update[heroSubtitleKey] = translatedMeta.hero_subtitle ?? null;
      if (isFilled(post.intro_fr) && !isFilled(post[introKey])) update[introKey] = translatedMeta.intro ?? null;
    }

    const start = safeExistingEntries.length;
    const chunkSize = target === "ar" ? 4 : 6;
    const chunk = sourceEntries.slice(start, start + chunkSize);

    if (chunk.length > 0) {
      const translatedChunk = await translateJson({ entries: chunk }, target);
      const nextEntries = Array.isArray(translatedChunk.entries) ? translatedChunk.entries : [];
      if (nextEntries.length !== chunk.length) {
        return jsonRes({
          error: "Translation returned an incomplete entries chunk",
          expected: chunk.length,
          received: nextEntries.length,
        }, 500);
      }
      update[entriesKey] = [...safeExistingEntries, ...nextEntries];
    } else if (!Array.isArray(post[entriesKey])) {
      update[entriesKey] = [];
    }

    if (Object.keys(update).length > 0) {
      const { error: uErr } = await admin.from("blog_posts").update(update).eq("id", post.id);
      if (uErr) return jsonRes({ error: "Update failed", details: uErr.message }, 500);
    }

    const translatedEntriesCount = Array.isArray(update[entriesKey])
      ? (update[entriesKey] as unknown[]).length
      : safeExistingEntries.length;
    const done =
      translatedEntriesCount >= sourceEntries.length &&
      (!isFilled(post.title_fr) || isFilled(update[titleKey]) || isFilled(post[titleKey])) &&
      (!isFilled(post.excerpt_fr) || isFilled(update[excerptKey]) || isFilled(post[excerptKey])) &&
      (!isFilled(post.intro_fr) || isFilled(update[introKey]) || isFilled(post[introKey]));

    return jsonRes({
      ok: true,
      slug,
      target,
      done,
      entries_count: translatedEntriesCount,
      entries_total: sourceEntries.length,
      chunk_count: chunk.length,
    });
  } catch (e) {
    return jsonRes({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

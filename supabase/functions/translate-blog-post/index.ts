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

function sanitizeJsonLike(text: string): string {
  let out = text.replace(/^\uFEFF/, "").replace(/[\u200B-\u200F\u202A-\u202E\u2060]/g, "");
  // Strip control chars that break JSON.parse (keep \n \r \t).
  out = out.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
  return out;
}

function extractJson(content: string) {
  let text = sanitizeJsonLike(content.trim());
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

type StringLeaf = { path: (string | number)[]; text: string };

function collectStringLeaves(value: unknown, path: (string | number)[] = [], out: StringLeaf[] = []) {
  if (typeof value === "string") {
    out.push({ path, text: value });
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectStringLeaves(item, [...path, index], out));
    return out;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      collectStringLeaves(item, [...path, key], out);
    }
  }
  return out;
}

function setByPath(root: unknown, path: (string | number)[], value: string) {
  let cursor: any = root;
  for (let i = 0; i < path.length - 1; i++) cursor = cursor[path[i] as any];
  cursor[path[path.length - 1] as any] = value;
}

async function translatePlainText(text: string, target: string): Promise<string> {
  const langLabel = LANG_LABEL[target] ?? target;
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": LOVABLE_API_KEY,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `Translate this French text to ${langLabel}. Preserve HTML tags, URLs, numbers and proper nouns. Output only the translated text, no quotes, no markdown, no commentary.`,
        },
        { role: "user", content: text },
      ],
      temperature: 0.1,
    }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`AI gateway ${resp.status}: ${t.slice(0, 300)}`);
  }
  const data = await resp.json();
  const translated = data.choices?.[0]?.message?.content;
  if (!translated) throw new Error("Empty AI response");
  return sanitizeJsonLike(String(translated)).trim().replace(/^```(?:text)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

async function translateStringLeavesAdaptive(leaves: StringLeaf[], target: string): Promise<StringLeaf[]> {
  if (leaves.length === 0) return [];
  try {
    const payload = { items: leaves.map((leaf, index) => ({ index, text: leaf.text })) };
    const out = await translateJson(payload, target);
    const items = Array.isArray(out.items) ? out.items : [];
    if (items.length !== leaves.length) throw new Error(`incomplete string chunk (${items.length}/${leaves.length})`);
    const byIndex = new Map<number, string>();
    for (const item of items) {
      if (typeof item?.index !== "number" || typeof item?.text !== "string") {
        throw new Error("invalid string chunk shape");
      }
      byIndex.set(item.index, item.text);
    }
    return leaves.map((leaf, index) => ({ ...leaf, text: byIndex.get(index) ?? leaf.text }));
  } catch (e) {
    if (leaves.length === 1) {
      return [{ ...leaves[0], text: await translatePlainText(leaves[0].text, target) }];
    }
    const mid = Math.ceil(leaves.length / 2);
    const left = await translateStringLeavesAdaptive(leaves.slice(0, mid), target);
    const right = await translateStringLeavesAdaptive(leaves.slice(mid), target);
    return [...left, ...right];
  }
}

async function translateOneEntryByLeaves(entry: unknown, target: string): Promise<unknown> {
  const translated = structuredClone(entry);
  const leaves = collectStringLeaves(translated).filter((leaf) => leaf.text.trim().length > 0);
  const translatedLeaves = await translateStringLeavesAdaptive(leaves, target);
  for (const leaf of translatedLeaves) setByPath(translated, leaf.path, leaf.text);
  return translated;
}

async function translateEntriesAdaptive(entries: unknown[], target: string): Promise<unknown[]> {
  if (entries.length === 0) return [];
  try {
    const out = await translateJson({ entries }, target);
    const arr = Array.isArray(out.entries) ? out.entries : [];
    if (arr.length === entries.length) return arr;
    throw new Error(`incomplete chunk (${arr.length}/${entries.length})`);
  } catch (e) {
    if (entries.length === 1) return [await translateOneEntryByLeaves(entries[0], target)];
    const mid = Math.ceil(entries.length / 2);
    const left = await translateEntriesAdaptive(entries.slice(0, mid), target);
    const right = await translateEntriesAdaptive(entries.slice(mid), target);
    return [...left, ...right];
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
    const contentKey = `content_${target}`;
    const entriesKey = `entries_${target}`;

    const { data: post, error: pErr } = await admin
      .from("blog_posts")
      .select(`id, title_fr, excerpt_fr, hero_title_top_fr, hero_title_bottom_fr, hero_subtitle_fr, intro_fr, content_fr, entries_fr, ${titleKey}, ${excerptKey}, ${heroTopKey}, ${heroBottomKey}, ${heroSubtitleKey}, ${introKey}, ${contentKey}, ${entriesKey}`)
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
      (isFilled(post.intro_fr) && !isFilled(post[introKey])) ||
      (isFilled(post.content_fr) && !isFilled(post[contentKey]));

    if (needsMeta) {
      const translatedMeta = await translateJson({
        title: post.title_fr ?? "",
        excerpt: post.excerpt_fr ?? "",
        hero_title_top: post.hero_title_top_fr ?? "",
        hero_title_bottom: post.hero_title_bottom_fr ?? "",
        hero_subtitle: post.hero_subtitle_fr ?? "",
        intro: post.intro_fr ?? "",
        content: post.content_fr ?? "",
      }, target);

      if (isFilled(post.title_fr) && !isFilled(post[titleKey])) update[titleKey] = translatedMeta.title ?? null;
      if (isFilled(post.excerpt_fr) && !isFilled(post[excerptKey])) update[excerptKey] = translatedMeta.excerpt ?? null;
      if (isFilled(post.hero_title_top_fr) && !isFilled(post[heroTopKey])) update[heroTopKey] = translatedMeta.hero_title_top ?? null;
      if (isFilled(post.hero_title_bottom_fr) && !isFilled(post[heroBottomKey])) update[heroBottomKey] = translatedMeta.hero_title_bottom ?? null;
      if (isFilled(post.hero_subtitle_fr) && !isFilled(post[heroSubtitleKey])) update[heroSubtitleKey] = translatedMeta.hero_subtitle ?? null;
      if (isFilled(post.intro_fr) && !isFilled(post[introKey])) update[introKey] = translatedMeta.intro ?? null;
      if (isFilled(post.content_fr) && !isFilled(post[contentKey])) update[contentKey] = translatedMeta.content ?? null;
    }

    const start = safeExistingEntries.length;
    const chunkSize = target === "ar" ? 4 : 6;
    const chunk = sourceEntries.slice(start, start + chunkSize);

    if (chunk.length > 0) {
      const nextEntries = await translateEntriesAdaptive(chunk, target);
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
      (!isFilled(post.intro_fr) || isFilled(update[introKey]) || isFilled(post[introKey])) &&
      (!isFilled(post.content_fr) || isFilled(update[contentKey]) || isFilled(post[contentKey]));

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

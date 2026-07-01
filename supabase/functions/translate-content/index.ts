// Translate batch content from FR to EN/AR using Lovable AI Gateway (Gemini Flash).
// Staff-only. Pulls rows missing target_lang fields, translates, updates,
// and maintains a `translation_jobs` row for progress reporting.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

// Table configurations. `fields`: list of source field names (assume *_fr exists).
// `i18n` describes the storage pattern:
//   - "suffix": source = `${field}_fr`, target = `${field}_${target}`
//   - "entries": JSONB column `entries_${target}` mirroring `entries_${source}`
type FieldKind = "text" | "html" | "json_entries" | "text_array";
type TableConfig = {
  table: string;
  pk: string;
  // Plain text/html columns, FR -> target via suffix
  textFields?: { source: string; target: string; kind: FieldKind }[];
  // JSONB entries column (blog_posts only for now)
  jsonEntries?: { source: string; target: string };
};

const CONFIGS: Record<string, (target: string) => TableConfig> = {
  blog_posts: (t) => ({
    table: "blog_posts",
    pk: "id",
    textFields: [
      { source: "title_fr", target: `title_${t}`, kind: "text" },
      { source: "excerpt_fr", target: `excerpt_${t}`, kind: "text" },
      { source: "hero_title_top_fr", target: `hero_title_top_${t}`, kind: "text" },
      { source: "hero_title_bottom_fr", target: `hero_title_bottom_${t}`, kind: "text" },
      { source: "hero_subtitle_fr", target: `hero_subtitle_${t}`, kind: "text" },
      { source: "intro_fr", target: `intro_${t}`, kind: "html" },
    ],
    jsonEntries: { source: "entries_fr", target: `entries_${t}` },
  }),
  categories: (t) => ({
    table: "categories", pk: "id",
    textFields: [{ source: "name_fr", target: `name_${t}`, kind: "text" }],
  }),
  subcategories: (t) => ({
    table: "subcategories", pk: "id",
    textFields: [{ source: "name_fr", target: `name_${t}`, kind: "text" }],
  }),
  services: (t) => ({
    table: "services", pk: "id",
    textFields: [{ source: "name_fr", target: `name_${t}`, kind: "text" }],
  }),
  badges: (t) => ({
    table: "badges", pk: "id",
    textFields: [
      { source: "name_fr", target: `name_${t}`, kind: "text" },
      { source: "description_fr", target: `description_${t}`, kind: "text" },
    ],
  }),
  labels: (t) => ({
    table: "labels", pk: "id",
    textFields: [
      { source: "name_fr", target: `name_${t}`, kind: "text" },
      { source: "description_fr", target: `description_${t}`, kind: "text" },
    ],
  }),
  cities: (t) => ({
    table: "cities", pk: "id",
    textFields: [
      { source: "name_fr", target: `name_${t}`, kind: "text" },
      { source: "description_fr", target: `description_${t}`, kind: "text" },
    ],
  }),
  destinations: (t) => ({
    table: "destinations", pk: "id",
    textFields: [
      { source: "name_fr", target: `name_${t}`, kind: "text" },
      { source: "hook_fr", target: `hook_${t}`, kind: "text" },
      { source: "description_fr", target: `description_${t}`, kind: "text" },
    ],
  }),
  points_of_interest: (t) => ({
    table: "points_of_interest", pk: "id",
    textFields: [
      { source: "name_fr", target: `name_${t}`, kind: "text" },
      { source: "description_fr", target: `description_${t}`, kind: "text" },
    ],
  }),
  businesses_hook: (t) => ({
    table: "businesses", pk: "id",
    textFields: [{ source: "hook_fr", target: `hook_${t}`, kind: "text" }],
  }),
  certifications: (t) => ({
    table: "certification_metadata", pk: "id",
    textFields: [
      { source: "link_title_fr", target: `link_title_${t}`, kind: "text" },
      { source: "description_fr", target: `description_${t}`, kind: "html" },
    ],
  }),
  business_image_titles: (t) => ({
    table: "business_image_titles", pk: "id",
    textFields: [
      { source: "title_fr", target: `title_${t}`, kind: "text" },
      { source: "description_fr", target: `description_${t}`, kind: "text" },
    ],
  }),
  affiliate_promotions: (t) => ({
    table: "affiliate_business_promotions", pk: "id",
    textFields: [
      { source: "title_fr", target: `title_${t}`, kind: "text" },
      { source: "promotion_message_fr", target: `promotion_message_${t}`, kind: "html" },
    ],
  }),
  search_synonyms: (t) => ({
    table: "search_synonyms", pk: "id",
    textFields: [
      { source: "key_word", target: `key_word_${t}`, kind: "text" },
      { source: "synonyms", target: `synonyms_${t}`, kind: "text_array" },
    ],
  }),
};

const LANG_NAME: Record<string, string> = { en: "English", ar: "Arabic (Modern Standard)" };

async function translateBatch(texts: string[], targetLang: string, isHtml: boolean): Promise<string[]> {
  if (texts.length === 0) return [];
  const sys = `You are a professional translator from French to ${LANG_NAME[targetLang] ?? targetLang}. ` +
    (isHtml
      ? "Translate the text content while preserving ALL HTML tags, attributes, and structure exactly. "
      : "Return plain text. ") +
    `Preserve proper nouns (places, brand names, "Marrakech", "Morocco" stays "Morocco" in English / "المغرب" in Arabic). ` +
    `Keep tone natural, idiomatic, and concise.`;

  const user = `Translate the following ${texts.length} item(s) from French to ${LANG_NAME[targetLang]}. ` +
    `Respond ONLY with a JSON object: {"translations": ["...", "...", ...]} in the same order. No commentary.\n\n` +
    JSON.stringify(texts);

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Gateway ${resp.status}: ${t.slice(0, 300)}`);
  }
  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content);
  const out = parsed.translations;
  if (!Array.isArray(out) || out.length !== texts.length) {
    throw new Error(`Bad translation shape (got ${Array.isArray(out) ? out.length : "non-array"} for ${texts.length})`);
  }
  return out.map((s) => String(s ?? ""));
}

async function translateJsonValue(value: unknown, targetLang: string): Promise<unknown> {
  // Walk JSON and translate every string value found in known text-bearing fields.
  // For simplicity & quality, we serialize, ask the model to translate text values
  // while keeping keys/structure, then parse back.
  const sys = `You translate French content to ${LANG_NAME[targetLang]}. ` +
    `You receive a JSON value. Translate ONLY the human-readable string values ` +
    `(titles, paragraphs, captions, alt text). Do NOT translate keys, URLs, slugs, IDs, ` +
    `file paths, color codes, language codes, or technical identifiers. Preserve the JSON ` +
    `structure and types exactly. Return ONLY a JSON object shaped as {"value": <translated JSON value>}.`;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: `Translate this JSON to ${LANG_NAME[targetLang]}:\n\n${JSON.stringify({ value })}` },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Gateway ${resp.status}: ${t.slice(0, 300)}`);
  }
  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content ?? "{}";
  return JSON.parse(content).value;
}

function isIncompleteJsonEntries(source: unknown, target: unknown): boolean {
  if (!source) return false;
  if (!target) return true;
  if (Array.isArray(source)) return !Array.isArray(target) || target.length < source.length;
  return false;
}

async function translateJsonEntriesChunk(
  source: unknown,
  target: unknown,
  targetLang: string,
  onProgress?: (entries: unknown[]) => Promise<void>,
  deadlineMs: number = Date.now() + 50_000,
): Promise<unknown> {
  if (!Array.isArray(source)) return translateJsonValue(source, targetLang);

  let existing = Array.isArray(target) ? [...target] : [];
  const chunkSize = 20;

  while (existing.length < source.length) {
    if (Date.now() > deadlineMs) break; // time budget exhausted: persist what we have
    const start = existing.length;
    const chunk = source.slice(start, start + chunkSize);
    const translatedChunk = await translateJsonValue(chunk, targetLang);
    if (!Array.isArray(translatedChunk)) {
      throw new Error("Bad JSON entries translation shape");
    }
    existing = [...existing, ...translatedChunk];
    if (onProgress) {
      try { await onProgress(existing); } catch (_) { /* ignore persist errors */ }
    }
  }
  return existing;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: isStaff } = await admin.rpc("is_staff", { _user_id: user.id });
    if (!isStaff) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const { config_key, target_lang, limit = 25, dry_run = false } = body as {
      config_key: string; target_lang: "en" | "ar"; limit?: number; dry_run?: boolean;
    };
    const builder = CONFIGS[config_key];
    if (!builder) throw new Error(`Unknown config_key: ${config_key}`);
    if (!["en", "ar"].includes(target_lang)) throw new Error("target_lang must be 'en' or 'ar'");
    const cfg = builder(target_lang);

    // Create job
    const { data: job, error: jobErr } = await admin.from("translation_jobs").insert({
      table_name: cfg.table,
      source_lang: "fr",
      target_lang,
      fields: cfg.textFields?.map((f) => f.target) ?? [],
      status: "running",
      started_at: new Date().toISOString(),
      created_by: user.id,
      options: { config_key, limit, dry_run },
    }).select().single();
    if (jobErr) throw jobErr;

    // Pick rows where at least one target field is null/empty
    const selectCols = [cfg.pk, ...(cfg.textFields?.flatMap((f) => [f.source, f.target]) ?? [])];
    if (cfg.jsonEntries) selectCols.push(cfg.jsonEntries.source, cfg.jsonEntries.target);
    let query = admin.from(cfg.table).select(selectCols.join(","));

    // Build OR condition for missing targets
    const orParts: string[] = [];
    cfg.textFields?.forEach((f) => orParts.push(`${f.target}.is.null`));
    if (cfg.jsonEntries) orParts.push(`${cfg.jsonEntries.target}.is.null`);
    if (orParts.length && !cfg.jsonEntries) query = query.or(orParts.join(","));
    if (!cfg.jsonEntries) query = query.limit(limit);

    const { data: rows, error: selErr } = await query;
    if (selErr) throw selErr;

    const effectiveLimit = cfg.jsonEntries ? Math.min(limit, 1) : limit;
    const candidateRows = (rows ?? []).filter((row: any) => {
      const missingText = cfg.textFields?.some((f) => row[f.source] && !row[f.target]) ?? false;
      const missingJson = cfg.jsonEntries
        ? isIncompleteJsonEntries(row[cfg.jsonEntries.source], row[cfg.jsonEntries.target])
        : false;
      return missingText || missingJson;
    }).slice(0, effectiveLimit);

    let success = 0, errors = 0;
    const errorLog: string[] = [];
    const CONCURRENCY = 5;

    const processRow = async (row: any) => {
      try {
        const updates: Record<string, unknown> = {};

        if (cfg.textFields?.length) {
          const toTranslate: { idx: number; text: string; field: typeof cfg.textFields[0] }[] = [];
          cfg.textFields.forEach((f, i) => {
            const src = row[f.source];
            const tgt = row[f.target];
            if (src && !tgt) toTranslate.push({ idx: i, text: String(src), field: f });
          });
          if (toTranslate.length > 0) {
            const hasHtml = toTranslate.some((t) => t.field.kind === "html");
            const translated = await translateBatch(toTranslate.map((t) => t.text), target_lang, hasHtml);
            toTranslate.forEach((t, i) => { updates[t.field.target] = translated[i]; });
          }
        }

        if (cfg.jsonEntries) {
          const src = row[cfg.jsonEntries.source];
          const tgt = row[cfg.jsonEntries.target];
          if (isIncompleteJsonEntries(src, tgt)) {
            const targetCol = cfg.jsonEntries.target;
            const pkVal = row[cfg.pk];
            updates[targetCol] = await translateJsonEntriesChunk(
              src,
              tgt,
              target_lang,
              async (partial) => {
                if (!dry_run) {
                  await admin.from(cfg.table).update({ [targetCol]: partial }).eq(cfg.pk, pkVal);
                }
              },
            );
          }
        }

        if (Object.keys(updates).length > 0 && !dry_run) {
          const { error: upErr } = await admin.from(cfg.table).update(updates).eq(cfg.pk, row[cfg.pk]);
          if (upErr) throw upErr;
        }
        success++;
      } catch (e) {
        errors++;
        errorLog.push(`${row[cfg.pk]}: ${(e as Error).message}`);
      }
    };

    // Process in parallel chunks
    const allRows = candidateRows;
    for (let i = 0; i < allRows.length; i += CONCURRENCY) {
      const chunk = allRows.slice(i, i + CONCURRENCY);
      await Promise.all(chunk.map(processRow));
      await admin.from("translation_jobs").update({
        processed_rows: success + errors,
        success_count: success,
        error_count: errors,
        last_error: errorLog[errorLog.length - 1] ?? null,
      }).eq("id", job.id);
    }

    await admin.from("translation_jobs").update({
      status: errors > 0 && success === 0 ? "error" : "done",
      total_rows: allRows.length,
      finished_at: new Date().toISOString(),
    }).eq("id", job.id);

    return new Response(JSON.stringify({
      job_id: job.id,
      processed: allRows.length,
      success, errors,
      sample_errors: errorLog.slice(0, 5),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("translate-content error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

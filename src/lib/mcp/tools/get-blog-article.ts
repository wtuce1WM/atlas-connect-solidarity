import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const SUPABASE_URL = "https://plnphgdrawpsnumnejzc.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsbnBoZ2RyYXdwc251bW5lanpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNjA5ODcsImV4cCI6MjA4NTgzNjk4N30.RwHKmL6E0Gd2LTVvDkfYx5RkZ-k7LKKp4iUoCS34pW4";

type Lang = "fr" | "en" | "ar";

export default defineTool({
  name: "get_blog_article",
  title: "Read a One World Morocco blog article",
  description:
    "Read the full public content of a One World Morocco editorial article (blog) by slug, or by free-text title search. Returns title, TL;DR, intro, every ranked entry (pretitle, title, paragraphs, opening hours), FAQ and the public URL. Example slug: 'idee-cadeau-marrakech' for the article 'Trouver une bonne idée cadeau à Marrakech'.",
  inputSchema: {
    slug: z
      .string()
      .optional()
      .describe("Article slug from the URL, e.g. 'idee-cadeau-marrakech'."),
    query: z
      .string()
      .optional()
      .describe("Free-text search on the article title if the slug is unknown, e.g. 'idée cadeau'."),
    lang: z
      .enum(["fr", "en", "ar"])
      .optional()
      .describe("Language of the content to return (default 'fr')."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ slug, query, lang }) => {
    if (!slug && !query) {
      return {
        content: [{ type: "text", text: "Provide either `slug` or `query`." }],
        isError: true,
      };
    }
    const l: Lang = (lang ?? "fr") as Lang;
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let q = supabase
      .from("blog_posts")
      .select(
        "slug, title_fr, title_en, title_ar, excerpt_fr, excerpt_en, excerpt_ar, tldr_fr, tldr_en, tldr_ar, intro_fr, intro_en, intro_ar, entries_fr, entries_en, entries_ar, faq_fr, faq_en, faq_ar, author_name, published_at, updated_at, cover_image_url",
      )
      .eq("is_published", true)
      .limit(1);

    q = slug
      ? q.eq("slug", slug)
      : q.or(
          `title_fr.ilike.%${query}%,title_en.ilike.%${query}%,slug.ilike.%${query}%`,
        );

    const { data, error } = await q.maybeSingle();
    if (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
    if (!data) {
      return {
        content: [
          { type: "text", text: `No published blog article found for '${slug ?? query}'.` },
        ],
        isError: true,
      };
    }

    const pick = (base: string) =>
      (data as Record<string, unknown>)[`${base}_${l}`] ??
      (data as Record<string, unknown>)[`${base}_fr`] ??
      null;

    const rawEntries = (pick("entries") as unknown[]) ?? [];
    const entries = (Array.isArray(rawEntries) ? rawEntries : []).map((e, i) => {
      const entry = (e ?? {}) as Record<string, unknown>;
      return {
        rank: i + 1,
        pretitle: entry.pretitle ?? null,
        title: entry.title ?? null,
        paragraphs: entry.paragraphs ?? null,
        hours: entry.hours ?? null,
      };
    });

    const payload = {
      slug: data.slug,
      lang: l,
      title: pick("title"),
      excerpt: pick("excerpt"),
      tldr: pick("tldr"),
      intro: pick("intro"),
      author: data.author_name,
      published_at: data.published_at,
      updated_at: data.updated_at,
      cover_image_url: data.cover_image_url,
      url: `https://oneworldmorocco.com/blog/${data.slug}`,
      entries_count: entries.length,
      entries,
      faq: pick("faq"),
    };

    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});

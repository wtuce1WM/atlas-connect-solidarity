import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const SUPABASE_URL = "https://plnphgdrawpsnumnejzc.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsbnBoZ2RyYXdwc251bW5lanpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNjA5ODcsImV4cCI6MjA4NTgzNjk4N30.RwHKmL6E0Gd2LTVvDkfYx5RkZ-k7LKKp4iUoCS34pW4";

export default defineTool({
  name: "list_blog_articles",
  title: "List One World Morocco blog articles",
  description:
    "List the published One World Morocco editorial articles (slug, title, excerpt, URL). Optionally filter by free-text on the title. Use it to find the slug to pass to `get_blog_article`.",
  inputSchema: {
    query: z.string().optional().describe("Optional free-text filter on the title or slug."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe("Max articles to return (1-50, default 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }) => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let q = supabase
      .from("blog_posts")
      .select("slug, title_fr, title_en, excerpt_fr, published_at, updated_at")
      .eq("is_published", true)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(Math.min(limit ?? 25, 50));

    if (query) {
      q = q.or(`title_fr.ilike.%${query}%,title_en.ilike.%${query}%,slug.ilike.%${query}%`);
    }

    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }

    const results = (data ?? []).map((p) => ({
      slug: p.slug,
      title: p.title_fr ?? p.title_en,
      excerpt: p.excerpt_fr,
      published_at: p.published_at,
      updated_at: p.updated_at,
      url: `https://oneworldmorocco.com/blog/${p.slug}`,
    }));

    return {
      content: [
        {
          type: "text",
          text: results.length ? JSON.stringify(results, null, 2) : "No published article found.",
        },
      ],
      structuredContent: { results, count: results.length },
    };
  },
});

import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const SUPABASE_URL = "https://plnphgdrawpsnumnejzc.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsbnBoZ2RyYXdwc251bW5lanpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNjA5ODcsImV4cCI6MjA4NTgzNjk4N30.RwHKmL6E0Gd2LTVvDkfYx5RkZ-k7LKKp4iUoCS34pW4";

export default defineTool({
  name: "search_businesses",
  title: "Search One World Morocco businesses",
  description:
    "Search the public One World Morocco catalog of curated businesses (restaurants, hotels, riads, activities, boutiques) in Marrakech, Essaouira and across Morocco. Returns name, city, category, rating, price range, hook description and public URL.",
  inputSchema: {
    query: z
      .string()
      .min(1)
      .describe("Free-text search: a name, cuisine, activity, neighborhood, e.g. 'rooftop marrakech', 'riad essaouira', 'couscous'."),
    city: z
      .string()
      .optional()
      .describe("Optional city filter, e.g. 'Marrakech', 'Essaouira'."),
    category: z
      .string()
      .optional()
      .describe("Optional main category filter, e.g. 'Restaurant', 'Hotel', 'Activity'."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(20)
      .optional()
      .describe("Max results to return (1-20, default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, city, category, limit }) => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let q = supabase
      .from("businesses")
      .select(
        "id, name, slug, main_category, city, neighborhood, hook_fr, hook_en, computed_rating, total_review_count, min_price, manual_price_range, priority_score",
      )
      .eq("is_active", true)
      .or(
        `name.ilike.%${query}%,description.ilike.%${query}%,keywords.ilike.%${query}%,categories.ilike.%${query}%`,
      )
      .order("priority_score", { ascending: false, nullsFirst: false })
      .limit(Math.min(limit ?? 10, 20));

    if (city) q = q.ilike("city", `%${city}%`);
    if (category) q = q.ilike("main_category", `%${category}%`);

    const { data, error } = await q;

    if (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }

    const results = (data ?? []).map((b) => ({
      name: b.name,
      city: b.city,
      neighborhood: b.neighborhood,
      category: b.main_category,
      rating: b.computed_rating,
      review_count: b.total_review_count,
      price_range: b.manual_price_range ?? (b.min_price ? `from ${b.min_price} MAD` : null),
      hook: b.hook_fr ?? b.hook_en,
      url: b.slug ? `https://oneworldmorocco.com/${b.slug}` : null,
    }));

    return {
      content: [
        {
          type: "text",
          text: results.length
            ? JSON.stringify(results, null, 2)
            : "No businesses found for this query.",
        },
      ],
      structuredContent: { results, count: results.length },
    };
  },
});

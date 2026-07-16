import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const SUPABASE_URL = "https://plnphgdrawpsnumnejzc.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsbnBoZ2RyYXdwc251bW5lanpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNjA5ODcsImV4cCI6MjA4NTgzNjk4N30.RwHKmL6E0Gd2LTVvDkfYx5RkZ-k7LKKp4iUoCS34pW4";

export default defineTool({
  name: "list_businesses_near_poi",
  title: "List One World Morocco businesses linked to a POI",
  description:
    "For a given point of interest name (e.g. 'Jemaa el-Fna', 'Jardin Majorelle', 'Skala de la Kasbah'), return the curated businesses explicitly linked to that POI (walking distance / cluster). Use for 'near / around / next to <landmark>' questions.",
  inputSchema: {
    poi: z.string().min(1).describe("POI name (French). Fuzzy match on `points_of_interest.name_fr`."),
    limit: z.number().int().min(1).max(30).optional().describe("Max businesses (1-30, default 15)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ poi, limit }) => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: pois, error: poiErr } = await supabase
      .from("points_of_interest")
      .select("id, name_fr, city_id, latitude, longitude, wikipedia_fr")
      .ilike("name_fr", `%${poi}%`)
      .limit(3);

    if (poiErr) return { content: [{ type: "text", text: `Error: ${poiErr.message}` }], isError: true };
    if (!pois || !pois.length) {
      return { content: [{ type: "text", text: `No POI matching '${poi}'.` }], isError: true };
    }

    const poiIds = pois.map((p: any) => p.id);
    const { data: links, error: linkErr } = await supabase
      .from("business_poi_businesses")
      .select("business_id, poi_business_id")
      .in("poi_business_id", poiIds);

    if (linkErr) return { content: [{ type: "text", text: `Error: ${linkErr.message}` }], isError: true };

    const bizIds = [...new Set((links || []).map((l: any) => l.business_id))];
    if (!bizIds.length) {
      return {
        content: [{ type: "text", text: `POI found but no linked businesses.` }],
        structuredContent: { poi: pois[0].name_fr, results: [], count: 0 },
      };
    }

    const { data: biz, error: bizErr } = await supabase
      .from("businesses")
      .select("name, slug, main_category, city, neighborhood, hook_fr, hook_en, computed_rating, total_review_count, min_price, manual_price_range, priority_score")
      .in("id", bizIds)
      .eq("is_active", true)
      .order("priority_score", { ascending: false, nullsFirst: false })
      .limit(Math.min(limit ?? 15, 30));

    if (bizErr) return { content: [{ type: "text", text: `Error: ${bizErr.message}` }], isError: true };

    const results = (biz || []).map((b: any) => ({
      name: b.name,
      category: b.main_category,
      city: b.city,
      neighborhood: b.neighborhood,
      rating: b.computed_rating,
      review_count: b.total_review_count,
      price_range: b.manual_price_range ?? (b.min_price ? `from ${b.min_price} MAD` : null),
      hook: b.hook_fr ?? b.hook_en,
      url: b.slug ? `https://oneworldmorocco.com/${b.slug}` : null,
    }));

    return {
      content: [{ type: "text", text: JSON.stringify({ poi: pois[0].name_fr, results }, null, 2) }],
      structuredContent: { poi: pois[0].name_fr, results, count: results.length },
    };
  },
});

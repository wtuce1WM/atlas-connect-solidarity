import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const SUPABASE_URL = "https://plnphgdrawpsnumnejzc.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsbnBoZ2RyYXdwc251bW5lanpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNjA5ODcsImV4cCI6MjA4NTgzNjk4N30.RwHKmL6E0Gd2LTVvDkfYx5RkZ-k7LKKp4iUoCS34pW4";

export default defineTool({
  name: "get_business",
  title: "Get One World Morocco business details",
  description:
    "Fetch the full public details of a single One World Morocco business by its slug (from the URL, e.g. 'dar-fragrance'). Returns description, address, phone, website, hours, ratings, prices and social links.",
  inputSchema: {
    slug: z
      .string()
      .min(1)
      .describe("Business slug from the oneworldmorocco.com URL, e.g. 'dar-fragrance'."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ slug }) => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase
      .from("businesses")
      .select(
        "name, slug, main_category, categories, city, neighborhood, address, phone, whatsapp, email, website, description, hook_fr, hook_en, opening_hours, computed_rating, total_review_count, min_price, manual_price_range, languages, booking_url, reserve_now_url, menu_url, instagram_url, facebook_url, tripadvisor_url",
      )
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }

    if (!data) {
      return {
        content: [{ type: "text", text: `No business found with slug '${slug}'.` }],
        isError: true,
      };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { business: { ...data, url: `https://oneworldmorocco.com/${data.slug}` } },
    };
  },
});

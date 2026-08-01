import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const SUPABASE_URL = "https://plnphgdrawpsnumnejzc.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsbnBoZ2RyYXdwc251bW5lanpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNjA5ODcsImV4cCI6MjA4NTgzNjk4N30.RwHKmL6E0Gd2LTVvDkfYx5RkZ-k7LKKp4iUoCS34pW4";

export default defineTool({
  name: "get_business_media",
  title: "Get One World Morocco business media",
  description:
    "Fetch every public media asset of a One World Morocco business by slug (e.g. 'riad-dar-najat'): photo URLs with their titles and descriptions, logo, YouTube videos (id, title, thumbnail, duration, short or long), external video links, virtual tour, PDF/flipbook documents, menus and AI menu summaries. Useful to build visual mockups, moodboards or design work from real assets.",
  inputSchema: {
    slug: z
      .string()
      .min(1)
      .describe("Business slug from the oneworldmorocco.com URL, e.g. 'riad-dar-najat'."),
    max_images: z
      .number()
      .int()
      .min(1)
      .max(60)
      .optional()
      .describe("Maximum number of photo URLs to return (default 30)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ slug, max_images }) => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: business, error } = await supabase
      .from("businesses")
      .select(
        "id, name, slug, main_category, city, neighborhood, logo_url, logo_2_url, images, popup_image_url, video_1_url, youtube_url, vimeo_url, matterport_url, flipbook_url, pdf_url, pdf_2_url, pdf_3_url, menu_url",
      )
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
    if (!business) {
      return {
        content: [{ type: "text", text: `No active business found with slug '${slug}'.` }],
        isError: true,
      };
    }

    const limit = max_images ?? 30;

    const [titlesRes, videosRes, docsRes, summariesRes] = await Promise.all([
      supabase
        .from("business_image_titles")
        .select("image_url, title, description, title_en, description_en")
        .eq("business_id", business.id),
      supabase
        .from("business_youtube_videos")
        .select("video_id, title, thumbnail, custom_thumbnail_url, duration_seconds, is_short, published_at, sort_order")
        .eq("business_id", business.id)
        .eq("is_visible", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("business_documents")
        .select("type, name, url, language, description, thumbnail_url, price, price_type, sort_order")
        .eq("business_id", business.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("business_menu_summaries")
        .select("title, content, avg_price_range, price_details, sort_order")
        .eq("business_id", business.id)
        .order("sort_order", { ascending: true }),
    ]);

    const titleByUrl = new Map<string, { title?: string | null; description?: string | null }>();
    for (const row of titlesRes.data ?? []) {
      titleByUrl.set(row.image_url, {
        title: row.title ?? row.title_en ?? null,
        description: row.description ?? row.description_en ?? null,
      });
    }

    const images = (Array.isArray(business.images) ? business.images : [])
      .filter((u): u is string => typeof u === "string" && u.length > 0)
      .slice(0, limit)
      .map((url, index) => ({
        position: index + 1,
        url,
        title: titleByUrl.get(url)?.title ?? null,
        description: titleByUrl.get(url)?.description ?? null,
      }));

    const youtubeVideos = (videosRes.data ?? []).map((v) => ({
      video_id: v.video_id,
      title: v.title,
      thumbnail: v.custom_thumbnail_url ?? v.thumbnail ?? null,
      duration_seconds: v.duration_seconds,
      is_short: v.is_short,
      published_at: v.published_at,
      watch_url: `https://www.youtube.com/watch?v=${v.video_id}`,
    }));

    const payload = {
      business: {
        name: business.name,
        slug: business.slug,
        main_category: business.main_category,
        city: business.city,
        neighborhood: business.neighborhood,
        url: `https://oneworldmorocco.com/${business.slug}`,
      },
      logo: { primary: business.logo_url ?? null, secondary: business.logo_2_url ?? null },
      popup_image_url: business.popup_image_url ?? null,
      images_count: Array.isArray(business.images) ? business.images.length : 0,
      images,
      youtube_channel_url: business.youtube_url ?? null,
      youtube_videos: youtubeVideos,
      external_videos: [business.video_1_url, business.vimeo_url].filter(Boolean),
      virtual_tour_url: business.matterport_url ?? null,
      documents: (docsRes.data ?? []).map((d) => ({
        type: d.type,
        name: d.name,
        url: d.url,
        language: d.language,
        description: d.description,
        thumbnail_url: d.thumbnail_url,
        price: d.price,
        price_type: d.price_type,
      })),
      flipbook_url: business.flipbook_url ?? null,
      pdfs: [business.pdf_url, business.pdf_2_url, business.pdf_3_url].filter(Boolean),
      menu_url: business.menu_url ?? null,
      menu_summaries: summariesRes.data ?? [],
    };

    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});

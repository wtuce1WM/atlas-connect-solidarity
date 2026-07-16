import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const SUPABASE_URL = "https://plnphgdrawpsnumnejzc.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsbnBoZ2RyYXdwc251bW5lanpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNjA5ODcsImV4cCI6MjA4NTgzNjk4N30.RwHKmL6E0Gd2LTVvDkfYx5RkZ-k7LKKp4iUoCS34pW4";

export default defineTool({
  name: "get_business_relations",
  title: "Get related POIs, destinations and events for a business",
  description:
    "For a One World Morocco business (by slug), return the linked points of interest (nearby attractions), destinations (tourist zones), and events. Use to answer 'what's around', 'what's happening at', 'which zone' questions.",
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

    const { data: biz, error: bizErr } = await supabase
      .from("businesses")
      .select("id, name, slug, city, neighborhood")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (bizErr) return { content: [{ type: "text", text: `Error: ${bizErr.message}` }], isError: true };
    if (!biz) return { content: [{ type: "text", text: `No business found with slug '${slug}'.` }], isError: true };

    const [poiLinks, destLinks, evtLinks] = await Promise.all([
      supabase.from("business_poi_businesses").select("poi_business_id").eq("business_id", biz.id),
      supabase.from("business_destinations").select("destination_id").eq("business_id", biz.id),
      supabase.from("event_businesses").select("event_id").eq("business_id", biz.id),
    ]);

    const poiIds = (poiLinks.data || []).map((r: any) => r.poi_business_id).filter(Boolean);
    const destIds = (destLinks.data || []).map((r: any) => r.destination_id).filter(Boolean);
    const evtIds = (evtLinks.data || []).map((r: any) => r.event_id).filter(Boolean);

    const [poisRes, destsRes, evtsRes] = await Promise.all([
      poiIds.length
        ? supabase.from("points_of_interest").select("id, name_fr, latitude, longitude, wikipedia_fr, official_site_fr, hook").in("id", poiIds)
        : Promise.resolve({ data: [] as any[] }),
      destIds.length
        ? supabase.from("destinations").select("id, name_fr, region, latitude, longitude, wikipedia_fr, hook_fr").in("id", destIds)
        : Promise.resolve({ data: [] as any[] }),
      evtIds.length
        ? supabase.from("events").select("id, name, hook, start_date, end_date, start_time, end_time, recurrence, days_of_week, url, latitude, longitude").in("id", evtIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const payload = {
      business: {
        name: biz.name,
        slug: biz.slug,
        city: biz.city,
        neighborhood: biz.neighborhood,
        url: `https://oneworldmorocco.com/${biz.slug}`,
      },
      nearby_attractions: (poisRes.data || []).map((p: any) => ({
        name: p.name_fr,
        latitude: p.latitude,
        longitude: p.longitude,
        wikipedia: p.wikipedia_fr,
        official_site: p.official_site_fr,
        hook: p.hook,
      })),
      destinations: (destsRes.data || []).map((d: any) => ({
        name: d.name_fr,
        region: d.region,
        latitude: d.latitude,
        longitude: d.longitude,
        wikipedia: d.wikipedia_fr,
        hook: d.hook_fr,
      })),
      events: (evtsRes.data || []).map((ev: any) => ({
        name: ev.name,
        hook: ev.hook,
        start_date: ev.start_date,
        end_date: ev.end_date,
        start_time: ev.start_time,
        end_time: ev.end_time,
        recurrence: ev.recurrence,
        days_of_week: ev.days_of_week,
        url: ev.url,
      })),
    };

    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});

// Aggregates all stable global Home queries in a single round-trip.
// Cached at the CDN edge for 60s, stale-while-revalidate 5min.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const [
      entriesRes,
      linksRes,
      svcLinksRes,
      badgeLinksRes,
      subsRes,
      servicesRes,
      badgesRes,
      genericRes,
    ] = await Promise.all([
      supabase.from("front_structure").select("*").order("sort_order"),
      supabase.from("front_structure_subcategories").select("*"),
      supabase.from("front_structure_services").select("*"),
      supabase.from("front_structure_badges").select("*"),
      supabase.from("subcategories").select("id, name_fr, category_id"),
      supabase.from("services").select("id, name_fr").eq("is_active", true),
      supabase.from("badges").select("id, name_fr"),
      supabase.from("generic_videos").select("id"),
    ]);

    const subMap: Record<string, string> = {};
    (subsRes.data || []).forEach((s: any) => { subMap[s.id] = s.name_fr; });

    const svcMap: Record<string, string> = {};
    (servicesRes.data || []).forEach((s: any) => { svcMap[s.id] = s.name_fr; });

    const linksByEntry: Record<string, string[]> = {};
    (linksRes.data || []).forEach((l: any) => {
      (linksByEntry[l.front_structure_id] ||= []).push(l.subcategory_id);
    });
    const svcLinksByEntry: Record<string, string[]> = {};
    (svcLinksRes.data || []).forEach((l: any) => {
      (svcLinksByEntry[l.front_structure_id] ||= []).push(l.service_id);
    });
    const badgeLinksByEntry: Record<string, string[]> = {};
    (badgeLinksRes.data || []).forEach((l: any) => {
      (badgeLinksByEntry[l.front_structure_id] ||= []).push(l.badge_id);
    });

    const entries = (entriesRes.data || [])
      .filter((e: any) => e.show_in_menu !== false)
      .map((e: any) => ({
        id: e.id,
        name: e.name,
        sort_order: e.sort_order,
        subcategory_ids: linksByEntry[e.id] || [],
        service_ids: svcLinksByEntry[e.id] || [],
        badge_ids: badgeLinksByEntry[e.id] || [],
      }));

    const badgeNames: Record<string, string> = {};
    (badgesRes.data || []).forEach((b: any) => { badgeNames[b.id] = b.name_fr; });

    const genericVideoIds = ((genericRes.data || []) as any[]).map((r) => r.id);

    return new Response(
      JSON.stringify({
        frontStructure: { entries, subcatNames: subMap, serviceNames: svcMap },
        badgeNames,
        genericVideoIds,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

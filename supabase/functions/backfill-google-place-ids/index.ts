import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { assertStaff } from "../_shared/auth-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Find Google Place ID using Nearby Search (lat/lng + name keyword).
 * More accurate than text-based search because it constrains by exact coordinates.
 */
async function findPlaceIdByLocation(
  lat: number,
  lng: number,
  name: string,
  apiKey: string,
): Promise<string | null> {
  // Search within a 100m radius around the exact lat/lng
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=100&keyword=${encodeURIComponent(name)}&key=${apiKey}`;
  const resp = await fetch(url);
  const data = await resp.json();
  if (data.status === "OK" && data.results?.length > 0) {
    return data.results[0].place_id ?? null;
  }
  // Fallback: wider radius (500m) if nothing found nearby
  const fallbackUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=500&keyword=${encodeURIComponent(name)}&key=${apiKey}`;
  const fallbackResp = await fetch(fallbackUrl);
  const fallbackData = await fallbackResp.json();
  if (fallbackData.status === "OK" && fallbackData.results?.length > 0) {
    return fallbackData.results[0].place_id ?? null;
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await assertStaff(req, corsHeaders);
  if (auth instanceof Response) return auth;

  try {
    const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GOOGLE_MAPS_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Number(body.limit) || 50, 200);
    const dryRun = body.dryRun === true;

    // Fetch businesses without google_place_id but with coordinates
    const { data: businesses, error } = await supabase
      .from("businesses")
      .select("id, name, latitude, longitude")
      .eq("is_active", true)
      .is("google_place_id", null)
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .not("google_maps_url", "is", null)
      .limit(limit);

    if (error) throw error;

    const results = {
      processed: 0,
      updated: 0,
      not_found: [] as { id: string; name: string }[],
      updates: [] as { id: string; name: string; place_id: string }[],
    };

    for (const biz of businesses || []) {
      results.processed++;
      const placeId = await findPlaceIdByLocation(
        biz.latitude,
        biz.longitude,
        biz.name,
        apiKey,
      );
      if (placeId) {
        if (!dryRun) {
          const reviewUrl = `https://search.google.com/local/writereview?placeid=${placeId}`;
          await supabase
            .from("businesses")
            .update({
              google_place_id: placeId,
              google_review_url: reviewUrl,
            })
            .eq("id", biz.id);
        }
        results.updated++;
        results.updates.push({ id: biz.id, name: biz.name, place_id: placeId });
      } else {
        results.not_found.push({ id: biz.id, name: biz.name });
      }
    }

    return new Response(JSON.stringify(results, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Backfill error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

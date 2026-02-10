import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Follow redirects to get the final URL
    const response = await fetch(url, { redirect: "follow" });
    const finalUrl = response.url;

    let lat: string | null = null;
    let lng: string | null = null;

    // Try @lat,lng
    const atMatch = finalUrl.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (atMatch) {
      lat = atMatch[1];
      lng = atMatch[2];
    }

    // Try ?q=lat,lng or place/lat,lng
    if (!lat) {
      const qMatch = finalUrl.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/) ||
                      finalUrl.match(/place\/(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (qMatch) {
        lat = qMatch[1];
        lng = qMatch[2];
      }
    }

    // Try !3d...!4d...
    if (!lat) {
      const embedMatch = finalUrl.match(/!3d(-?\d+\.?\d*).*!4d(-?\d+\.?\d*)/);
      if (embedMatch) {
        lat = embedMatch[1];
        lng = embedMatch[2];
      }
    }

    // Also try parsing the HTML body for coordinates if URL parsing failed
    if (!lat) {
      const body = await response.text();
      const bodyMatch = body.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/) ||
                        body.match(/center=(-?\d+\.?\d*)%2C(-?\d+\.?\d*)/) ||
                        body.match(/ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (bodyMatch) {
        lat = bodyMatch[1];
        lng = bodyMatch[2];
      }
    }

    if (lat && lng) {
      return new Response(JSON.stringify({ lat, lng, resolvedUrl: finalUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Could not extract coordinates", resolvedUrl: finalUrl }), {
      status: 422,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

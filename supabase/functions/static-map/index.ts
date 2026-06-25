// Public proxy to Google Static Maps API.
// Used by Remotion (GitHub Actions) to render a map without exposing the API key.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const lat = parseFloat(url.searchParams.get("lat") || "");
    const lng = parseFloat(url.searchParams.get("lng") || "");
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return new Response(JSON.stringify({ error: "lat/lng required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const zoom = url.searchParams.get("zoom") || "15";
    const size = url.searchParams.get("size") || "640x640";
    const scale = url.searchParams.get("scale") || "2";
    const maptype = url.searchParams.get("maptype") || "roadmap";

    const key = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!key) {
      return new Response(JSON.stringify({ error: "GOOGLE_MAPS_API_KEY missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const params = new URLSearchParams({
      center: `${lat},${lng}`,
      zoom,
      size,
      scale,
      maptype,
      key,
    });
    // Marker invisible (le pin animé est dessiné par Remotion par-dessus)
    // mais on garde un marker discret pour cohérence visuelle au cas où.
    params.append("markers", `size:tiny|color:0xC04F17|${lat},${lng}`);

    const gUrl = `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
    const res = await fetch(gUrl);
    if (!res.ok) {
      const text = await res.text();
      return new Response(JSON.stringify({ error: "google_static_map_failed", status: res.status, body: text.slice(0, 500) }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const buf = await res.arrayBuffer();
    return new Response(buf, {
      headers: {
        ...corsHeaders,
        "Content-Type": res.headers.get("Content-Type") || "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

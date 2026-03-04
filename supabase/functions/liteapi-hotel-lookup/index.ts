const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LITEAPI_BASE = "https://api.liteapi.travel/v3.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("LITEAPI_API_KEY");
    if (!apiKey) throw new Error("LITEAPI_API_KEY not configured");

    const { cityName, countryCode } = await req.json();
    if (!cityName) throw new Error("cityName is required");

    const params = new URLSearchParams({
      cityName,
      countryCode: countryCode || "MA",
    });

    console.log(`LiteAPI hotel lookup: ${cityName}, ${countryCode || "MA"}`);

    const res = await fetch(`${LITEAPI_BASE}/data/hotels?${params}`, {
      headers: {
        "X-API-Key": apiKey,
        Accept: "application/json",
      },
    });

    const body = await res.json();

    if (!res.ok || body.error) {
      console.error("LiteAPI lookup error:", JSON.stringify(body).slice(0, 1000));
      throw new Error(body.error?.message || body.message || `LiteAPI error [${res.status}]`);
    }

    const hotels = (body.data || []).map((h: Record<string, unknown>) => ({
      hotelId: h.id || h.hotelId || "",
      name: (h.name as string) || "Unknown",
      address: (h.address as string) || "",
      city: (h.city as string) || cityName,
      starRating: h.starRating ? Number(h.starRating) : null,
      mainPhoto: (h.main_photo as string) || null,
      latitude: h.latitude ? Number(h.latitude) : null,
      longitude: h.longitude ? Number(h.longitude) : null,
    }));

    console.log(`LiteAPI lookup: ${hotels.length} hotels found for ${cityName}`);

    return new Response(
      JSON.stringify({ data: hotels, count: hotels.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

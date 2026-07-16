import { assertStaff } from "../_shared/auth-helpers.ts";

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

  const staffCheck = await assertStaff(req, corsHeaders);
  if (staffCheck instanceof Response) return staffCheck;

  try {
    const apiKey = Deno.env.get("LITEAPI_API_KEY");
    if (!apiKey) throw new Error("LITEAPI_API_KEY not configured");

    const body = await req.json();
    const { cityName, countryCode, hotelIds } = body;

    let url: string;

    if (hotelIds && Array.isArray(hotelIds) && hotelIds.length > 0) {
      // Lookup by specific hotel IDs
      const idsParam = hotelIds.join(",");
      url = `${LITEAPI_BASE}/data/hotels?hotelIds=${encodeURIComponent(idsParam)}`;
      console.log(`LiteAPI hotel lookup by IDs: ${hotelIds.length} hotels`);
    } else if (cityName) {
      // Lookup by city
      const params = new URLSearchParams({
        cityName,
        countryCode: countryCode || "MA",
      });
      url = `${LITEAPI_BASE}/data/hotels?${params}`;
      console.log(`LiteAPI hotel lookup: ${cityName}, ${countryCode || "MA"}`);
    } else {
      throw new Error("cityName or hotelIds is required");
    }

    const res = await fetch(url, {
      headers: {
        "X-API-Key": apiKey,
        Accept: "application/json",
      },
    });

    const resBody = await res.json();

    if (!res.ok || resBody.error) {
      console.error("LiteAPI lookup error:", JSON.stringify(resBody).slice(0, 1000));
      throw new Error(resBody.error?.message || resBody.message || `LiteAPI error [${res.status}]`);
    }

    const hotels = (resBody.data || []).map((h: Record<string, unknown>) => ({
      hotelId: h.id || h.hotelId || "",
      name: (h.name as string) || "Unknown",
      address: (h.address as string) || "",
      city: (h.city as string) || cityName || "",
      starRating: h.starRating ? Number(h.starRating) : null,
      mainPhoto: (h.main_photo as string) || null,
      latitude: h.latitude ? Number(h.latitude) : null,
      longitude: h.longitude ? Number(h.longitude) : null,
    }));

    console.log(`LiteAPI lookup: ${hotels.length} hotels found`);

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

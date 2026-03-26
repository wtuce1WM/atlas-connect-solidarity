const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SERPAPI_BASE = "https://serpapi.com/search.json";

interface SerpApiRequest {
  cityName: string;
  checkIn: string;
  checkOut: string;
  adults?: number;
  currency?: string;
  language?: string;
  country?: string;
  sort?: number; // 3=lowest price, 8=highest rating, 13=most reviewed
  minPrice?: number;
  maxPrice?: number;
  rating?: number; // min rating filter (e.g. 7, 8, 9)
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("SERPAPI_API_KEY");
    if (!apiKey) throw new Error("SERPAPI_API_KEY not configured");

    const params: SerpApiRequest = await req.json();
    if (!params.cityName) throw new Error("cityName is required");
    if (!params.checkIn) throw new Error("checkIn is required");
    if (!params.checkOut) throw new Error("checkOut is required");

    const searchParams = new URLSearchParams({
      engine: "google_hotels",
      q: `Hotels in ${params.cityName}`,
      check_in_date: params.checkIn,
      check_out_date: params.checkOut,
      adults: String(params.adults || 2),
      currency: params.currency || "EUR",
      hl: params.language || "fr",
      gl: params.country || "ma",
      api_key: apiKey,
    });

    if (params.sort) searchParams.set("sort_by", String(params.sort));
    if (params.minPrice) searchParams.set("min_price", String(params.minPrice));
    if (params.maxPrice) searchParams.set("max_price", String(params.maxPrice));
    if (params.rating) searchParams.set("rating", String(params.rating));

    const url = `${SERPAPI_BASE}?${searchParams}`;
    console.log("SerpApi request:", url.replace(apiKey, "***"));

    const res = await fetch(url);
    const body = await res.json();

    if (!res.ok || body.error) {
      console.error("SerpApi error:", JSON.stringify(body).slice(0, 1000));
      throw new Error(body.error || `SerpApi error [${res.status}]`);
    }

    // Map properties to a normalized format
    const properties = (body.properties || []).map((p: Record<string, unknown>, idx: number) => {
      const prices = p.rate_per_night as Record<string, unknown> | undefined;
      const totalPrice = p.total_rate as Record<string, unknown> | undefined;
      const gps = p.gps_coordinates as Record<string, number> | undefined;
      const overallRating = p.overall_rating as number | undefined;
      const reviews = p.reviews as number | undefined;
      const images = (p.images as { thumbnail?: string; original_image?: string }[]) || [];
      const nearbyPlaces = p.nearby_places as Record<string, unknown>[] | undefined;

      return {
        position: idx + 1,
        name: p.name || "Unknown",
        type: p.type || null,
        hotelClass: p.hotel_class || null,
        description: p.description || null,
        link: p.link || null,
        ratePerNight: prices ? {
          amount: (prices.lowest as string) || (prices.extracted_lowest as string) || null,
          currency: params.currency || "EUR",
        } : null,
        totalRate: totalPrice ? {
          amount: (totalPrice.lowest as string) || (totalPrice.extracted_lowest as string) || null,
          currency: params.currency || "EUR",
        } : null,
        priceBeforeDiscount: prices?.before_taxes_fees || null,
        dealDescription: p.deal_description || p.deal || null,
        checkIn: p.check_in_time || null,
        checkOut: p.check_out_time || null,
        overallRating: overallRating || null,
        reviewCount: reviews || null,
        locationRating: (p.location_rating as number) || null,
        amenities: (p.amenities as string[]) || [],
        latitude: gps?.latitude || null,
        longitude: gps?.longitude || null,
        images: images.slice(0, 10).map(img => img.original_image || img.thumbnail).filter(Boolean),
        thumbnail: (p.images as { thumbnail?: string }[])?.[0]?.thumbnail || null,
        nearbyPlaces: nearbyPlaces || [],
        serpApiPropertyId: p.property_token || null,
      };
    });

    // Also return brands if available
    const brands = body.brands || [];

    console.log(`SerpApi: ${properties.length} hotels found for ${params.cityName}`);

    return new Response(
      JSON.stringify({
        data: properties,
        count: properties.length,
        brands,
        searchInfo: {
          query: body.search_parameters?.q,
          checkIn: params.checkIn,
          checkOut: params.checkOut,
        },
      }),
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

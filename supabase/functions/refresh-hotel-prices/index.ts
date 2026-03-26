import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SERPAPI_BASE = "https://serpapi.com/search.json";

interface MappedHotel {
  business_id: string;
  city: string;
  source: "serpapi" | "liteapi";
  external_id: string; // serp_hotel_name or liteapi_hotel_id
}

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}
function dayAfterTomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const serpApiKey = Deno.env.get("SERPAPI_API_KEY");
    const liteApiKey = Deno.env.get("LITEAPI_API_KEY");

    // 1. Get all SerpAPI mappings
    const { data: serpMappings } = await supabase
      .from("hotel_mappings")
      .select("business_id, serp_hotel_name, city");

    // 2. Get all LiteAPI mappings
    const { data: liteRaw } = await supabase
      .from("hotel_api_mappings")
      .select("business_id, liteapi_hotel_id");

    // Get cities for LiteAPI mapped businesses
    const liteBusinessIds = (liteRaw || []).map((m) => m.business_id);
    const { data: liteBizData } = liteBusinessIds.length
      ? await supabase
          .from("businesses")
          .select("id, city")
          .in("id", liteBusinessIds)
      : { data: [] };

    const bizCityMap = new Map(
      (liteBizData || []).map((b: any) => [b.id, b.city])
    );

    // Group by city for SerpAPI batch fetching
    const serpByCityMap = new Map<string, MappedHotel[]>();
    for (const m of serpMappings || []) {
      const city = m.city || "Unknown";
      if (!serpByCityMap.has(city)) serpByCityMap.set(city, []);
      serpByCityMap.get(city)!.push({
        business_id: m.business_id,
        city,
        source: "serpapi",
        external_id: m.serp_hotel_name,
      });
    }

    const checkIn = tomorrow();
    const checkOut = dayAfterTomorrow();
    const results: any[] = [];
    let errors: string[] = [];

    // ---- SERPAPI: fetch by city ----
    if (serpApiKey) {
      for (const [city, hotels] of serpByCityMap) {
        try {
          const params = new URLSearchParams({
            engine: "google_hotels",
            q: `Hotels in ${city}`,
            check_in_date: checkIn,
            check_out_date: checkOut,
            adults: "2",
            currency: "EUR",
            hl: "fr",
            gl: "ma",
            api_key: serpApiKey,
          });

          // Fetch up to 3 pages to find all mapped hotels
          let allProperties: any[] = [];
          let nextPageToken: string | null = null;
          for (let page = 0; page < 3; page++) {
            if (nextPageToken)
              params.set("next_page_token", nextPageToken);
            const res = await fetch(`${SERPAPI_BASE}?${params}`);
            const body = await res.json();
            if (!res.ok) break;
            allProperties = allProperties.concat(body.properties || []);
            nextPageToken =
              body.serpapi_pagination?.next_page_token || null;
            if (!nextPageToken) break;
          }

          // Match each mapped hotel by name
          for (const hotel of hotels) {
            const normName = hotel.external_id
              .toLowerCase()
              .trim();
            const found = allProperties.find((p: any) =>
              (p.name || "").toLowerCase().trim() === normName
            );

            const prices = found?.rate_per_night;
            const price =
              prices?.extracted_lowest || prices?.lowest
                ? parseFloat(
                    String(
                      prices.extracted_lowest || prices.lowest
                    ).replace(/[^0-9.]/g, "")
                  )
                : null;

            results.push({
              business_id: hotel.business_id,
              source: "serpapi",
              hotel_external_id: hotel.external_id,
              city: hotel.city,
              price_per_night: price,
              currency: "EUR",
              check_in: checkIn,
              check_out: checkOut,
              room_type: found ? "standard" : null,
              hotel_rating: found?.hotel_class
                ? String(found.hotel_class)
                : null,
              review_count: found?.reviews || null,
              raw_data: found
                ? {
                    name: found.name,
                    rate_per_night: found.rate_per_night,
                    total_rate: found.total_rate,
                    overall_rating: found.overall_rating,
                    hotel_class: found.hotel_class,
                  }
                : null,
              fetched_at: new Date().toISOString(),
            });
          }
        } catch (e: any) {
          errors.push(`SerpAPI ${city}: ${e.message}`);
        }
      }
    }

    // ---- LITEAPI: fetch per hotel ----
    if (liteApiKey) {
      for (const mapping of liteRaw || []) {
        try {
          const city = bizCityMap.get(mapping.business_id) || "Unknown";
          const hotelId = mapping.liteapi_hotel_id;

          const res = await fetch(
            `https://api.liteapi.travel/v3.0/data/rates?hotelIds=${hotelId}&checkin=${checkIn}&checkout=${checkOut}&adults=2&currency=EUR`,
            {
              headers: {
                "X-API-Key": liteApiKey,
                Accept: "application/json",
              },
            }
          );
          const body = await res.json();
          const hotelData = body?.data?.[0];
          const offer = hotelData?.roomTypes?.[0];
          const price = offer?.rates?.[0]?.retailRate?.total?.[0]?.amount
            ? parseFloat(offer.rates[0].retailRate.total[0].amount)
            : null;

          results.push({
            business_id: mapping.business_id,
            source: "liteapi",
            hotel_external_id: hotelId,
            city,
            price_per_night: price,
            currency: "EUR",
            check_in: checkIn,
            check_out: checkOut,
            room_type: offer?.name || null,
            hotel_rating: null,
            review_count: null,
            raw_data: hotelData
              ? { roomType: offer?.name, rates: offer?.rates?.[0] }
              : null,
            fetched_at: new Date().toISOString(),
          });
        } catch (e: any) {
          errors.push(`LiteAPI ${mapping.liteapi_hotel_id}: ${e.message}`);
        }
      }
    }

    // ---- Upsert all results ----
    if (results.length > 0) {
      const { error: upsertError } = await supabase
        .from("hotel_price_cache")
        .upsert(results, { onConflict: "business_id,source" });

      if (upsertError) {
        errors.push(`Upsert error: ${upsertError.message}`);
      }
    }

    console.log(
      `Refreshed ${results.length} hotel prices (${errors.length} errors)`
    );

    return new Response(
      JSON.stringify({
        refreshed: results.length,
        errors,
        checkIn,
        checkOut,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assertStaff } from "../_shared/auth-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SERPAPI_BASE = "https://serpapi.com/search.json";
const LITEAPI_BASE = "https://api.liteapi.travel/v3.0";

function checkInDate() {
  const d = new Date();
  d.setDate(d.getDate() + 15);
  return d.toISOString().slice(0, 10);
}
function checkOutDate() {
  const d = new Date();
  d.setDate(d.getDate() + 16);
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Allow server-to-server calls (pg_cron) authenticated with a valid service_role key,
  // otherwise require a signed-in staff user.
  const bearer = (req.headers.get("Authorization") || "").replace("Bearer ", "").trim();
  let isServiceCall = !!bearer && bearer === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!isServiceCall && bearer) {
    // Accept any signature-verified service_role token (e.g. legacy key stored in vault).
    try {
      const verifier = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
      );
      const { data: claimsData } = await verifier.auth.getClaims(bearer);
      if ((claimsData?.claims as Record<string, unknown> | undefined)?.role === "service_role") {
        isServiceCall = true;
      }
    } catch {
      // ignore — fall through to staff check
    }
  }
  if (!isServiceCall) {
    const auth = await assertStaff(req, corsHeaders);
    if (auth instanceof Response) return auth;
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const serpApiKey = Deno.env.get("SERPAPI_API_KEY");
    const liteApiKey = Deno.env.get("LITEAPI_API_KEY");

    const checkIn = checkInDate();
    const checkOut = checkOutDate();
    const resultsMap = new Map<string, any>(); // key: business_id+source
    const errors: string[] = [];

    // ---- SERPAPI ----
    if (serpApiKey) {
      const { data: serpMappings } = await supabase
        .from("hotel_mappings")
        .select("business_id, serp_hotel_name, city");

      // Group by city
      const byCity = new Map<string, typeof serpMappings>();
      for (const m of serpMappings || []) {
        const city = m.city || "Unknown";
        if (!byCity.has(city)) byCity.set(city, []);
        byCity.get(city)!.push(m);
      }

      for (const [city, hotels] of byCity) {
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

          let allProperties: any[] = [];
          let nextPageToken: string | null = null;
          for (let page = 0; page < 5; page++) {
            if (nextPageToken) params.set("next_page_token", nextPageToken);
            const res = await fetch(`${SERPAPI_BASE}?${params}`);
            const body = await res.json();
            if (!res.ok) break;
            allProperties = allProperties.concat(body.properties || []);
            nextPageToken = body.serpapi_pagination?.next_page_token || null;
            if (!nextPageToken) break;
          }

          for (const hotel of hotels!) {
            const key = `${hotel.business_id}:serpapi`;
            if (resultsMap.has(key)) continue; // skip duplicates

            const normName = hotel.serp_hotel_name.toLowerCase().trim();
            const found = allProperties.find(
              (p: any) => (p.name || "").toLowerCase().trim() === normName
            );

            const prices = found?.rate_per_night;
            const price =
              prices?.extracted_lowest || prices?.lowest
                ? parseFloat(
                    String(prices.extracted_lowest || prices.lowest).replace(/[^0-9.]/g, "")
                  )
                : null;

            resultsMap.set(key, {
              business_id: hotel.business_id,
              source: "serpapi",
              hotel_external_id: hotel.serp_hotel_name,
              city: hotel.city,
              price_per_night: price,
              currency: "EUR",
              check_in: checkIn,
              check_out: checkOut,
              room_type: found ? "standard" : null,
              hotel_rating: found?.hotel_class ? String(found.hotel_class) : null,
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

    // ---- LITEAPI: batch by city ----
    if (liteApiKey) {
      const { data: liteRaw } = await supabase
        .from("hotel_api_mappings")
        .select("business_id, liteapi_hotel_id");

      const liteBusinessIds = (liteRaw || []).map((m) => m.business_id);
      const { data: liteBizData } = liteBusinessIds.length
        ? await supabase.from("businesses").select("id, city").in("id", liteBusinessIds)
        : { data: [] };

      const bizCityMap = new Map((liteBizData || []).map((b: any) => [b.id, b.city]));

      // Group by city for batch requests
      const liteByCityMap = new Map<string, typeof liteRaw>();
      for (const m of liteRaw || []) {
        const city = bizCityMap.get(m.business_id) || "Unknown";
        if (!liteByCityMap.has(city)) liteByCityMap.set(city, []);
        liteByCityMap.get(city)!.push(m);
      }

      for (const [city, mappings] of liteByCityMap) {
        try {
          const hotelIds = mappings!.map((m) => m.liteapi_hotel_id);

          const ratesBody = {
            checkin: checkIn,
            checkout: checkOut,
            currency: "EUR",
            guestNationality: "FR",
            occupancies: [{ adults: 2 }],
            hotelIds,
          };

          const res = await fetch(`${LITEAPI_BASE}/hotels/rates`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-API-Key": liteApiKey,
              Accept: "application/json",
            },
            body: JSON.stringify(ratesBody),
          });

          const body = await res.json();
          const hotelsData = body?.data || [];

          for (const mapping of mappings!) {
            const key = `${mapping.business_id}:liteapi`;
            if (resultsMap.has(key)) continue;

            const hotelData = hotelsData.find(
              (h: any) => h.hotelId === mapping.liteapi_hotel_id
            );
            const offer = hotelData?.roomTypes?.[0];
            const rateInfo = offer?.rates?.[0]?.retailRate;
            const totalArr = rateInfo?.total || [];
            const price = totalArr[0]?.amount ? parseFloat(totalArr[0].amount) : null;

            resultsMap.set(key, {
              business_id: mapping.business_id,
              source: "liteapi",
              hotel_external_id: mapping.liteapi_hotel_id,
              city,
              price_per_night: price,
              currency: "EUR",
              check_in: checkIn,
              check_out: checkOut,
              room_type: offer?.name || null,
              hotel_rating: null,
              review_count: null,
              raw_data: hotelData
                ? { hotelId: hotelData.hotelId, roomType: offer?.name, rate: rateInfo }
                : null,
              fetched_at: new Date().toISOString(),
            });
          }
        } catch (e: any) {
          errors.push(`LiteAPI ${city}: ${e.message}`);
        }
      }
    }

    // ---- Upsert all ----
    const results = Array.from(resultsMap.values());
    if (results.length > 0) {
      const { error: upsertError } = await supabase
        .from("hotel_price_cache")
        .upsert(results, { onConflict: "business_id,source" });

      if (upsertError) {
        errors.push(`Upsert: ${upsertError.message}`);
      }
    }

    console.log(`Refreshed ${results.length} prices (${errors.length} errors)`);

    // Send email report
    try {
      const { error: emailError } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "hotel-price-report",
          recipientEmail: "jf@oneworldmorocco.com",
          idempotencyKey: `hotel-price-report-${checkIn}`,
          templateData: {
            refreshed: results.length,
            errorsCount: errors.length,
            errors,
            checkIn,
            checkOut,
            date: new Date().toLocaleDateString("fr-FR"),
          },
        },
      });
      if (emailError) console.error("Email report error:", emailError);
      else console.log("Email report sent to jf@oneworldmorocco.com");
    } catch (e: any) {
      console.error("Failed to send email report:", e.message);
    }

    return new Response(
      JSON.stringify({ refreshed: results.length, errors, checkIn, checkOut }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

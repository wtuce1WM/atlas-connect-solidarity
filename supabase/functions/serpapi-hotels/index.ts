import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { assertAllowedOrigin } from "../_shared/auth-helpers.ts";

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
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  maxPages?: number;
  skipCache?: boolean; // bypass cache for debugging / forced refresh
}

function normalizeCityKey(city: string): string {
  return city
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function mapProperty(p: Record<string, unknown>, idx: number, currency: string) {
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
      currency,
    } : null,
    totalRate: totalPrice ? {
      amount: (totalPrice.lowest as string) || (totalPrice.extracted_lowest as string) || null,
      currency,
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

    const currency = params.currency || "EUR";
    const language = params.language || "fr";
    const country = params.country || "ma";
    const adults = params.adults || 2;
    const cityKey = normalizeCityKey(params.cityName);

    // Supabase admin client (service role) for cache read/write
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Only cache "broad" queries (no price/rating filters) so cache stays reusable
    const isCacheable =
      !params.skipCache &&
      !params.minPrice &&
      !params.maxPrice &&
      !params.rating;

    // 1) Try cache
    if (isCacheable) {
      const { data: cached } = await supabase
        .from("serpapi_hotels_cache")
        .select("payload, hotel_count, fetched_at, expires_at")
        .eq("city_key", cityKey)
        .eq("check_in", params.checkIn)
        .eq("check_out", params.checkOut)
        .eq("adults", adults)
        .eq("currency", currency)
        .eq("language", language)
        .eq("country", country)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (cached?.payload) {
        console.log(`SerpApi cache HIT: ${cityKey} ${params.checkIn}→${params.checkOut} (${cached.hotel_count} hotels)`);
        return new Response(
          JSON.stringify({
            ...cached.payload,
            cached: true,
            fetchedAt: cached.fetched_at,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log(`SerpApi cache MISS: ${cityKey} ${params.checkIn}→${params.checkOut}`);
    }

    // 2) Cache miss → call SerpAPI
    const maxPages = Math.min(params.maxPages || 10, 10);
    const allProperties: ReturnType<typeof mapProperty>[] = [];
    let brands: unknown[] = [];
    let nextPageToken: string | null = null;
    let page = 0;

    while (page < maxPages) {
      const searchParams = new URLSearchParams({
        engine: "google_hotels",
        q: `Hotels in ${params.cityName}`,
        check_in_date: params.checkIn,
        check_out_date: params.checkOut,
        adults: String(adults),
        currency,
        hl: language,
        gl: country,
        api_key: apiKey,
      });

      if (nextPageToken) searchParams.set("next_page_token", nextPageToken);
      if (params.minPrice) searchParams.set("min_price", String(params.minPrice));
      if (params.maxPrice) searchParams.set("max_price", String(params.maxPrice));
      if (params.rating) searchParams.set("rating", String(params.rating));

      const url = `${SERPAPI_BASE}?${searchParams}`;
      console.log(`SerpApi page ${page + 1} request:`, url.replace(apiKey, "***"));

      const res = await fetch(url);
      const body = await res.json();

      if (!res.ok || body.error) {
        console.error("SerpApi error:", JSON.stringify(body).slice(0, 1000));
        throw new Error(body.error || `SerpApi error [${res.status}]`);
      }

      const pageProperties = (body.properties || []).map(
        (p: Record<string, unknown>, idx: number) => mapProperty(p, allProperties.length + idx, currency)
      );
      const seen = new Set(allProperties.map(h => (h.name as string).toLowerCase().trim()));
      for (const h of pageProperties) {
        const key = (h.name as string).toLowerCase().trim();
        if (!seen.has(key)) {
          seen.add(key);
          allProperties.push(h);
        }
      }

      if (page === 0) brands = body.brands || [];

      const pagination = body.serpapi_pagination;
      if (pagination?.next_page_token) {
        nextPageToken = pagination.next_page_token;
        page++;
      } else {
        break;
      }
    }

    console.log(`SerpApi: ${allProperties.length} hotels found for ${params.cityName} (${page + 1} page(s))`);

    const responsePayload = {
      data: allProperties,
      count: allProperties.length,
      pages: page + 1,
      brands,
      searchInfo: {
        query: `Hotels in ${params.cityName}`,
        checkIn: params.checkIn,
        checkOut: params.checkOut,
      },
    };

    // 3) Write to cache (fire-and-forget; never block response on cache write)
    if (isCacheable && allProperties.length > 0) {
      supabase
        .from("serpapi_hotels_cache")
        .upsert(
          {
            city_key: cityKey,
            check_in: params.checkIn,
            check_out: params.checkOut,
            adults,
            currency,
            language,
            country,
            payload: responsePayload,
            hotel_count: allProperties.length,
            fetched_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
          },
          { onConflict: "city_key,check_in,check_out,adults,currency,language,country" }
        )
        .then(({ error }) => {
          if (error) console.error("Cache write failed:", error.message);
          else console.log(`SerpApi cache WRITE: ${cityKey} ${params.checkIn}→${params.checkOut}`);
        });
    }

    return new Response(
      JSON.stringify({ ...responsePayload, cached: false }),
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

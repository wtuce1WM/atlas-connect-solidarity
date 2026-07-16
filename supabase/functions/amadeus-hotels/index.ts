import { createClient } from "npm:@supabase/supabase-js@2";
import { assertAllowedOrigin } from "../_shared/auth-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// In-memory token cache
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAmadeusToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.value;
  }

  const apiKey = Deno.env.get("AMADEUS_API_KEY");
  const apiSecret = Deno.env.get("AMADEUS_API_SECRET");
  if (!apiKey || !apiSecret) throw new Error("Amadeus credentials not configured");

  const res = await fetch("https://test.api.amadeus.com/v1/security/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=client_credentials&client_id=${apiKey}&client_secret=${apiSecret}`,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Amadeus auth failed [${res.status}]: ${err}`);
  }

  const data = await res.json();
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.value;
}

async function amadeusGet(path: string, params: Record<string, string>): Promise<unknown> {
  const token = await getAmadeusToken();
  const qs = new URLSearchParams(params).toString();
  const url = `https://test.api.amadeus.com${path}?${qs}`;

  console.log("Amadeus GET:", url);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const body = await res.json();
  if (!res.ok) {
    console.error("Amadeus API error:", JSON.stringify(body));
    throw new Error(body?.errors?.[0]?.detail || `Amadeus error [${res.status}]`);
  }
  return body;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const originCheck = assertAllowedOrigin(req, corsHeaders);
  if (originCheck instanceof Response) return originCheck;

  try {
    const { action, ...params } = await req.json();

    let result: unknown;

    switch (action) {
      // Step 1: Get hotel IDs for a city
      case "hotel-list": {
        const { cityCode, ratings, radius, radiusUnit } = params;
        if (!cityCode) throw new Error("cityCode is required");
        const qp: Record<string, string> = { cityCode };
        if (ratings) qp.ratings = ratings;
        if (radius) qp.radius = String(radius);
        if (radiusUnit) qp.radiusUnit = radiusUnit;
        result = await amadeusGet("/v1/reference-data/locations/hotels/by-city", qp);
        break;
      }

      // Step 2: Get offers/pricing for specific hotels
      case "hotel-offers": {
        const { hotelIds, checkInDate, checkOutDate, adults, roomQuantity, currency } = params;
        if (!hotelIds) throw new Error("hotelIds is required");
        if (!checkInDate) throw new Error("checkInDate is required");
        const qp: Record<string, string> = {
          hotelIds,
          checkInDate,
          adults: String(adults || 1),
          roomQuantity: String(roomQuantity || 1),
        };
        if (checkOutDate) qp.checkOutDate = checkOutDate;
        if (currency) qp.currency = currency;
        result = await amadeusGet("/v3/shopping/hotel-offers", qp);
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

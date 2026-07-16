import { assertAllowedOrigin } from "../_shared/auth-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Sabre CERT environment base URL
const SABRE_BASE = "https://api-crt.cert.havail.sabre.com";

// In-memory token cache
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getSabreToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.value;
  }

  const clientId = Deno.env.get("SABRE_CLIENT_ID");
  const clientSecret = Deno.env.get("SABRE_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error("Sabre credentials not configured (SABRE_CLIENT_ID / SABRE_CLIENT_SECRET)");
  }

  // Sabre OAuth2 requires Base64(Base64(clientId):Base64(clientSecret))
  const b64Id = btoa(clientId);
  const b64Secret = btoa(clientSecret);
  const credentials = btoa(`${b64Id}:${b64Secret}`);

  const res = await fetch(`${SABRE_BASE}/v2/auth/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Sabre auth failed [${res.status}]: ${err}`);
  }

  const data = await res.json();
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 604800) * 1000,
  };
  return cachedToken.value;
}

interface HotelAvailRequest {
  cityCode: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  rooms: number;
  ratings?: string; // e.g. "4,5"
  currency?: string;
}

interface SabreHotelResult {
  hotelId: string;
  name: string;
  cityCode: string;
  rating?: string;
  latitude?: number;
  longitude?: number;
  available: boolean;
  offers: {
    id: string;
    checkInDate: string;
    checkOutDate: string;
    room: {
      type: string;
      typeEstimated?: { category?: string; beds?: number; bedType?: string };
      description?: { text?: string };
    };
    price: { currency: string; total: string; base?: string };
    policies?: { paymentType?: string };
  }[];
}

async function searchHotels(params: HotelAvailRequest): Promise<SabreHotelResult[]> {
  const token = await getSabreToken();

  // Build GetHotelAvail v2 request body
  const requestBody: Record<string, unknown> = {
    GetHotelAvailRQ: {
      SearchCriteria: {
        OffSet: 1,
        SortBy: "TotalRate",
        SortOrder: "ASC",
        PageSize: 50,
        TierLabels: false,
        GeoSearch: {
          GeoRef: {
            Radius: 30,
            UOM: "KM",
            RefPoint: {
              Value: params.cityCode,
              ValueContext: "CODE",
              RefPointType: "6", // Airport code
            },
          },
        },
        RateInfos: {
          CurrencyCode: params.currency || "EUR",
          RateInfo: {
            StartDate: params.checkIn,
            EndDate: params.checkOut,
            Rooms: params.rooms || 1,
            Guests: params.adults || 2,
          },
        },
      },
    },
  };

  // Filter by star rating if provided
  if (params.ratings) {
    const ratingList = params.ratings.split(",").map((r) => parseInt(r.trim()));
    (requestBody.GetHotelAvailRQ as Record<string, unknown>).SearchCriteria = {
      ...((requestBody.GetHotelAvailRQ as Record<string, unknown>).SearchCriteria as Record<string, unknown>),
      HotelPref: {
        SabreRating: {
          Min: Math.min(...ratingList).toString(),
          Max: Math.max(...ratingList).toString(),
        },
      },
    };
  }

  console.log("Sabre GetHotelAvail request:", JSON.stringify(requestBody).slice(0, 500));

  const res = await fetch(`${SABRE_BASE}/v2/hotel/avail`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const body = await res.json();

  if (!res.ok) {
    console.error("Sabre API error:", JSON.stringify(body).slice(0, 1000));
    const errMsg = body?.errorCode
      ? `${body.errorCode}: ${body.message || ""}`
      : body?.GetHotelAvailRS?.ApplicationResults?.Error?.[0]?.SystemSpecificResults?.[0]?.Message || `Sabre error [${res.status}]`;
    throw new Error(errMsg);
  }

  // Parse Sabre response into our normalized format
  const hotelAvailInfos =
    body?.GetHotelAvailRS?.HotelAvailInfos?.HotelAvailInfo || [];

  const results: SabreHotelResult[] = [];

  for (const hotel of hotelAvailInfos) {
    const basicInfo = hotel.HotelInfo || {};
    const rateInfos = hotel.HotelRateInfo?.RateInfos?.RateInfo || [];
    const locationInfo = basicInfo.LocationInfo || {};

    // Get the best rate
    const rates = Array.isArray(rateInfos) ? rateInfos : [rateInfos];
    const offers = rates
      .filter((r: Record<string, unknown>) => r.CurrencyCode || r.AmountAfterTax)
      .map((r: Record<string, unknown>, idx: number) => {
        const rooms = r.Rooms as Record<string, unknown> | undefined;
        const room = rooms?.Room as Record<string, unknown> | undefined;
        return {
          id: `${basicInfo.HotelCode || ""}-${idx}`,
          checkInDate: params.checkIn,
          checkOutDate: params.checkOut,
          room: {
            type: (room?.RoomType as string) || "STANDARD",
            typeEstimated: {
              category: (room?.RoomDescription as string) || undefined,
              beds: undefined,
              bedType: undefined,
            },
            description: {
              text: (room?.RoomDescription as string) || (r.RoomDescription as string) || undefined,
            },
          },
          price: {
            currency: (r.CurrencyCode as string) || params.currency || "EUR",
            total: String(r.AmountAfterTax || r.AverageNightlyRate || "0"),
            base: r.AmountBeforeTax ? String(r.AmountBeforeTax) : undefined,
          },
          policies: {
            paymentType: (r.PaymentType as string) || undefined,
          },
        };
      });

    if (offers.length > 0) {
      results.push({
        hotelId: basicInfo.HotelCode || "",
        name: basicInfo.HotelName || "Unknown Hotel",
        cityCode: params.cityCode,
        rating: basicInfo.SabreRating || undefined,
        latitude: locationInfo.Latitude ? parseFloat(locationInfo.Latitude) : undefined,
        longitude: locationInfo.Longitude ? parseFloat(locationInfo.Longitude) : undefined,
        available: true,
        offers,
      });
    }
  }

  return results;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const originCheck = assertAllowedOrigin(req, corsHeaders);
  if (originCheck instanceof Response) return originCheck;

  try {
    const params: HotelAvailRequest = await req.json();

    if (!params.cityCode) throw new Error("cityCode is required");
    if (!params.checkIn) throw new Error("checkIn is required");
    if (!params.checkOut) throw new Error("checkOut is required");

    const results = await searchHotels(params);

    console.log(`Sabre: ${results.length} hotels found for ${params.cityCode} (${params.checkIn} → ${params.checkOut})`);

    return new Response(
      JSON.stringify({ data: results, count: results.length }),
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

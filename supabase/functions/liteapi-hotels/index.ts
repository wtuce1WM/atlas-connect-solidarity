const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LITEAPI_BASE = "https://api.liteapi.travel/v3.0";

// City code → lat/lng for LiteAPI geo search
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  RAK: { lat: 31.6295, lng: -7.9811 },
  CMN: { lat: 33.5731, lng: -7.5898 },
  FEZ: { lat: 34.0331, lng: -5.0003 },
  TNG: { lat: 35.7595, lng: -5.834 },
  AGA: { lat: 30.4278, lng: -9.5981 },
  ESU: { lat: 31.5085, lng: -9.7595 },
  RBA: { lat: 34.0209, lng: -6.8416 },
  OUD: { lat: 30.9189, lng: -6.8936 },
  NDR: { lat: 35.1681, lng: -2.9335 },
  OUJ: { lat: 34.6814, lng: -1.9086 },
};

interface SearchParams {
  cityCode: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  rooms: number;
  ratings?: string;
  currency?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("LITEAPI_API_KEY");
    if (!apiKey) throw new Error("LITEAPI_API_KEY not configured");

    const params: SearchParams = await req.json();
    if (!params.cityCode) throw new Error("cityCode is required");
    if (!params.checkIn) throw new Error("checkIn is required");
    if (!params.checkOut) throw new Error("checkOut is required");

    const coords = CITY_COORDS[params.cityCode];
    if (!coords) throw new Error(`Unknown city code: ${params.cityCode}`);

    const currency = params.currency || "EUR";
    const adultsPerRoom = params.adults || 2;
    const roomCount = params.rooms || 1;

    // Build occupancies array
    const occupancies = Array.from({ length: roomCount }, () => ({
      adults: adultsPerRoom,
    }));

    // Build request body for LiteAPI rates endpoint
    const ratesBody: Record<string, unknown> = {
      checkin: params.checkIn,
      checkout: params.checkOut,
      currency,
      guestNationality: "MA",
      occupancies,
      latitude: coords.lat,
      longitude: coords.lng,
      radius: 30000,
      limit: 50,
      includeHotelData: true,
    };

    // Star rating filter
    if (params.ratings) {
      const ratingList = params.ratings.split(",").map((r) => parseInt(r.trim()));
      ratesBody.starRatings = ratingList;
    }

    console.log("LiteAPI request:", JSON.stringify(ratesBody).slice(0, 500));

    const res = await fetch(`${LITEAPI_BASE}/hotels/rates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
        Accept: "application/json",
      },
      body: JSON.stringify(ratesBody),
    });

    const body = await res.json();

    if (!res.ok || body.error) {
      console.error("LiteAPI error:", JSON.stringify(body).slice(0, 1000));
      throw new Error(body.error?.message || body.message || `LiteAPI error [${res.status}]`);
    }

    // Normalize LiteAPI response to our common format
    const hotels = body.data || [];
    const results = hotels.map((hotel: Record<string, unknown>) => {
      const roomTypes = (hotel.roomTypes as Record<string, unknown>[]) || [];
      const offers = roomTypes.map((room: Record<string, unknown>, idx: number) => {
        const rates = (room.rates as Record<string, unknown>[]) || [];
        const bestRate = rates[0] || {};
        const retailRate = bestRate.retailRate as Record<string, unknown> | undefined;
        const totalArr = (retailRate?.total as { amount: number; currency: string }[]) || [];
        const totalPrice = totalArr[0];

        return {
          id: (room.offerId as string) || `${hotel.hotelId}-${idx}`,
          checkInDate: params.checkIn,
          checkOutDate: params.checkOut,
          room: {
            type: (room.name as string) || "STANDARD",
            typeEstimated: {
              category: (room.name as string) || undefined,
              beds: room.maxOccupancy ? Number(room.maxOccupancy) : undefined,
              bedType: undefined,
            },
            description: {
              text: (room.name as string) || undefined,
            },
          },
          price: {
            currency: totalPrice?.currency || currency,
            total: totalPrice ? String(totalPrice.amount) : "0",
            base: undefined,
          },
          policies: {
            paymentType: (bestRate.paymentType as string) || undefined,
          },
        };
      });

      const hotelData = hotel.hotelData as Record<string, unknown> | undefined;
      return {
        hotelId: (hotel.hotelId as string) || "",
        name: (hotelData?.name as string) || (hotel.name as string) || "Unknown Hotel",
        cityCode: params.cityCode,
        rating: (hotelData?.starRating as number) ? String(hotelData.starRating) : hotel.stars ? String(hotel.stars) : undefined,
        latitude: (hotelData?.latitude as number) || (hotel.latitude ? Number(hotel.latitude) : undefined),
        longitude: (hotelData?.longitude as number) || (hotel.longitude ? Number(hotel.longitude) : undefined),
        available: offers.length > 0,
        offers,
      };
    });

    const available = results.filter((r: Record<string, unknown>) => r.available);
    console.log(`LiteAPI: ${available.length} hotels found for ${params.cityCode}`);

    return new Response(
      JSON.stringify({ data: available, count: available.length }),
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

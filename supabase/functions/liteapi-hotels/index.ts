import { assertAllowedOrigin } from "../_shared/auth-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LITEAPI_BASE = "https://api.liteapi.travel/v3.0";

const CITY_NAMES: Record<string, string> = {
  RAK: "Marrakech",
  CMN: "Casablanca",
  FEZ: "Fez",
  TNG: "Tangier",
  AGA: "Agadir",
  ESU: "Essaouira",
  RBA: "Rabat",
  OUD: "Ouarzazate",
  NDR: "Nador",
  OUJ: "Oujda",
};

interface SearchParams {
  cityCode?: string;
  hotelIds?: string[];
  checkIn: string;
  checkOut: string;
  adults: number;
  rooms: number;
  ratings?: string;
  currency?: string;
  guestNationality?: string;
  fallbackCityName?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("LITEAPI_API_KEY");
    if (!apiKey) throw new Error("LITEAPI_API_KEY not configured");

    const params: SearchParams = await req.json();
    if (!params.hotelIds?.length && !params.cityCode && !params.fallbackCityName) throw new Error("cityCode, hotelIds, or fallbackCityName is required");
    if (!params.checkIn) throw new Error("checkIn is required");
    if (!params.checkOut) throw new Error("checkOut is required");

    const currency = params.currency || "EUR";
    const adultsPerRoom = params.adults || 2;
    const roomCount = params.rooms || 1;

    const occupancies = Array.from({ length: roomCount }, () => ({
      adults: adultsPerRoom,
    }));

    // Step 1: Search rates
    const ratesBody: Record<string, unknown> = {
      checkin: params.checkIn,
      checkout: params.checkOut,
      currency,
      guestNationality: params.guestNationality || "FR",
      occupancies,
      limit: 50,
    };

    // Search by hotelIds if provided, otherwise by city
    if (params.hotelIds && params.hotelIds.length > 0) {
      ratesBody.hotelIds = params.hotelIds;
    } else if (params.fallbackCityName) {
      ratesBody.cityName = params.fallbackCityName;
      ratesBody.countryCode = "MA";
    } else {
      const cityName = CITY_NAMES[params.cityCode!];
      if (!cityName) throw new Error(`Unknown city code: ${params.cityCode}`);
      ratesBody.cityName = cityName;
      ratesBody.countryCode = "MA";
    }

    if (params.ratings) {
      const ratingList = params.ratings.split(",").map((r) => parseInt(r.trim()));
      ratesBody.starRatings = ratingList;
    }

    console.log("LiteAPI rates request:", JSON.stringify(ratesBody).slice(0, 500));

    const ratesRes = await fetch(`${LITEAPI_BASE}/hotels/rates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
        Accept: "application/json",
      },
      body: JSON.stringify(ratesBody),
    });

    const ratesBody2 = await ratesRes.json();
    let rawHotels: Record<string, unknown>[] = [];
    let isFallback = false;

    if (!ratesRes.ok || ratesBody2.error) {
      const errMsg = ratesBody2.error?.message || ratesBody2.message || `LiteAPI error [${ratesRes.status}]`;
      // "no availability" is not a real error — just means no rooms for these dates
      const noAvail = /no availability|not found|no results/i.test(errMsg);
      if (noAvail) {
        console.log("LiteAPI: no availability for request");
        // If searching by hotelIds and fallbackCityName is provided, retry with city search
        if (params.hotelIds && params.fallbackCityName) {
          console.log(`Fallback: retrying with cityName=${params.fallbackCityName}`);
          const fallbackBody = {
            ...ratesBody,
            cityName: params.fallbackCityName,
            countryCode: "MA",
          };
          delete (fallbackBody as any).hotelIds;
          const fallbackRes = await fetch(`${LITEAPI_BASE}/hotels/rates`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-API-Key": apiKey,
              Accept: "application/json",
            },
            body: JSON.stringify(fallbackBody),
          });
          const fallbackData = await fallbackRes.json();
          if (fallbackRes.ok && fallbackData.data && fallbackData.data.length > 0) {
            // Process fallback results through the same pipeline below
            rawHotels = fallbackData.data;
            isFallback = true;
            console.log(`Fallback: found ${rawHotels.length} hotels in ${params.fallbackCityName}`);
          } else {
            return new Response(
              JSON.stringify({ data: [], count: 0, fallback: true }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } else {
          return new Response(
            JSON.stringify({ data: [], count: 0 }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        console.error("LiteAPI rates error:", JSON.stringify(ratesBody2).slice(0, 1000));
        throw new Error(errMsg);
      }
    }

    if (!rawHotels) {
      rawHotels = ratesBody2.data || [];
      // If hotelIds search returned 0 results and fallback is available, retry with city
      if (rawHotels.length === 0 && params.hotelIds && params.fallbackCityName) {
        console.log(`Fallback (empty results): retrying with cityName=${params.fallbackCityName}`);
        const fallbackBody2 = {
          ...ratesBody,
          cityName: params.fallbackCityName,
          countryCode: "MA",
        };
        delete (fallbackBody2 as any).hotelIds;
        const fb2Res = await fetch(`${LITEAPI_BASE}/hotels/rates`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": apiKey,
            Accept: "application/json",
          },
          body: JSON.stringify(fallbackBody2),
        });
        const fb2Data = await fb2Res.json();
        if (fb2Res.ok && fb2Data.data && fb2Data.data.length > 0) {
          rawHotels = fb2Data.data;
          isFallback = true;
          console.log(`Fallback: found ${rawHotels.length} hotels in ${params.fallbackCityName}`);
        }
      }
    }
    // Step 2: Fetch hotel details for all hotel IDs
    const hotelIds = rawHotels.map((h: Record<string, unknown>) => h.hotelId as string).filter(Boolean);
    let hotelDetailsMap: Record<string, Record<string, unknown>> = {};

    if (hotelIds.length > 0) {
      try {
        const idsParam = hotelIds.join(",");
        const detailsRes = await fetch(
          `${LITEAPI_BASE}/data/hotels?hotelIds=${encodeURIComponent(idsParam)}`,
          {
            headers: {
              "X-API-Key": apiKey,
              Accept: "application/json",
            },
          }
        );
        const detailsBody = await detailsRes.json();
        if (detailsRes.ok && detailsBody.data) {
          for (const h of detailsBody.data) {
            hotelDetailsMap[h.id || h.hotelId] = h;
          }
          console.log(`Fetched details for ${Object.keys(hotelDetailsMap).length} hotels`);
          // Log a sample
          const sampleKey = Object.keys(hotelDetailsMap)[0];
          if (sampleKey) {
            const s = hotelDetailsMap[sampleKey];
            console.log("Hotel detail sample keys:", Object.keys(s).join(", "));
            console.log("Hotel detail sample:", JSON.stringify(s).slice(0, 1500));
          }
        } else {
          console.error("Hotel details error:", JSON.stringify(detailsBody).slice(0, 500));
        }
      } catch (e) {
        console.error("Failed to fetch hotel details:", e);
      }
    }

    // Step 3: Map results
    const results = rawHotels.map((hotel: Record<string, unknown>) => {
      // roomTypes can be an array OR an object keyed by roomTypeId
      const rawRt = hotel.roomTypes;
      let roomList: Record<string, unknown>[] = [];
      if (Array.isArray(rawRt)) {
        roomList = rawRt;
      } else if (rawRt && typeof rawRt === "object") {
        roomList = Object.values(rawRt) as Record<string, unknown>[];
      }

      const offers = roomList.map((room: Record<string, unknown>, idx: number) => {
        const rates = (room.rates as Record<string, unknown>[]) || [];
        const bestRate = rates[0] || {};
        const retailRate = bestRate.retailRate as Record<string, unknown> | undefined;
        const totalArr = (retailRate?.total as { amount: number; currency: string }[]) || [];
        const totalPrice = totalArr[0];

        // Name is inside rates[0].name, NOT at roomType level
        const roomName = (bestRate.name as string)
          || (room.name as string)
          || (room.roomName as string)
          || "Standard";

        // Also check offerRetailRate as alternative price source
        const offerRetailRate = room.offerRetailRate as { amount?: number; currency?: string } | undefined;
        const finalPrice = totalPrice
          ? { amount: totalPrice.amount, currency: totalPrice.currency }
          : offerRetailRate
            ? { amount: offerRetailRate.amount || 0, currency: offerRetailRate.currency || currency }
            : { amount: 0, currency };

        return {
          id: (room.offerId as string) || `${hotel.hotelId}-${idx}`,
          checkInDate: params.checkIn,
          checkOutDate: params.checkOut,
          room: {
            type: roomName,
            typeEstimated: {
              category: roomName,
              beds: (bestRate.maxOccupancy as number) || (room.maxOccupancy ? Number(room.maxOccupancy) : undefined),
              bedType: undefined,
            },
            description: {
              text: roomName,
            },
          },
          price: {
            currency: finalPrice.currency,
            total: String(finalPrice.amount),
            base: undefined,
          },
          policies: {
            paymentType: (bestRate.paymentType as string) || undefined,
            boardName: (bestRate.boardName as string) || undefined,
          },
        };
      });

      const hid = hotel.hotelId as string;
      const details = hotelDetailsMap[hid];

      const checkinCheckoutTimes = details?.checkinCheckoutTimes as Record<string, string> | undefined;
      const hotelImages = (details?.hotelImages as { url?: string; thumbnailUrl?: string }[]) || [];

      return {
        hotelId: hid || "",
        name: (details?.name as string) || "Unknown Hotel",
        cityCode: params.cityCode,
        rating: details?.starRating ? String(details.starRating) : undefined,
        guestRating: details?.rating ? Number(details.rating) : undefined,
        reviewCount: details?.reviewCount ? Number(details.reviewCount) : undefined,
        latitude: details?.latitude ? Number(details.latitude) : undefined,
        longitude: details?.longitude ? Number(details.longitude) : undefined,
        address: (details?.address as string) || undefined,
        city: (details?.city as string) || undefined,
        mainImage: (details?.main_photo as string) || undefined,
        description: (details?.hotelDescription as string) || undefined,
        checkinTime: checkinCheckoutTimes?.checkin || undefined,
        checkoutTime: checkinCheckoutTimes?.checkout || undefined,
        images: hotelImages.slice(0, 10).map((img) => img.url || img.thumbnailUrl).filter(Boolean),
        amenities: (details?.hotelFacilities as string[]) || [],
        accessibilityAttributes: details?.accessibilityAttributes || null,
        available: offers.length > 0,
        offers,
      };
    });

    const available = results.filter((r: Record<string, unknown>) => r.available);
    console.log(`LiteAPI: ${available.length} hotels found for ${params.cityCode}`);

    return new Response(
      JSON.stringify({ data: available, count: available.length, fallback: isFallback }),
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Extract a Google Maps Place ID from a URL string.
 */
function extractPlaceId(url: string): string | null {
  const ftidMatch = url.match(/!1s(0x[0-9a-fA-F]+:0x[0-9a-fA-F]+)/);
  if (ftidMatch) return ftidMatch[1];
  const pidMatch = url.match(/place_id=([A-Za-z0-9_-]+)/);
  if (pidMatch) return pidMatch[1];
  return null;
}

/**
 * Use Google Places API to get coordinates from a place ID (ChI...).
 */
async function resolveViaPlacesAPI(placeId: string, apiKey: string): Promise<{ lat: number; lng: number; rating?: number; reviewCount?: number } | null> {
  const isFtid = placeId.startsWith("0x");
  if (isFtid) return null;

  const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=geometry,rating,user_ratings_total&key=${apiKey}`;
  const resp = await fetch(detailsUrl);
  const data = await resp.json();
  if (data.result?.geometry?.location) {
    return {
      lat: data.result.geometry.location.lat,
      lng: data.result.geometry.location.lng,
      rating: data.result.rating ?? undefined,
      reviewCount: data.result.user_ratings_total ?? undefined,
    };
  }
  return null;
}

/**
 * Extract place name from Google Maps URL.
 */
function extractPlaceName(url: string): string | null {
  const match = url.match(/\/place\/([^/@?]+)/);
  if (match) return decodeURIComponent(match[1].replace(/\+/g, " "));
  return null;
}

/**
 * Use Google Places Text Search to get coordinates + rating from a place name.
 */
async function resolveViaTextSearch(placeName: string, apiKey: string): Promise<{ lat: number; lng: number; rating?: number; reviewCount?: number } | null> {
  const searchUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(placeName)}&inputtype=textquery&fields=geometry,place_id,rating,user_ratings_total&key=${apiKey}`;
  const resp = await fetch(searchUrl);
  const data = await resp.json();
  const candidate = data.candidates?.[0];
  if (candidate?.geometry?.location) {
    return {
      lat: candidate.geometry.location.lat,
      lng: candidate.geometry.location.lng,
      rating: candidate.rating ?? undefined,
      reviewCount: candidate.user_ratings_total ?? undefined,
    };
  }
  return null;
}

/**
 * Fetch rating/reviews + review texts via Place Details (legacy API — more reliable for reviews).
 */
async function fetchPlaceDetails(placeId: string, apiKey: string): Promise<{ rating?: number; reviewCount?: number; reviews?: any[] } | null> {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=rating,user_ratings_total,reviews&language=fr&key=${apiKey}`;
  const resp = await fetch(url);
  const data = await resp.json();
  if (data.result) {
    const rawReviews = data.result.reviews || [];
    const reviews = rawReviews.slice(0, 5).map((r: any) => ({
      author_name: r.author_name || null,
      rating: r.rating ?? null,
      text: r.text || null,
      relative_time: r.relative_time_description || null,
      language: r.language || null,
      published_at: r.time ? new Date(r.time * 1000).toISOString() : null,
    }));
    return {
      rating: data.result.rating ?? undefined,
      reviewCount: data.result.user_ratings_total ?? undefined,
      reviews: reviews.length > 0 ? reviews : undefined,
    };
  }
  return null;
}

/**
 * Find place_id from a place name (for fetching details separately).
 */
async function findPlaceId(placeName: string, apiKey: string): Promise<string | null> {
  const searchUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(placeName)}&inputtype=textquery&fields=place_id&key=${apiKey}`;
  const resp = await fetch(searchUrl);
  const data = await resp.json();
  return data.candidates?.[0]?.place_id ?? null;
}

/**
 * Extract precise marker coordinates from URL.
 */
function extractMarkerCoords(url: string): { lat: string; lng: string } | null {
  const m8 = url.match(/!8m2!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
  if (m8) return { lat: m8[1], lng: m8[2] };
  const embedMatch = url.match(/!3d(-?\d+\.?\d*).*!4d(-?\d+\.?\d*)/);
  if (embedMatch) return { lat: embedMatch[1], lng: embedMatch[2] };
  const qMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/) ||
                 url.match(/place\/(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (qMatch) return { lat: qMatch[1], lng: qMatch[2] };
  return null;
}

/**
 * Extract camera position @lat,lng — less precise fallback.
 */
function extractCameraCoords(url: string): { lat: string; lng: string } | null {
  const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (atMatch) return { lat: atMatch[1], lng: atMatch[2] };
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const staffCheck = await assertStaff(req, corsHeaders);
  if (staffCheck instanceof Response) return staffCheck;

  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only resolve Google Maps URLs to prevent SSRF/probing abuse.
    const allowedHosts = [
      "google.com",
      "www.google.com",
      "maps.google.com",
      "maps.app.goo.gl",
      "goo.gl",
      "googleusercontent.com",
      "googlemaps.com",
    ];
    let inputUrl: URL;
    try {
      inputUrl = new URL(url);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const hostname = inputUrl.hostname.toLowerCase();
    const isGoogleMaps = allowedHosts.some((h) => hostname === h || hostname.endsWith(`.${h}`));
    if (!isGoogleMaps) {
      return new Response(JSON.stringify({ error: "Only Google Maps URLs are allowed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");

    // Step 1: Follow redirects to get the true final URL
    let finalUrl = url;
    try {
      let currentUrl = url;
      for (let i = 0; i < 10; i++) {
        const response = await fetch(currentUrl, { redirect: "manual" });
        const location = response.headers.get("location");
        try { await response.body?.cancel(); } catch { /* ignore */ }
        if (location && (response.status >= 300 && response.status < 400)) {
          currentUrl = location.startsWith("http") ? location : new URL(location, currentUrl).href;
        } else {
          break;
        }
      }
      finalUrl = currentUrl;
    } catch {
      // If fetch fails, try to parse the original URL
    }

    let lat: number | null = null;
    let lng: number | null = null;
    let method = "unknown";
    let rating: number | undefined;
    let reviewCount: number | undefined;
    let reviews: any[] | undefined;
    let resolvedPlaceId: string | undefined;
    

    // Step 2: Precise marker coords from final URL
    {
      const marker = extractMarkerCoords(finalUrl);
      if (marker) {
        lat = parseFloat(marker.lat);
        lng = parseFloat(marker.lng);
        method = "marker-regex-url";
      }
    }

    // Step 3: Precise marker coords from original URL
    if (lat === null) {
      const marker = extractMarkerCoords(url);
      if (marker) {
        lat = parseFloat(marker.lat);
        lng = parseFloat(marker.lng);
        method = "marker-regex-original";
      }
    }

    // Step 4: Try place_id (ChI...) via Places Details API
    if (lat === null && apiKey) {
      const placeId = extractPlaceId(finalUrl) || extractPlaceId(url);
      if (placeId && !placeId.startsWith("0x")) {
        const result = await resolveViaPlacesAPI(placeId, apiKey);
        if (result) {
          lat = result.lat;
          lng = result.lng;
          rating = result.rating;
          reviewCount = result.reviewCount;
          resolvedPlaceId = placeId;
          method = "place-details-api";
        }
      }
    }

    // Step 5: Try Google Places API text search
    if (lat === null && apiKey) {
      const placeName = extractPlaceName(finalUrl) || extractPlaceName(url);
      if (placeName) {
        const searchUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(placeName)}&inputtype=textquery&fields=geometry,place_id,rating,user_ratings_total&key=${apiKey}`;
        const resp = await fetch(searchUrl);
        const data = await resp.json();
        const candidate = data.candidates?.[0];
        if (candidate?.geometry?.location) {
          lat = candidate.geometry.location.lat;
          lng = candidate.geometry.location.lng;
          rating = candidate.rating ?? undefined;
          reviewCount = candidate.user_ratings_total ?? undefined;
          resolvedPlaceId = candidate.place_id ?? undefined;
          method = "places-api";
        }
      }
    }

    // Step 6: Camera position @lat,lng — less precise fallback
    if (lat === null) {
      const camera = extractCameraCoords(finalUrl) || extractCameraCoords(url);
      if (camera) {
        lat = parseFloat(camera.lat);
        lng = parseFloat(camera.lng);
        method = "camera-fallback";
      }
    }

    // Step 7: Try parsing HTML body as last resort
    if (lat === null) {
      try {
        const response = await fetch(url, { redirect: "follow" });
        const body = await response.text();
        const bodyMatch = body.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/) ||
                          body.match(/center=(-?\d+\.?\d*)%2C(-?\d+\.?\d*)/) ||
                          body.match(/ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
        if (bodyMatch) {
          lat = parseFloat(bodyMatch[1]);
          lng = parseFloat(bodyMatch[2]);
          method = "html-body";
        }
      } catch {
        // ignore
      }
    }

    // Step 8: If we got coords but no rating/placeId yet, try to fetch via Places API
    if (lat !== null && apiKey) {
      let placeId: string | undefined = resolvedPlaceId || undefined;
      if (!placeId) {
        const raw = extractPlaceId(finalUrl) || extractPlaceId(url);
        if (raw && !raw.startsWith("0x")) placeId = raw;
      }

      if (!placeId) {
        const placeName = extractPlaceName(finalUrl) || extractPlaceName(url);
        if (placeName) {
          const found = await findPlaceId(placeName, apiKey);
          if (found) placeId = found;
        }
      }

      if (placeId) {
        resolvedPlaceId = placeId;
        if (rating === undefined) {
          const details = await fetchPlaceDetails(placeId, apiKey);
          if (details) {
            rating = details.rating;
            reviewCount = details.reviewCount;
            reviews = details.reviews;
          }
        }
      }
    }

    if (lat !== null && lng !== null) {
      const reviewUrl = resolvedPlaceId
        ? `https://search.google.com/local/writereview?placeid=${resolvedPlaceId}`
        : undefined;
      return new Response(JSON.stringify({
        lat: String(lat),
        lng: String(lng),
        resolvedUrl: finalUrl,
        method,
        ...(resolvedPlaceId ? { placeId: resolvedPlaceId } : {}),
        ...(reviewUrl ? { reviewUrl } : {}),
        ...(rating !== undefined ? { rating } : {}),
        ...(reviewCount !== undefined ? { reviewCount } : {}),
        ...(reviews && reviews.length > 0 ? { reviews } : {}),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Could not extract coordinates", resolvedUrl: finalUrl }), {
      status: 422,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

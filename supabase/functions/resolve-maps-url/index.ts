import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Extract a Google Maps Place ID from a URL string.
 * Patterns: !1s0x...:0x... or place_id=... or ftid=0x...:0x...
 */
function extractPlaceId(url: string): string | null {
  // Pattern: !1s0x<hex>:0x<hex>
  const ftidMatch = url.match(/!1s(0x[0-9a-fA-F]+:0x[0-9a-fA-F]+)/);
  if (ftidMatch) return ftidMatch[1];
  // Pattern: place_id=ChI...
  const pidMatch = url.match(/place_id=([A-Za-z0-9_-]+)/);
  if (pidMatch) return pidMatch[1];
  return null;
}

/**
 * Use Google Places API to get coordinates from a place ID (ftid or ChI...).
 */
async function resolveViaPlacesAPI(placeId: string, apiKey: string): Promise<{ lat: number; lng: number } | null> {
  // For ftid-style IDs, use the Place Details with ftid query
  const isFtid = placeId.startsWith("0x");
  
  if (isFtid) {
    // Use findplacefromtext with ftid doesn't work directly.
    // Instead, use the legacy place details endpoint with ftid as a query parameter via textsearch.
    // Best approach: use the geocode endpoint or the place search with CID.
    // Actually, we can use: https://maps.googleapis.com/maps/api/place/details/json?ftid=0x...&key=...
    // This is an undocumented but working endpoint.
    const detailsUrl = `https://maps.googleapis.com/maps/api/geocode/json?place_id=${encodeURIComponent(placeId)}&key=${apiKey}`;
    // ftid won't work with geocode. Let's try the Place Details API with a CID conversion.
    // Actually, the simplest reliable approach: extract the place name from the URL and use Places API text search.
    return null; // Fall through to URL-based extraction
  }
  
  // Standard ChI... place_id
  const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=geometry&key=${apiKey}`;
  const resp = await fetch(detailsUrl);
  const data = await resp.json();
  if (data.result?.geometry?.location) {
    return {
      lat: data.result.geometry.location.lat,
      lng: data.result.geometry.location.lng,
    };
  }
  return null;
}

/**
 * Extract place name from Google Maps URL for Places API text search.
 * Pattern: /maps/place/Place+Name/ or /maps/place/Place%20Name/
 */
function extractPlaceName(url: string): string | null {
  const match = url.match(/\/place\/([^/@?]+)/);
  if (match) {
    return decodeURIComponent(match[1].replace(/\+/g, " "));
  }
  return null;
}

/**
 * Use Google Places Text Search to get coordinates from a place name.
 */
async function resolveViaTextSearch(placeName: string, apiKey: string): Promise<{ lat: number; lng: number } | null> {
  const searchUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(placeName)}&inputtype=textquery&fields=geometry&key=${apiKey}`;
  const resp = await fetch(searchUrl);
  const data = await resp.json();
  if (data.candidates?.[0]?.geometry?.location) {
    return {
      lat: data.candidates[0].geometry.location.lat,
      lng: data.candidates[0].geometry.location.lng,
    };
  }
  return null;
}

/**
 * Regex-based fallback extraction from URL string.
 * Priority: !8m2!3d/!4d > !3d/!4d > @lat,lng > ?q= > place/
 */
/**
 * Extract precise marker coordinates from URL (NOT camera position).
 * Only returns !3d/!4d and q= coords which are marker-based.
 */
function extractMarkerCoords(url: string): { lat: string; lng: string } | null {
  // 1. Specific place marker: !8m2!3d...!4d...
  const m8 = url.match(/!8m2!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
  if (m8) return { lat: m8[1], lng: m8[2] };

  // 2. General !3d/!4d
  const embedMatch = url.match(/!3d(-?\d+\.?\d*).*!4d(-?\d+\.?\d*)/);
  if (embedMatch) return { lat: embedMatch[1], lng: embedMatch[2] };

  // 3. Query parameter (explicit coords)
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

  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");

    // Step 1: Follow redirects manually to get the true final URL
    // (Deno's redirect: "follow" doesn't always expose the final URL correctly for Google short URLs)
    let finalUrl = url;
    try {
      let currentUrl = url;
      for (let i = 0; i < 10; i++) {
        const response = await fetch(currentUrl, { redirect: "manual" });
        const location = response.headers.get("location");
        // Consume body to avoid resource leaks
        try { await response.body?.cancel(); } catch { /* ignore */ }
        if (location && (response.status >= 300 && response.status < 400)) {
          // Handle relative redirects
          currentUrl = location.startsWith("http") ? location : new URL(location, currentUrl).href;
        } else {
          break;
        }
      }
      finalUrl = currentUrl;
    } catch {
      // If fetch fails (e.g. network), try to parse the original URL
    }

    let lat: number | null = null;
    let lng: number | null = null;
    let method = "unknown";

    // Step 2: Regex on final URL — most reliable when URL contains !3d/!4d marker coords
    {
      const regex = extractFromUrlRegex(finalUrl);
      if (regex) {
        lat = parseFloat(regex.lat);
        lng = parseFloat(regex.lng);
        method = "regex-url";
      }
    }

    // Step 3: Regex on original URL (in case redirect didn't change it)
    if (lat === null) {
      const regex = extractFromUrlRegex(url);
      if (regex) {
        lat = parseFloat(regex.lat);
        lng = parseFloat(regex.lng);
        method = "regex-original";
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
          method = "place-details-api";
        }
      }
    }

    // Step 5: Try Google Places API text search (may be ambiguous for generic names)
    if (lat === null && apiKey) {
      const placeName = extractPlaceName(finalUrl) || extractPlaceName(url);
      if (placeName) {
        const result = await resolveViaTextSearch(placeName, apiKey);
        if (result) {
          lat = result.lat;
          lng = result.lng;
          method = "places-api";
        }
      }
    }

    // Step 6: Try parsing HTML body
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

    if (lat !== null && lng !== null) {
      return new Response(JSON.stringify({ lat: String(lat), lng: String(lng), resolvedUrl: finalUrl, method }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Could not extract coordinates", resolvedUrl: finalUrl }), {
      status: 422,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

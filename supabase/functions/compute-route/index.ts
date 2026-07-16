import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { assertAllowedOrigin } from "../_shared/auth-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface LatLng { lat: number; lng: number }

interface RoutePayload {
  encodedPolyline: string;
  viewport: unknown | null;
  distanceMeters: number | null;
  duration: string | null;
}

const CACHE_TTL_MS = 10 * 60 * 1000;
const routeCache = new Map<string, { expiresAt: number; payload: RoutePayload }>();
const coordKey = (coords: LatLng) => `${coords.lat.toFixed(6)},${coords.lng.toFixed(6)}`;

const isLatLng = (v: unknown): v is LatLng =>
  !!v && typeof v === "object" &&
  typeof (v as LatLng).lat === "number" && typeof (v as LatLng).lng === "number" &&
  Math.abs((v as LatLng).lat) <= 90 && Math.abs((v as LatLng).lng) <= 180;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const originCheck = assertAllowedOrigin(req, corsHeaders);
  if (originCheck instanceof Response) return originCheck;

  try {
    const key = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!key) {
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => null) as
      | { origin?: unknown; destination?: unknown; mode?: unknown } | null;
    if (!body || !isLatLng(body.origin) || !isLatLng(body.destination)) {
      return new Response(JSON.stringify({ error: "Invalid origin/destination" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (body.mode !== undefined && body.mode !== "walking" && body.mode !== "driving") {
      return new Response(JSON.stringify({ error: "Invalid travel mode" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const mode = body.mode === "driving" ? "DRIVE" : "WALK";
    const origin = body.origin as LatLng;
    const destination = body.destination as LatLng;
    const cacheKey = `${mode}:${coordKey(origin)}:${coordKey(destination)}`;
    const cached = routeCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return new Response(JSON.stringify(cached.payload), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resp = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "routes.polyline.encodedPolyline,routes.viewport,routes.distanceMeters,routes.duration",
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
        destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
        travelMode: mode,
        polylineEncoding: "ENCODED_POLYLINE",
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: "Routes API error", details: data }), {
        status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const route = data?.routes?.[0];
    if (!route?.polyline?.encodedPolyline) {
      return new Response(JSON.stringify({ error: "No route found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: RoutePayload = {
      encodedPolyline: route.polyline.encodedPolyline,
      viewport: route.viewport ?? null,
      distanceMeters: route.distanceMeters ?? null,
      duration: route.duration ?? null,
    };
    routeCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, payload });

    return new Response(JSON.stringify(payload), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

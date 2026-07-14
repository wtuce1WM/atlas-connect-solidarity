import { assertAllowedOrigin } from "../_shared/auth-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SERPAPI_BASE = "https://serpapi.com/search.json";

interface FlightRequest {
  origin?: string;       // City name or IATA code
  destination?: string;  // City name or IATA code
  departureDate?: string; // YYYY-MM-DD
  returnDate?: string;    // YYYY-MM-DD (optional => one-way)
  adults?: number;
  currency?: string;
  language?: string;
  country?: string;
}

// Minimal city -> IATA mapping (Morocco + common origins). Falls back to letting SerpAPI handle name.
const IATA: Record<string, string> = {
  marrakech: "RAK",
  casablanca: "CMN",
  rabat: "RBA",
  agadir: "AGA",
  tanger: "TNG",
  tangier: "TNG",
  fes: "FEZ",
  fez: "FEZ",
  oujda: "OUD",
  ouarzazate: "OZZ",
  essaouira: "ESU",
  paris: "CDG",
  lyon: "LYS",
  marseille: "MRS",
  nice: "NCE",
  toulouse: "TLS",
  bordeaux: "BOD",
  nantes: "NTE",
  londres: "LHR",
  london: "LHR",
  madrid: "MAD",
  barcelone: "BCN",
  barcelona: "BCN",
  bruxelles: "BRU",
  brussels: "BRU",
  geneve: "GVA",
  geneva: "GVA",
  newyork: "JFK",
  "new york": "JFK",
  dubai: "DXB",
  doha: "DOH",
};

function toIata(input?: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^[A-Z]{3}$/.test(trimmed)) return trimmed;
  const key = trimmed.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return IATA[key] || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const originBlock = assertAllowedOrigin(req, corsHeaders);
  if (originBlock) return originBlock;


  try {
    const apiKey = Deno.env.get("SERPAPI_API_KEY");
    if (!apiKey) throw new Error("SERPAPI_API_KEY not configured");

    const params: FlightRequest = await req.json();
    const originIata = toIata(params.origin || "");
    const destIata = toIata(params.destination || "");

    if (!destIata) {
      return new Response(
        JSON.stringify({
          error: "destination_unresolved",
          message: `Impossible de résoudre la destination "${params.destination || ""}" en code IATA. Précisez la ville ou un code à 3 lettres.`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!originIata) {
      return new Response(
        JSON.stringify({
          error: "origin_required",
          message: `Précisez votre ville de départ.`,
          destination: destIata,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const today = new Date();
    const inOneWeek = new Date();
    inOneWeek.setDate(today.getDate() + 7);
    const departure = params.departureDate || inOneWeek.toISOString().split("T")[0];

    const searchParams = new URLSearchParams({
      engine: "google_flights",
      departure_id: originIata,
      arrival_id: destIata,
      outbound_date: departure,
      currency: params.currency || "EUR",
      hl: params.language || "fr",
      gl: params.country || "ma",
      adults: String(params.adults || 1),
      api_key: apiKey,
    });

    if (params.returnDate) {
      searchParams.set("return_date", params.returnDate);
      searchParams.set("type", "1"); // round trip
    } else {
      searchParams.set("type", "2"); // one-way
    }

    const url = `${SERPAPI_BASE}?${searchParams}`;
    console.log("SerpApi flights:", url.replace(apiKey, "***"));

    const res = await fetch(url);
    const body = await res.json();
    if (!res.ok || body.error) {
      console.error("SerpApi flights error:", JSON.stringify(body).slice(0, 1000));
      throw new Error(body.error || `SerpApi error [${res.status}]`);
    }

    const flights = [
      ...(body.best_flights || []),
      ...(body.other_flights || []),
    ].slice(0, 25);

    return new Response(
      JSON.stringify({
        flights,
        searchInfo: {
          origin: originIata,
          destination: destIata,
          departureDate: departure,
          returnDate: params.returnDate || null,
          adults: params.adults || 1,
          currency: params.currency || "EUR",
        },
        priceInsights: body.price_insights || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

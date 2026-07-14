import { assertAllowedOrigin } from "../_shared/auth-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SERPAPI_BASE = "https://serpapi.com/search.json";

interface WebSearchRequest {
  query: string;
  language?: string;
  country?: string;
  num?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("SERPAPI_API_KEY");
    if (!apiKey) throw new Error("SERPAPI_API_KEY not configured");

    const params: WebSearchRequest = await req.json();
    if (!params.query) throw new Error("query is required");

    const searchParams = new URLSearchParams({
      engine: "google",
      q: params.query,
      hl: params.language || "fr",
      gl: params.country || "ma",
      num: String(Math.min(params.num || 10, 20)),
      api_key: apiKey,
    });

    const url = `${SERPAPI_BASE}?${searchParams}`;
    console.log("SerpApi web:", url.replace(apiKey, "***"));

    const res = await fetch(url);
    const body = await res.json();
    if (!res.ok || body.error) {
      console.error("SerpApi web error:", JSON.stringify(body).slice(0, 1000));
      throw new Error(body.error || `SerpApi error [${res.status}]`);
    }

    return new Response(
      JSON.stringify({
        query: params.query,
        answerBox: body.answer_box || null,
        knowledgeGraph: body.knowledge_graph || null,
        organic: (body.organic_results || []).slice(0, 10).map((r: Record<string, unknown>) => ({
          position: r.position,
          title: r.title,
          link: r.link,
          displayedLink: r.displayed_link,
          snippet: r.snippet,
          favicon: r.favicon || null,
          thumbnail: r.thumbnail || null,
          source: r.source || null,
        })),
        relatedQuestions: body.related_questions || [],
        relatedSearches: body.related_searches || [],
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

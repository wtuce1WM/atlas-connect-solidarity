const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pdfUrl = url.searchParams.get("url");

    if (!pdfUrl) {
      return new Response(JSON.stringify({ error: "Missing url parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate URL is from our Supabase storage
    const parsed = new URL(pdfUrl);
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseHost = new URL(supabaseUrl).hostname;

    if (parsed.hostname !== supabaseHost) {
      return new Response(JSON.stringify({ error: "URL not allowed" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch(pdfUrl);

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `Fetch failed: ${response.status}` }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pdfData = await response.arrayBuffer();

    return new Response(pdfData, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline",
      },
    });
  } catch (error) {
    console.error("PDF proxy error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

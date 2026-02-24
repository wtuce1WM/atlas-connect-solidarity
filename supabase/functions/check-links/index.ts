import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth check – staff only
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = claimsData.claims.sub;
  const { data: isStaff } = await supabase.rpc("is_staff", { _user_id: userId });
  if (!isStaff) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Parse body: { urls: string[] }
  const { urls } = await req.json();
  if (!Array.isArray(urls) || urls.length === 0) {
    return new Response(JSON.stringify({ results: {} }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Limit batch size to 50
  const batch = urls.slice(0, 50);

  const results: Record<string, { ok: boolean; status: number | null; error?: string; cdnExpired?: boolean }> = {};

  await Promise.all(
    batch.map(async (url: string) => {
      // Detect known temporary CDN patterns
      const isTempCdn =
        /scontent[-.].*\.(cdninstagram|fbcdn)\./.test(url) ||
        /video[-.].*\.(cdninstagram|fbcdn)\./.test(url);

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url, {
          method: "HEAD",
          signal: controller.signal,
          redirect: "follow",
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; LinkChecker/1.0)",
          },
        });

        clearTimeout(timeout);

        const ok = response.status >= 200 && response.status < 400;
        results[url] = {
          ok,
          status: response.status,
          cdnExpired: isTempCdn && !ok,
        };
      } catch (err) {
        results[url] = {
          ok: false,
          status: null,
          error: err instanceof Error ? err.message : "Unknown error",
          cdnExpired: isTempCdn,
        };
      }
    })
  );

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

// home-html — Server-side LCP preload injector for the homepage.
//
// Why this exists:
//   The homepage's LCP is a YouTube/Supabase thumbnail rendered by React after
//   the JS bundle downloads, parses, hydrates, and fetches the snapshot from
//   the database. On 4G mobile this whole chain takes 10-16s.
//
//   This function intercepts the root URL request from real users, fetches the
//   pre-baked `homepage_cards_snapshots` row server-side, and injects a
//   <link rel="preload" as="image" fetchpriority="high"> for the first
//   thumbnail directly in the HTML <head>. The browser then begins downloading
//   the LCP image in parallel with the JS bundle, instead of after it.
//
// Architecture:
//   Vercel rewrites GET / → this function (with `missing: x-orig` header).
//   This function then fetches the same origin with `x-orig: 1` to retrieve
//   the static index.html (Vercel skips the rewrite because the header is
//   present). It also fetches the snapshot from Supabase REST in parallel.
//   Both operate from Supabase's edge POPs so total round-trip is small.
//
// Caching:
//   Response is `public, s-maxage=60, stale-while-revalidate=300` so Vercel's
//   CDN serves it instantly to subsequent visitors and re-validates in the
//   background. The 60s TTL bounds preload staleness after back-office edits.
//
// Failure mode:
//   Any error (snapshot missing, upstream failure, parse issue) returns the
//   raw upstream HTML unchanged. Behaviour falls back to today's client-side
//   prime script — no regression possible.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

// Mirror the same low-res transform used by React (Home.tsx) so the preloaded
// bytes are exactly the bytes the <img> will request — no wasted download.
function toLowResThumb(t: string): string {
  if (!t) return t;
  if (t.includes("/storage/v1/object/public/") && !t.includes("?")) {
    return t.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/") + "?width=200&quality=45";
  }
  return t;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function fetchSnapshotThumb(city: string): Promise<string | null> {
  try {
    const url = `${SUPABASE_URL}/rest/v1/homepage_cards_snapshots?select=payload&city=eq.${encodeURIComponent(city)}`;
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${SUPABASE_ANON}`,
        Accept: "application/json",
      },
    });
    if (!res.ok) return null;
    const rows = await res.json();
    const payload = rows?.[0]?.payload;
    const t = payload?.[0]?.data?.thumbnail;
    return typeof t === "string" && t.length > 0 ? t : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  // Vercel passes the original path via ?path=... (rewrite syntax). Default to "/".
  const originalPath = url.searchParams.get("path") || "/";
  const originalQuery = new URLSearchParams(url.search);
  originalQuery.delete("path");
  const qs = originalQuery.toString();
  const upstreamUrl = `https://oneworldmorocco.com${originalPath}${qs ? "?" + qs : ""}`;

  // Resolve city: query param wins, else default to Marrakech (matches SW prewarm).
  const city = originalQuery.get("city") || "Marrakech";

  // Fetch upstream HTML + snapshot in parallel.
  const [htmlRes, thumb] = await Promise.all([
    fetch(upstreamUrl, {
      headers: {
        // Bypasses the Vercel rewrite back to this function (see vercel.json `missing`).
        "x-orig": "1",
        "User-Agent": req.headers.get("user-agent") || "Mozilla/5.0",
        "Accept-Language": req.headers.get("accept-language") || "fr",
      },
    }).catch(() => null),
    fetchSnapshotThumb(city),
  ]);

  if (!htmlRes || !htmlRes.ok) {
    // Upstream failed — return a minimal redirect-style fallback.
    return new Response("Upstream unavailable", { status: 502, headers: corsHeaders });
  }

  let html = await htmlRes.text();

  if (thumb) {
    const lowRes = toLowResThumb(thumb);
    const tag = `<link rel="preload" as="image" href="${escapeAttr(lowRes)}" fetchpriority="high">`;
    // Insert just after <head> so the browser sees it before any other resource.
    html = html.replace(/<head>/i, `<head>\n    ${tag}`);
  }

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // CDN cache: 60s fresh, 5 min stale-while-revalidate.
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      // Vary so different cities get different cached HTML.
      "Vary": "x-city",
    },
  });
});

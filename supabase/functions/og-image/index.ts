import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_NAME = "ONE WORLD MOROCCO";
const SITE_TAGLINE = "1ère plateforme de e-commerce solidaire au Maroc";
const BASE_URL = "https://oneworldmorocco.com";
const DEFAULT_OG_IMAGE = `${BASE_URL}/images/og-image.jpg`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");

    if (!slug) {
      return new Response(JSON.stringify({ error: "Missing slug parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: business, error } = await supabase
      .from("businesses")
      .select("name, city, description, images, hook_fr, hook_en, slug")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !business) {
      // Return default OG HTML
      return renderOgHtml({
        title: `${SITE_NAME} – Les meilleures adresses au Maroc`,
        description: "Hôtels, restaurants, activités et services sélectionnés au Maroc.",
        image: DEFAULT_OG_IMAGE,
        url: BASE_URL,
      });
    }

    const title = `${business.name}${business.city ? ` – ${business.city}` : ""} | ${SITE_NAME}`;
    const description =
      business.hook_fr ||
      (business.description ? business.description.substring(0, 160) : `Découvrez ${business.name} sur ${SITE_NAME}.`);
    const image = business.images?.[0] || DEFAULT_OG_IMAGE;
    const pageUrl = `${BASE_URL}/${business.slug}`;

    return renderOgHtml({ title, description, image, url: pageUrl });
  } catch (err) {
    console.error("og-image error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function renderOgHtml(meta: { title: string; description: string; image: string; url: string }) {
  const escaped = {
    title: escapeHtml(meta.title),
    description: escapeHtml(meta.description),
    image: escapeHtml(meta.image),
    url: escapeHtml(meta.url),
  };

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${escaped.title}</title>
  <meta name="description" content="${escaped.description}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escaped.title}">
  <meta property="og:description" content="${escaped.description}">
  <meta property="og:image" content="${escaped.image}">
  <meta property="og:image:secure_url" content="${escaped.image}">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${escaped.title}">
  <meta property="og:url" content="${escaped.url}">
  <meta property="og:site_name" content="${SITE_NAME}">
  <meta property="og:locale" content="fr_FR">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escaped.title}">
  <meta name="twitter:description" content="${escaped.description}">
  <meta name="twitter:image" content="${escaped.image}">
  <link rel="canonical" href="${escaped.url}">
</head>
<body>
  <script>window.location.replace(${JSON.stringify(meta.url)});</script>
  <h1>${escaped.title}</h1>
  <p>${escaped.description}</p>
  <img src="${escaped.image}" alt="${escaped.title}">
  <a href="${escaped.url}">Voir sur ${SITE_NAME}</a>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
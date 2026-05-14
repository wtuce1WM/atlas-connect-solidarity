// Edge Function: og-meta
// Renvoie un HTML minimal avec balises OpenGraph dynamiques
// adaptées à la route demandée (fiches, recherche, destinations, POI, accueil).
// Utilisé pour les bots de partage (WhatsApp, Facebook, Twitter, LinkedIn, etc.)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_NAME = "ONE WORLD MOROCCO";
const BASE_URL = "https://oneworldmorocco.com";
const DEFAULT_OG_IMAGE = `${BASE_URL}/images/og-image.jpg`;
const DEFAULT_DESC = "Hôtels, restaurants, activités et services sélectionnés au Maroc.";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const reqUrl = new URL(req.url);
    // Le chemin et les params réels de la page sont passés via ?path=...&search=...
    // (le router amont — Vercel rewrite — encode l'URL d'origine ici)
    const targetPath = reqUrl.searchParams.get("path") || "/";
    const targetSearch = reqUrl.searchParams.get("search") || "";
    const params = new URLSearchParams(targetSearch);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const meta = await resolveMeta(supabase, targetPath, params);
    const canonical = `${BASE_URL}${targetPath}${targetSearch ? `?${targetSearch}` : ""}`;

    return renderOgHtml({ ...meta, url: canonical });
  } catch (err) {
    console.error("og-meta error:", err);
    return renderOgHtml({
      title: `${SITE_NAME} – Les meilleures adresses au Maroc`,
      description: DEFAULT_DESC,
      image: DEFAULT_OG_IMAGE,
      url: BASE_URL,
    });
  }
});

interface Meta { title: string; description: string; image: string; jsonLd?: Record<string, unknown>; }

const CATEGORY_TO_SCHEMA: Record<string, string> = {
  "Hôtels": "Hotel",
  "Hotels": "Hotel",
  "Restaurants": "Restaurant",
  "Restaurant": "Restaurant",
  "Cafés": "CafeOrCoffeeShop",
  "Bars": "BarOrPub",
  "Boutiques": "Store",
  "Shopping": "Store",
};

async function resolveMeta(supabase: any, path: string, params: URLSearchParams): Promise<Meta> {
  // ---------- Fiche établissement ----------
  // /fiche/:slug ou /business/:slug (legacy)
  const ficheMatch = path.match(/^\/(?:fiche|business)\/([^/]+)/);
  if (ficheMatch) {
    const slug = decodeURIComponent(ficheMatch[1]);
    const { data: biz } = await supabase
      .from("businesses")
      .select("name, city, description, images, hook_fr, address, phone, latitude, longitude, main_category, google_rating, google_review_count, website")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();
    if (biz) {
      const schemaType = (biz.main_category && CATEGORY_TO_SCHEMA[biz.main_category]) || "LocalBusiness";
      const image = biz.images?.[0] || DEFAULT_OG_IMAGE;
      const jsonLd: Record<string, unknown> = {
        "@context": "https://schema.org",
        "@type": schemaType,
        name: biz.name,
        url: `${BASE_URL}/fiche/${slug}`,
        ...(image && { image }),
        ...(biz.description && { description: String(biz.description).substring(0, 500) }),
        ...(biz.phone && { telephone: biz.phone }),
        ...(biz.website && { sameAs: [biz.website] }),
        ...(biz.address && {
          address: {
            "@type": "PostalAddress",
            streetAddress: biz.address,
            ...(biz.city && { addressLocality: biz.city }),
            addressCountry: "MA",
          },
        }),
        ...(biz.latitude && biz.longitude && {
          geo: { "@type": "GeoCoordinates", latitude: biz.latitude, longitude: biz.longitude },
        }),
        ...(biz.google_rating && {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: biz.google_rating,
            bestRating: 5,
            reviewCount: biz.google_review_count ?? 1,
          },
        }),
      };
      return {
        title: `${biz.name}${biz.city ? ` – ${biz.city}` : ""} | ${SITE_NAME}`,
        description: biz.hook_fr || (biz.description?.substring(0, 160)) || `Découvrez ${biz.name}.`,
        image,
        jsonLd,
      };
    }
  }

  // ---------- Destination ----------
  const destMatch = path.match(/^\/destination\/([^/]+)/);
  if (destMatch) {
    const slug = decodeURIComponent(destMatch[1]);
    const { data: d } = await supabase
      .from("destinations")
      .select("name, description, image_url, images")
      .eq("slug", slug)
      .maybeSingle();
    if (d) {
      return {
        title: `${d.name} | ${SITE_NAME}`,
        description: (d.description?.substring(0, 160)) || `Découvrez ${d.name} au Maroc.`,
        image: d.image_url || d.images?.[0] || DEFAULT_OG_IMAGE,
      };
    }
  }

  // ---------- POI ----------
  const poiMatch = path.match(/^\/poi\/([^/]+)/);
  if (poiMatch) {
    const slug = decodeURIComponent(poiMatch[1]);
    const { data: p } = await supabase
      .from("points_of_interest")
      .select("name, description, image_url, images")
      .eq("slug", slug)
      .maybeSingle();
    if (p) {
      return {
        title: `${p.name} | ${SITE_NAME}`,
        description: (p.description?.substring(0, 160)) || `Découvrez ${p.name}.`,
        image: p.image_url || p.images?.[0] || DEFAULT_OG_IMAGE,
      };
    }
  }

  // ---------- Recherche / Test (avec city, entry, sub, badgeId) ----------
  if (path === "/search" || path === "/test" || path === "/") {
    const city = params.get("city");
    const entryId = params.get("entry"); // catégorie principale (UUID)
    const subId = params.get("sub");     // sous-catégorie (UUID)
    const badgeId = params.get("badgeId"); // badge (UUID)
    const badgeLabelParam = params.get("badgeLabel");

    let cityImage: string | null = null;
    let cityName: string | null = null;
    if (city) {
      const { data: c } = await supabase
        .from("cities")
        .select("name_fr, image_url")
        .ilike("name_fr", city)
        .maybeSingle();
      cityImage = c?.image_url || null;
      cityName = c?.name_fr || city;
    }

    let subName: string | null = null;
    let subImage: string | null = null;
    if (subId) {
      const { data: s } = await supabase
        .from("subcategories")
        .select("name_fr, og_image_url")
        .eq("id", subId)
        .maybeSingle();
      subName = s?.name_fr || null;
      subImage = s?.og_image_url || null;
    }

    let entryName: string | null = null;
    let entryImage: string | null = null;
    if (entryId && entryId !== "__home__") {
      const { data: e } = await supabase
        .from("categories")
        .select("name_fr, og_image_url")
        .eq("id", entryId)
        .maybeSingle();
      entryName = e?.name_fr || null;
      entryImage = e?.og_image_url || null;
    }

    let badgeName: string | null = null;
    let badgeImage: string | null = null;
    if (badgeId) {
      const { data: b } = await supabase
        .from("badges")
        .select("name_fr, og_image_url")
        .eq("id", badgeId)
        .maybeSingle();
      badgeName = b?.name_fr || badgeLabelParam || null;
      badgeImage = b?.og_image_url || null;
    } else if (badgeLabelParam) {
      badgeName = badgeLabelParam;
    }

    // Construction du titre/description
    const segments = [badgeName, subName, entryName, cityName].filter(Boolean);
    if (segments.length > 0) {
      const title = `${segments.join(" · ")} | ${SITE_NAME}`;
      const focus = badgeName || subName || entryName || "les meilleures adresses";
      const description = cityName
        ? `Découvrez ${focus} à ${cityName} sur ${SITE_NAME}.`
        : `Découvrez ${focus} sur ${SITE_NAME}.`;
      // Priorité image: badge > sous-catégorie > catégorie > ville > défaut
      const image = badgeImage || subImage || entryImage || cityImage || DEFAULT_OG_IMAGE;
      return { title, description, image };
    }

    if (cityName) {
      return {
        title: `${cityName} | ${SITE_NAME}`,
        description: `Découvrez les meilleures adresses à ${cityName} sur ${SITE_NAME}.`,
        image: cityImage || DEFAULT_OG_IMAGE,
      };
    }
  }

  // ---------- Fallback (accueil + tout le reste) ----------
  return {
    title: `${SITE_NAME} – Les meilleures adresses au Maroc`,
    description: DEFAULT_DESC,
    image: DEFAULT_OG_IMAGE,
  };
}

function renderOgHtml(meta: { title: string; description: string; image: string; url: string; jsonLd?: Record<string, unknown> }) {
  const e = {
    title: escapeHtml(meta.title),
    description: escapeHtml(meta.description),
    image: escapeHtml(meta.image),
    url: escapeHtml(meta.url),
  };

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${e.title}</title>
  <meta name="description" content="${e.description}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${e.title}">
  <meta property="og:description" content="${e.description}">
  <meta property="og:image" content="${e.image}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${e.url}">
  <meta property="og:site_name" content="${SITE_NAME}">
  <meta property="og:locale" content="fr_FR">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${e.title}">
  <meta name="twitter:description" content="${e.description}">
  <meta name="twitter:image" content="${e.image}">
  <link rel="canonical" href="${e.url}">
  <meta http-equiv="refresh" content="0;url=${e.url}">
</head>
<body>
  <h1>${e.title}</h1>
  <p>${e.description}</p>
  <img src="${e.image}" alt="${e.title}">
  <a href="${e.url}">Voir sur ${SITE_NAME}</a>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// Génère un fichier HTML statique par établissement avec vanity URL,
// pour que WhatsApp/Facebook/LinkedIn/Twitter affichent l'aperçu correct
// (nom + hook/description + image 1) lors du partage de https://oneworldmorocco.com/<slug>.
//
// Usage : `bunx tsx scripts/generate-business-og-pages.ts`
// Branché sur `prebuild` (cf. package.json).

import { mkdirSync, writeFileSync, rmSync, existsSync, readdirSync, statSync } from "fs";
import { resolve, join } from "path";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://oneworldmorocco.com";
const SITE_NAME = "ONE WORLD MOROCCO";
const SUPABASE_URL = "https://plnphgdrawpsnumnejzc.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsbnBoZ2RyYXdwc251bW5lanpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNjA5ODcsImV4cCI6MjA4NTgzNjk4N30.RwHKmL6E0Gd2LTVvDkfYx5RkZ-k7LKKp4iUoCS34pW4";

const PUBLIC_DIR = resolve(process.cwd(), "public");
const MARKER_FILE = ".og-generated";

// Dossiers de public/ à NE JAMAIS toucher (contiennent autre chose que nos pages OG générées)
const PROTECTED_DIRS = new Set([
  "solidarity",
  "images",
  "fonts",
  "icons",
  "assets",
]);

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

const STATIC_ARTICLES = [
  {
    path: "blog/fermes-pedagogiques-marrakech",
    title: `Les fermes pédagogiques à Marrakech — ${SITE_NAME}`,
    description:
      "Huit adresses à quelques minutes de la ville ocre, pour offrir aux enfants — et aux parents — une vraie journée de nature, entre animaux, ateliers et plantes aromatiques.",
    publishedAt: "2026-06-12T08:00:00+01:00",
    modifiedAt: "2026-06-13T08:00:00+01:00",
  },
  {
    path: "blog/activites-enfants-marrakech",
    title: `Activités pour les enfants à Marrakech — ${SITE_NAME}`,
    description:
      "Notre sélection d'activités et d'adresses pour les enfants à Marrakech : parcs aquatiques, ateliers, kids clubs, restaurants familiaux et plus.",
    publishedAt: "2026-06-12T08:00:00+01:00",
    modifiedAt: "2026-06-13T08:00:00+01:00",
  },
  {
    path: "blog/galeries-art-marrakech",
    title: `Les galeries d'art à Marrakech — ${SITE_NAME}`,
    description:
      "Notre sélection de 24 galeries d'art à Marrakech : Guéliz, Médina, Sidi Ghanem et au-delà. Art contemporain, design, photographie et scène picturale marocaine.",
    publishedAt: "2026-06-12T08:00:00+01:00",
    modifiedAt: "2026-06-13T08:00:00+01:00",
  },
  {
    path: "blog/5-jours-marrakech-artisanat",
    title: `5 jours à Marrakech pour découvrir l'artisanat marocain — ${SITE_NAME}`,
    description:
      "Itinéraire de 5 jours à Marrakech : 44 adresses sélectionnées (Guéliz, Médina, Sidi Ghanem) pour découvrir le meilleur de l'artisanat marocain.",
    publishedAt: "2026-06-12T08:00:00+01:00",
    modifiedAt: "2026-06-13T08:00:00+01:00",
  },
  {
    path: "blog/essaouira-vue-mer",
    title: `Les adresses avec vue sur mer à Essaouira — ${SITE_NAME}`,
    description:
      "Notre sélection des meilleures adresses face à l'océan à Essaouira : hôtels, restaurants, cafés et rooftops pour profiter de la brise atlantique.",
    publishedAt: "2026-06-12T08:00:00+01:00",
    modifiedAt: "2026-06-13T08:00:00+01:00",
  },
];

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function stripHtml(s: string): string {
  return String(s)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

interface Biz {
  id: string;
  slug: string | null;
  name: string;
  city: string | null;
  description: string | null;
  hook_fr: string | null;
  images: string[] | null;
  main_category: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  latitude: number | null;
  longitude: number | null;
  google_rating: number | null;
  google_review_count: number | null;
  is_active: boolean;
}

function buildHtml(slug: string, biz: Biz): string {
  const title = `${biz.name}${biz.city ? ` – ${biz.city}` : ""} | ${SITE_NAME}`;
  const rawDesc = biz.hook_fr || biz.description || `Découvrez ${biz.name}.`;
  const description = stripHtml(rawDesc).substring(0, 160);
  const image = biz.images?.[0] || `${BASE_URL}/images/og-image.jpg`;
  const url = `${BASE_URL}/${slug}`;
  const schemaType = (biz.main_category && CATEGORY_TO_SCHEMA[biz.main_category]) || "LocalBusiness";

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": schemaType,
    name: biz.name,
    url,
    ...(image && { image }),
    ...(description && { description }),
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

  const e = {
    title: escapeHtml(title),
    description: escapeHtml(description),
    image: escapeHtml(image),
    url: escapeHtml(url),
    name: escapeHtml(biz.name),
    bizId: escapeHtml(biz.id),
    q: encodeURIComponent(biz.name),
    t: biz.city ? encodeURIComponent(biz.city) : "",
  };

  const fallbackUrl =
    `/search?openBusiness=${e.bizId}&pinIds=${e.bizId}&q=${e.q}${e.t ? `&t=${e.t}` : ""}`;

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>${e.title}</title>
    <meta name="description" content="${e.description}" />
    <link rel="canonical" href="${e.url}" />

    <meta property="og:type" content="website" />
    <meta property="og:title" content="${e.title}" />
    <meta property="og:description" content="${e.description}" />
    <meta property="og:url" content="${e.url}" />
    <meta property="og:image" content="${e.image}" />
    <meta property="og:image:secure_url" content="${e.image}" />
    <meta property="og:image:alt" content="${e.name}" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:locale" content="fr_FR" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${e.title}" />
    <meta name="twitter:description" content="${e.description}" />
    <meta name="twitter:image" content="${e.image}" />

    <script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>
  </head>
  <body style="background-color:#faf8f5;margin:0">
    <script>
      (function () {
        var ua = navigator.userAgent || "";
        var isPreviewBot = /WhatsApp|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|TelegramBot|Pinterest|Discordbot|Googlebot|Google-InspectionTool|GoogleOther|Google-Extended|bingbot|GPTBot|OAI-SearchBot|ChatGPT-User|PerplexityBot|Perplexity-User|ClaudeBot|Claude-Web|anthropic-ai|Applebot|Applebot-Extended|Amazonbot|Bytespider|Meta-ExternalAgent|Meta-ExternalFetcher|DuckAssistBot|YouBot|CCBot|cohere-ai|Diffbot/i.test(ua);
        if (isPreviewBot) return;
        fetch("/index.html", { cache: "no-store" })
          .then(function (response) { return response.text(); })
          .then(function (html) {
            document.open();
            document.write(html);
            document.close();
          })
          .catch(function () {
            window.location.replace("${fallbackUrl}");
          });
      })();
    </script>
    <noscript>
      <h1>${e.title}</h1>
      <p>${e.description}</p>
    </noscript>
  </body>
</html>`;
}

function buildArticleHtml(article: (typeof STATIC_ARTICLES)[number]): string {
  const title = article.title;
  const description = stripHtml(article.description).substring(0, 200);
  const image = `${BASE_URL}/og-install-app.jpg`;
  const url = `${BASE_URL}/${article.path}`;
  const cleanTitle = title.replace(` — ${SITE_NAME}`, "");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: cleanTitle,
    description,
    image: [image],
    datePublished: article.publishedAt,
    dateModified: article.modifiedAt,
    author: { "@type": "Organization", name: SITE_NAME, url: BASE_URL },
    publisher: { "@type": "Organization", name: SITE_NAME, logo: { "@type": "ImageObject", url: `${BASE_URL}/favicon.webp` } },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };
  const e = {
    title: escapeHtml(title),
    description: escapeHtml(description),
    image: escapeHtml(image),
    url: escapeHtml(url),
  };

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>${e.title}</title>
    <meta name="description" content="${e.description}" />
    <link rel="canonical" href="${e.url}" />

    <meta property="og:type" content="article" />
    <meta property="og:title" content="${e.title}" />
    <meta property="og:description" content="${e.description}" />
    <meta property="og:url" content="${e.url}" />
    <meta property="og:image" content="${e.image}" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:locale" content="fr_FR" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${e.title}" />
    <meta name="twitter:description" content="${e.description}" />
    <meta name="twitter:image" content="${e.image}" />

    <script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>
  </head>
  <body style="background-color:#faf8f5;margin:0">
    <script>
      (function () {
        var ua = navigator.userAgent || "";
        var isPreviewBot = /WhatsApp|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|TelegramBot|Pinterest|Discordbot|Googlebot|Google-InspectionTool|GoogleOther|Google-Extended|bingbot|GPTBot|OAI-SearchBot|ChatGPT-User|PerplexityBot|Perplexity-User|ClaudeBot|Claude-Web|anthropic-ai|Applebot|Applebot-Extended|Amazonbot|Bytespider|Meta-ExternalAgent|Meta-ExternalFetcher|DuckAssistBot|YouBot|CCBot|cohere-ai|Diffbot/i.test(ua);
        if (isPreviewBot) return;
        fetch("/index.html", { cache: "no-store" })
          .then(function (response) { return response.text(); })
          .then(function (html) {
            document.open();
            document.write(html);
            document.close();
          })
          .catch(function () {});
      })();
    </script>
    <noscript>
      <h1>${e.title}</h1>
      <p>${e.description}</p>
    </noscript>
  </body>
</html>`;
}

async function cleanPreviouslyGenerated() {
  if (!existsSync(PUBLIC_DIR)) return;
  for (const entry of readdirSync(PUBLIC_DIR)) {
    if (PROTECTED_DIRS.has(entry)) continue;
    const fullPath = join(PUBLIC_DIR, entry);
    let st;
    try { st = statSync(fullPath); } catch { continue; }
    if (!st.isDirectory()) continue;
    // Ne supprime que les dossiers marqués comme générés par ce script
    if (existsSync(join(fullPath, MARKER_FILE))) {
      rmSync(fullPath, { recursive: true, force: true });
    }
  }
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // 1) Récupère toutes les vanity URLs de type business (paginé, PostgREST plafonne à 1000/req)
  const vanities: { slug: string; target_id: string }[] = [];
  const VPAGE = 1000;
  let vFrom = 0;
  while (true) {
    const { data, error } = await supabase
      .from("vanity_urls")
      .select("slug, target_id")
      .eq("target_type", "business")
      .range(vFrom, vFrom + VPAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    vanities.push(...(data as { slug: string; target_id: string }[]));
    if (data.length < VPAGE) break;
    vFrom += VPAGE;
  }
  if (vanities.length === 0) {
    console.log("[og-pages] Aucune vanity URL business trouvée.");
  }

  // 2) Récupère les fiches associées (actives uniquement)
  const ids = vanities.map((v) => v.target_id);
  const businesses: Biz[] = [];
  const PAGE = 50;
  for (let i = 0; i < ids.length; i += PAGE) {
    const chunk = ids.slice(i, i + PAGE);
    const { data, error } = await supabase
      .from("businesses")
      .select(
        "id, slug, name, city, description, hook_fr, images, main_category, address, phone, website, latitude, longitude, google_rating, google_review_count, is_active"
      )
      .in("id", chunk)
      .eq("is_active", true);
    if (error) throw error;
    if (data) businesses.push(...(data as Biz[]));
  }
  const bizById = new Map(businesses.map((b) => [b.id, b]));

  // 3) Nettoie l'ancienne génération
  await cleanPreviouslyGenerated();

  // 4) Écrit un fichier par vanity URL active
  let written = 0;
  let skipped = 0;
  for (const v of vanities) {
    const biz = bizById.get(v.target_id);
    if (!biz) { skipped++; continue; }
    const slug = v.slug;
    if (!slug || PROTECTED_DIRS.has(slug)) { skipped++; continue; }
    const dir = join(PUBLIC_DIR, slug);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "index.html"), buildHtml(slug, biz), "utf8");
    writeFileSync(join(dir, MARKER_FILE), "", "utf8");
    written++;
  }

  const blogDir = join(PUBLIC_DIR, "blog");
  mkdirSync(blogDir, { recursive: true });
  writeFileSync(join(blogDir, MARKER_FILE), "", "utf8");
  for (const article of STATIC_ARTICLES) {
    // Supprime un éventuel fichier sans extension (ancienne génération) qui était téléchargé
    const legacyFile = join(PUBLIC_DIR, article.path);
    try {
      const st = statSync(legacyFile);
      if (st.isFile()) rmSync(legacyFile, { force: true });
    } catch {}
    const articleDir = join(PUBLIC_DIR, article.path);
    mkdirSync(articleDir, { recursive: true });
    writeFileSync(join(articleDir, "index.html"), buildArticleHtml(article), "utf8");
  }

  console.log(`[og-pages] ${written} fichiers business générés (${skipped} ignorés) + ${STATIC_ARTICLES.length} articles.`);
}

main().catch((err) => {
  console.error("[og-pages] Erreur:", err);
  process.exit(1);
});

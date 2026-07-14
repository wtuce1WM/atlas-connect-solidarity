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

// Mapping catégorie → type Schema.org. Testé sur `categories[]` (plus précis)
// avec fallback sur `main_category`. Ordre = priorité (premier match gagne).
const CATEGORY_MAPPINGS: Array<[RegExp, string]> = [
  [/^Hôtel|^Hotel|Palace/i, "Hotel"],
  [/Riad|Maison d'hôte|Guest ?house|Hébergement|Auberge|Ecolodge|Lodge/i, "LodgingBusiness"],
  [/Restaurant|Restauration/i, "Restaurant"],
  [/Café|Coffee|Salon de thé/i, "CafeOrCoffeeShop"],
  [/^Bar$|Bar à|Rooftop|Cocktail/i, "BarOrPub"],
  [/Boîte de nuit|Night ?club|Discothèque/i, "NightClub"],
  [/Spa|Hammam|Bien-être/i, "HealthAndBeautyBusiness"],
  [/Salle de sport|Gym|Fitness|Yoga/i, "ExerciseGym"],
  [/Golf/i, "GolfCourse"],
  [/Musée/i, "Museum"],
  [/Galerie d'art|Art gallery/i, "ArtGallery"],
  [/Pharmacie/i, "Pharmacy"],
  [/Cinéma|Cinema/i, "MovieTheater"],
  [/Parc|Jardin/i, "TouristAttraction"],
  [/Plage|Beach/i, "Beach"],
  [/Boulangerie|Pâtisserie/i, "Bakery"],
  [/Boucherie/i, "Store"],
  [/Boutique|Magasin|Commerce|Shop|Concept store/i, "Store"],
  [/Agence de voyage|Tour ?opérat|Excursion/i, "TravelAgency"],
  [/École|Ecole|Formation/i, "EducationalOrganization"],
  [/Clinique|Hôpital|Cabinet/i, "MedicalClinic"],
];

function resolveSchemaType(biz: Biz): string {
  const cats = [...(biz.categories || []), biz.main_category || ""].filter(Boolean);
  for (const c of cats) {
    for (const [re, type] of CATEGORY_MAPPINGS) {
      if (re.test(c)) return type;
    }
  }
  return "LocalBusiness";
}

// Cuisines détectables dans services/categories pour Restaurant.servesCuisine
const CUISINE_KEYWORDS: Array<[RegExp, string]> = [
  [/marocain/i, "Moroccan"],
  [/italien|pizza|pasta/i, "Italian"],
  [/français|french/i, "French"],
  [/japonais|sushi/i, "Japanese"],
  [/asiatique|thai|thaï|chinois/i, "Asian"],
  [/libanais|mezze/i, "Lebanese"],
  [/indien/i, "Indian"],
  [/burger/i, "American"],
  [/fruits de mer|poisson|seafood/i, "Seafood"],
  [/végétarien|vegan|healthy/i, "Vegetarian"],
];

interface StaticArticle {
  path: string;
  title: string;
  description: string;
  image: string;
  publishedAt: string;
  modifiedAt: string;
}


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
  neighborhood: string | null;
  region: string | null;
  description: string | null;
  hook_fr: string | null;
  images: string[] | null;
  main_category: string | null;
  categories: string[] | null;
  services: string[] | null;
  languages: string[] | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  latitude: number | null;
  longitude: number | null;
  google_rating: number | null;
  google_review_count: number | null;
  tripadvisor_rating: number | null;
  tripadvisor_review_count: number | null;
  min_price: number | null;
  manual_price_range: string | null;
  opening_hours: Record<string, { open?: string; close?: string; open2?: string; close2?: string; closed?: boolean; continuous?: boolean }> | null;
  is_open_24h: boolean | null;
  menu_url: string | null;
  booking_url: string | null;
  reserve_now_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  tripadvisor_url: string | null;
  youtube_url: string | null;
  linkedin_url: string | null;
  is_active: boolean;
}

function buildOpeningHoursSpec(oh: Biz["opening_hours"], is24h: boolean | null): unknown[] | null {
  if (is24h) {
    return [{
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
      opens: "00:00", closes: "23:59",
    }];
  }
  if (!oh || typeof oh !== "object") return null;
  const specs: unknown[] = [];
  const dayNames: Record<string, string> = {
    monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday",
    thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday",
  };
  for (const [day, dayName] of Object.entries(dayNames)) {
    const d = oh[day];
    if (!d || d.closed) continue;
    const open = d.open, close = d.close;
    if (!open || !close || !/^\d{1,2}:\d{2}$/.test(open) || !/^\d{1,2}:\d{2}$/.test(close)) continue;
    specs.push({ "@type": "OpeningHoursSpecification", dayOfWeek: dayName, opens: open, closes: close });
    if (d.open2 && d.close2 && /^\d{1,2}:\d{2}$/.test(d.open2) && /^\d{1,2}:\d{2}$/.test(d.close2)) {
      specs.push({ "@type": "OpeningHoursSpecification", dayOfWeek: dayName, opens: d.open2, closes: d.close2 });
    }
  }
  return specs.length ? specs : null;
}

function detectCuisines(biz: Biz): string[] {
  const haystack = [
    biz.main_category || "",
    ...(biz.categories || []),
    ...(biz.services || []),
  ].join(" ");
  const found = new Set<string>();
  for (const [re, label] of CUISINE_KEYWORDS) {
    if (re.test(haystack)) found.add(label);
  }
  return [...found];
}

function priceRangeFromBiz(biz: Biz): string | null {
  if (biz.manual_price_range) return biz.manual_price_range;
  if (typeof biz.min_price === "number" && biz.min_price > 0) {
    // Convention Schema.org : $ à $$$$
    if (biz.min_price < 150) return "$";
    if (biz.min_price < 400) return "$$";
    if (biz.min_price < 900) return "$$$";
    return "$$$$";
  }
  return null;
}

function buildHtml(slug: string, biz: Biz): string {
  const title = `${biz.name}${biz.city ? ` – ${biz.city}` : ""} | ${SITE_NAME}`;
  const rawDesc = biz.hook_fr || biz.description || `Découvrez ${biz.name}.`;
  const description = stripHtml(rawDesc).substring(0, 160);
  const image = biz.images?.[0] || `${BASE_URL}/images/og-image.jpg`;
  const url = `${BASE_URL}/${slug}`;
  const schemaType = resolveSchemaType(biz);
  const isRestaurantLike = ["Restaurant", "CafeOrCoffeeShop", "BarOrPub"].includes(schemaType);

  const sameAs: string[] = [];
  if (biz.website) sameAs.push(biz.website);
  if (biz.facebook_url) sameAs.push(biz.facebook_url);
  if (biz.instagram_url) sameAs.push(biz.instagram_url);
  if (biz.tripadvisor_url) sameAs.push(biz.tripadvisor_url);
  if (biz.youtube_url) sameAs.push(biz.youtube_url);
  if (biz.linkedin_url) sameAs.push(biz.linkedin_url);

  const openingSpec = buildOpeningHoursSpec(biz.opening_hours, biz.is_open_24h);
  const priceRange = priceRangeFromBiz(biz);
  const cuisines = isRestaurantLike ? detectCuisines(biz) : [];
  const reservationUrl = biz.booking_url || biz.reserve_now_url;
  const keywords = (biz.services && biz.services.length)
    ? biz.services.slice(0, 12).join(", ")
    : null;

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": schemaType,
    name: biz.name,
    url,
    ...(image && { image }),
    ...(description && { description }),
    ...(biz.phone && { telephone: biz.phone }),
    ...(sameAs.length && { sameAs }),
    ...(biz.email && { email: biz.email }),
    ...(biz.address && {
      address: {
        "@type": "PostalAddress",
        streetAddress: biz.address,
        ...(biz.neighborhood && { addressLocality: biz.neighborhood }),
        ...(biz.city && { addressRegion: biz.city }),
        ...(biz.region && !biz.city && { addressRegion: biz.region }),
        addressCountry: "MA",
      },
    }),
    ...(biz.latitude && biz.longitude && {
      geo: { "@type": "GeoCoordinates", latitude: biz.latitude, longitude: biz.longitude },
    }),
    ...(openingSpec && { openingHoursSpecification: openingSpec }),
    ...(priceRange && { priceRange }),
    ...(cuisines.length && { servesCuisine: cuisines }),
    ...(isRestaurantLike && reservationUrl && { acceptsReservations: "True" }),
    ...(isRestaurantLike && biz.menu_url && { hasMenu: biz.menu_url }),
    ...(reservationUrl && {
      potentialAction: {
        "@type": "ReserveAction",
        target: reservationUrl,
      },
    }),
    ...(biz.languages && biz.languages.length && {
      availableLanguage: biz.languages,
    }),
    ...(keywords && { keywords }),
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

function buildArticleHtml(article: StaticArticle): string {
  const title = article.title;
  const description = stripHtml(article.description).substring(0, 200);
  const image = article.image || `${BASE_URL}/og-install-app.jpg`;
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
        "id, slug, name, city, neighborhood, region, description, hook_fr, images, main_category, categories, services, languages, address, phone, whatsapp, email, website, latitude, longitude, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, min_price, manual_price_range, opening_hours, is_open_24h, menu_url, booking_url, reserve_now_url, facebook_url, instagram_url, tripadvisor_url, youtube_url, linkedin_url, is_active"
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

  // 5) Récupère les articles blog publiés depuis la DB (blog_posts)
  const blogDir = join(PUBLIC_DIR, "blog");
  mkdirSync(blogDir, { recursive: true });
  writeFileSync(join(blogDir, MARKER_FILE), "", "utf8");

  const { data: posts, error: postsErr } = await supabase
    .from("blog_posts")
    .select("slug, title_fr, excerpt_fr, cover_image_url, custom_hero_image_url, published_at, updated_at, is_published")
    .eq("is_published", true);
  if (postsErr) console.error("[og-pages] blog_posts fetch error:", postsErr);

  const articles: StaticArticle[] = (posts || [])
    .filter((p: any) => p.slug && p.title_fr)
    .map((p: any): StaticArticle => ({
      path: `blog/${p.slug}`,
      title: `${p.title_fr} — ${SITE_NAME}`,
      description: p.excerpt_fr || `Découvrez ${p.title_fr} sur ${SITE_NAME}.`,
      image: p.custom_hero_image_url || p.cover_image_url || `${BASE_URL}/og-install-app.jpg`,
      publishedAt: p.published_at || p.updated_at || new Date().toISOString(),
      modifiedAt: p.updated_at || p.published_at || new Date().toISOString(),
    }));

  for (const article of articles) {
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

  console.log(`[og-pages] ${written} fichiers business générés (${skipped} ignorés) + ${articles.length} articles blog.`);
}

main().catch((err) => {
  console.error("[og-pages] Erreur:", err);
  process.exit(1);
});

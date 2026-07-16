// Génère un fichier HTML statique par établissement avec vanity URL,
// pour que WhatsApp/Facebook/LinkedIn/Twitter affichent l'aperçu correct
// (nom + hook/description + image 1) lors du partage de https://oneworldmorocco.com/<slug>.
//
// Usage : `bunx tsx scripts/generate-business-og-pages.ts`
// Branché sur `prebuild` (cf. package.json).

import { mkdirSync, writeFileSync, rmSync, existsSync, readdirSync, statSync, readFileSync } from "fs";
import { resolve, join } from "path";
import { createClient } from "@supabase/supabase-js";

// Mapping curé slug -> liens d'autorité (Wikipedia FR/EN, Wikidata) ajoutés à sameAs.
// Édite scripts/wikidata-links.json pour enrichir cette liste.
let WIKIDATA_LINKS: Record<string, { wikipedia_fr?: string; wikipedia_en?: string; wikidata?: string }> = {};
try {
  const raw = readFileSync(resolve(process.cwd(), "scripts/wikidata-links.json"), "utf8");
  WIKIDATA_LINKS = JSON.parse(raw);
  delete (WIKIDATA_LINKS as any)._comment;
} catch (e) {
  console.warn("[og-pages] wikidata-links.json introuvable, skip");
}
function authorityLinksFor(slug: string): string[] {
  const entry = WIKIDATA_LINKS[slug];
  if (!entry) return [];
  return [entry.wikipedia_fr, entry.wikipedia_en, entry.wikidata].filter(Boolean) as string[];
}

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
  faq: Array<{ q?: string; a?: string; question?: string; answer?: string }> | null;
}

interface DbReview {
  business_id: string;
  source: string;
  author_name: string | null;
  rating: number | null;
  text: string | null;
  text_fr: string | null;
  text_en: string | null;
  published_at: string | null;
  language: string | null;
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

// POIs de référence par ville — sert à calculer les distances "à vol d'oiseau"
// exposées comme additionalProperty (PropertyValue) dans le Schema.org.
// Les valeurs de villes doivent matcher `biz.city` normalisé (lowercase, sans accents).
interface LandmarkPoint { name: string; lat: number; lng: number }
const LANDMARKS_BY_CITY: Record<string, LandmarkPoint[]> = {
  marrakech: [
    { name: "Jemaa el-Fna", lat: 31.6258, lng: -7.9891 },
    { name: "Koutoubia", lat: 31.6242, lng: -7.9931 },
    { name: "Jardin Majorelle", lat: 31.6417, lng: -8.0033 },
    { name: "Aéroport Marrakech-Menara", lat: 31.6069, lng: -8.0363 },
    { name: "Gare Marrakech", lat: 31.6360, lng: -8.0173 },
    { name: "Palais de la Bahia", lat: 31.6215, lng: -7.9829 },
  ],
  essaouira: [
    { name: "Place Moulay Hassan", lat: 31.5127, lng: -9.7699 },
    { name: "Port d'Essaouira", lat: 31.5091, lng: -9.7749 },
    { name: "Skala de la Kasbah", lat: 31.5145, lng: -9.7736 },
    { name: "Plage d'Essaouira", lat: 31.5049, lng: -9.7657 },
    { name: "Aéroport Essaouira-Mogador", lat: 31.3975, lng: -9.6817 },
  ],
  casablanca: [
    { name: "Mosquée Hassan II", lat: 33.6084, lng: -7.6326 },
    { name: "Aéroport Mohammed V", lat: 33.3675, lng: -7.5898 },
  ],
  rabat: [
    { name: "Tour Hassan", lat: 34.0243, lng: -6.8221 },
    { name: "Kasbah des Oudayas", lat: 34.0330, lng: -6.8367 },
  ],
};

function normCity(s: string | null | undefined): string {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function buildDistancePropertyValues(biz: Biz): Array<Record<string, unknown>> {
  if (typeof biz.latitude !== "number" || typeof biz.longitude !== "number") return [];
  const landmarks = LANDMARKS_BY_CITY[normCity(biz.city)];
  if (!landmarks || !landmarks.length) return [];
  const props: Array<Record<string, unknown>> = [];
  for (const lm of landmarks) {
    const km = haversineKm(biz.latitude, biz.longitude, lm.lat, lm.lng);
    if (km > 60) continue; // ignore les POI trop éloignés (autre agglomération)
    props.push({
      "@type": "PropertyValue",
      name: `Distance ${lm.name}`,
      value: km < 10 ? km.toFixed(2) : km.toFixed(1),
      unitCode: "KMT",
      unitText: "km",
    });
  }
  // Quartier explicite (utile pour les LLM même si déjà dans address)
  if (biz.neighborhood) {
    props.push({ "@type": "PropertyValue", name: "Quartier", value: biz.neighborhood });
  }
  return props;
}

function buildReviewNodes(reviews: DbReview[], businessId: string, businessName: string): Array<Record<string, unknown>> {
  // Prend jusqu'à 5 avis avec du texte, meilleure note d'abord.
  const eligible = reviews
    .filter((r) => r.business_id === businessId)
    .filter((r) => (r.text_fr || r.text || r.text_en || "").trim().length >= 30)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 5);
  return eligible.map((r) => {
    const body = stripHtml(r.text_fr || r.text || r.text_en || "").substring(0, 500);
    const authorName = r.author_name || "Visiteur";
    return {
      "@type": "Review",
      author: { "@type": "Person", name: authorName },
      reviewBody: body,
      inLanguage: r.language || "fr",
      ...(r.rating && {
        reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
      }),
      ...(r.published_at && { datePublished: r.published_at.substring(0, 10) }),
      itemReviewed: { "@type": "Thing", name: businessName },
      publisher: r.source ? { "@type": "Organization", name: r.source } : undefined,
    };
  });
}

function normalizeFaqItems(raw: Biz["faq"]): Array<{ q: string; a: string }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((it) => {
      const q = (it?.q ?? it?.question ?? "").toString().trim();
      const a = (it?.a ?? it?.answer ?? "").toString().trim();
      return { q, a };
    })
    .filter((it) => it.q.length > 2 && it.a.length > 2)
    .slice(0, 20);
}

function buildHtml(slug: string, biz: Biz, reviews: DbReview[] = []): string {
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
  sameAs.push(...authorityLinksFor(slug));

  const openingSpec = buildOpeningHoursSpec(biz.opening_hours, biz.is_open_24h);
  const priceRange = priceRangeFromBiz(biz);
  const cuisines = isRestaurantLike ? detectCuisines(biz) : [];
  const reservationUrl = biz.booking_url || biz.reserve_now_url;
  const keywords = (biz.services && biz.services.length)
    ? biz.services.slice(0, 12).join(", ")
    : null;

  const businessNode: Record<string, unknown> = {
    "@type": schemaType,
    "@id": `${url}#business`,
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

  // Reviews individuels (Schema.org Review) : jusqu'à 5, source Google/TripAdvisor…
  const reviewNodes = buildReviewNodes(reviews, biz.id, biz.name);
  if (reviewNodes.length) {
    (businessNode as any).review = reviewNodes;
  }

  // Distances aux POIs de référence + quartier — additionalProperty (PropertyValue)
  const distanceProps = buildDistancePropertyValues(biz);
  if (distanceProps.length) {
    (businessNode as any).additionalProperty = distanceProps;
  }

  // BreadcrumbList : Maroc › (Ville) › (Quartier) › Fiche — signal fort pour Google/IA
  const slugify = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const crumbs: Array<{ name: string; item: string }> = [
    { name: "Maroc", item: `${BASE_URL}/` },
  ];
  if (biz.city) crumbs.push({ name: biz.city, item: `${BASE_URL}/destination/${slugify(biz.city)}` });
  if (biz.neighborhood) crumbs.push({ name: biz.neighborhood, item: `${BASE_URL}/neighborhood/${slugify(biz.neighborhood)}` });
  crumbs.push({ name: biz.name, item: url });

  const breadcrumbNode = {
    "@type": "BreadcrumbList",
    "@id": `${url}#breadcrumb`,
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.item,
    })),
  };

  const graph: unknown[] = [businessNode, breadcrumbNode];

  // FAQPage : injecté quand la fiche a une FAQ éditoriale
  const faqItems = normalizeFaqItems(biz.faq);
  if (faqItems.length) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      mainEntity: faqItems.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
  }

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@graph": graph,
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

interface HubItem {
  name: string;
  url: string;
  image?: string | null;
}

interface Hub {
  kind: "destination" | "category" | "neighborhood";
  slug: string;       // URL segment (encoded once at write time)
  urlSegment: string; // segment used in canonical URL (may equal slug)
  name: string;
  hook: string | null;
  description: string | null;
  image: string | null;
  latitude?: number | null;
  longitude?: number | null;
  rating?: number | null;
  reviewCount?: number | null;
  wikipedia?: string | null;
  city?: string | null;
  items?: HubItem[];
}

function buildHubHtml(hub: Hub): string {
  const kindLabel = hub.kind === "destination" ? "Destination"
    : hub.kind === "category" ? "Catégorie"
    : "Quartier";
  const title = `${hub.name}${hub.city ? ` – ${hub.city}` : ""} | ${SITE_NAME}`;
  const rawDesc = hub.hook || hub.description || `Découvrez ${hub.name} sur ${SITE_NAME} : établissements, expériences, adresses recommandées.`;
  const description = stripHtml(rawDesc).substring(0, 200);
  const image = hub.image || `${BASE_URL}/images/og-image.jpg`;
  const url = `${BASE_URL}/${hub.kind}/${hub.urlSegment}`;

  const schemaType = hub.kind === "destination" ? "TouristDestination"
    : hub.kind === "neighborhood" ? "Place"
    : "CollectionPage";

  const hubNode: Record<string, unknown> = {
    "@type": schemaType,
    "@id": `${url}#hub`,
    name: hub.name,
    url,
    ...(image && { image }),
    ...(description && { description }),
    ...(hub.latitude && hub.longitude && {
      geo: { "@type": "GeoCoordinates", latitude: hub.latitude, longitude: hub.longitude },
    }),
    ...((() => {
      const links: string[] = [];
      if (hub.wikipedia) links.push(hub.wikipedia);
      links.push(...authorityLinksFor(hub.slug));
      return links.length ? { sameAs: [...new Set(links)] } : {};
    })()),
    ...(hub.rating && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: hub.rating,
        bestRating: 5,
        reviewCount: hub.reviewCount ?? 1,
      },
    }),
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: BASE_URL },
  };

  const graph: unknown[] = [hubNode];

  if (hub.items && hub.items.length) {
    graph.push({
      "@type": "ItemList",
      "@id": `${url}#itemlist`,
      name: `${hub.name} — sélection ${SITE_NAME}`,
      numberOfItems: hub.items.length,
      itemListElement: hub.items.map((it, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: it.url,
        name: it.name,
        ...(it.image && { image: it.image }),
      })),
    });
  }

  const jsonLd = { "@context": "https://schema.org", "@graph": graph };

  const e = {
    title: escapeHtml(title),
    description: escapeHtml(description),
    image: escapeHtml(image),
    url: escapeHtml(url),
    name: escapeHtml(hub.name),
    kindLabel: escapeHtml(kindLabel),
  };

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
      <h1>${e.kindLabel} : ${e.name}</h1>
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
        "id, slug, name, city, neighborhood, region, description, hook_fr, images, main_category, categories, services, languages, address, phone, whatsapp, email, website, latitude, longitude, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, min_price, manual_price_range, opening_hours, is_open_24h, menu_url, booking_url, reserve_now_url, facebook_url, instagram_url, tripadvisor_url, youtube_url, linkedin_url, is_active, faq"
      )
      .in("id", chunk)
      .eq("is_active", true);
    if (error) throw error;
    if (data) businesses.push(...(data as Biz[]));
  }
  const bizById = new Map(businesses.map((b) => [b.id, b]));

  // 2b) Récupère les reviews individuels (max 10 par fiche, avec texte) pour Schema.org Review
  const reviewsByBiz = new Map<string, DbReview[]>();
  const activeIds = businesses.map((b) => b.id);
  for (let i = 0; i < activeIds.length; i += PAGE) {
    const chunk = activeIds.slice(i, i + PAGE);
    const { data, error } = await supabase
      .from("reviews")
      .select("business_id, source, author_name, rating, text, text_fr, text_en, published_at, language")
      .in("business_id", chunk)
      .eq("is_hidden", false)
      .order("rating", { ascending: false })
      .limit(500);
    if (error) { console.warn("[og-pages] reviews fetch error:", error.message); continue; }
    for (const r of (data || []) as DbReview[]) {
      const arr = reviewsByBiz.get(r.business_id) || [];
      if (arr.length < 10) { arr.push(r); reviewsByBiz.set(r.business_id, arr); }
    }
  }

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
    const bizReviews = reviewsByBiz.get(biz.id) || [];
    writeFileSync(join(dir, "index.html"), buildHtml(slug, biz, bizReviews), "utf8");
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

  // 6) Génère les pages HUBS (destinations, catégories, quartiers)
  // Ces répertoires racines sont marqués pour être nettoyables au prochain run.
  const destDir = join(PUBLIC_DIR, "destination");
  const catDir = join(PUBLIC_DIR, "category");
  const nbhDir = join(PUBLIC_DIR, "neighborhood");
  mkdirSync(destDir, { recursive: true });
  mkdirSync(catDir, { recursive: true });
  mkdirSync(nbhDir, { recursive: true });
  writeFileSync(join(destDir, MARKER_FILE), "", "utf8");
  writeFileSync(join(catDir, MARKER_FILE), "", "utf8");
  writeFileSync(join(nbhDir, MARKER_FILE), "", "utf8");

  const hubs: Hub[] = [];

  // 6a) Destinations (jointure vanity_urls -> destinations)
  const destVanities: { slug: string; target_id: string }[] = [];
  {
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from("vanity_urls")
        .select("slug, target_id")
        .eq("target_type", "destination")
        .range(from, from + VPAGE - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      destVanities.push(...(data as { slug: string; target_id: string }[]));
      if (data.length < VPAGE) break;
      from += VPAGE;
    }
  }
  const destIds = destVanities.map((v) => v.target_id);
  const { data: destRows } = destIds.length
    ? await supabase
        .from("destinations")
        .select("id, name_fr, hook_fr, description_fr, image_url, images, latitude, longitude, wikipedia_fr, google_rating, google_review_count")
        .in("id", destIds)
    : { data: [] as any[] };
  const destById = new Map((destRows || []).map((d: any) => [d.id, d]));
  for (const v of destVanities) {
    const d = destById.get(v.target_id);
    if (!d) continue;
    hubs.push({
      kind: "destination",
      slug: v.slug,
      urlSegment: v.slug,
      name: d.name_fr,
      hook: d.hook_fr,
      description: d.description_fr,
      image: d.image_url || (Array.isArray(d.images) && d.images[0]) || null,
      latitude: d.latitude,
      longitude: d.longitude,
      rating: d.google_rating,
      reviewCount: d.google_review_count,
      wikipedia: d.wikipedia_fr,
    });
  }

  // 6b) Catégories
  const { data: catRows } = await supabase
    .from("categories")
    .select("name_fr, og_image_url, adj_fr");
  for (const c of catRows || []) {
    if (!c.name_fr) continue;
    const encoded = encodeURIComponent(c.name_fr);
    hubs.push({
      kind: "category",
      slug: encoded,
      urlSegment: encoded,
      name: c.name_fr,
      hook: c.adj_fr ? `Découvrez les meilleurs établissements ${c.adj_fr} au Maroc.` : null,
      description: `Toutes les adresses ${c.name_fr.toLowerCase()} recommandées à Marrakech, Essaouira et au Maroc.`,
      image: c.og_image_url || null,
    });
  }

  // 6c) Quartiers
  const { data: nbhRows } = await supabase
    .from("neighborhoods")
    .select("name_fr, hook_fr, description_fr, image_url, latitude, longitude, city_id");
  // Résout le nom de ville
  const cityIds = [...new Set((nbhRows || []).map((n: any) => n.city_id).filter(Boolean))];
  const { data: cityRows } = cityIds.length
    ? await supabase.from("destinations").select("id, name_fr").in("id", cityIds)
    : { data: [] as any[] };
  const cityById = new Map((cityRows || []).map((c: any) => [c.id, c.name_fr]));
  for (const n of nbhRows || []) {
    if (!n.name_fr) continue;
    const encoded = encodeURIComponent(n.name_fr);
    hubs.push({
      kind: "neighborhood",
      slug: encoded,
      urlSegment: encoded,
      name: n.name_fr,
      hook: n.hook_fr,
      description: n.description_fr,
      image: n.image_url || null,
      latitude: n.latitude,
      longitude: n.longitude,
      city: cityById.get(n.city_id) || null,
    });
  }

  // 6d) Enrichissement ItemList : top établissements par hub (max 20, tri google_rating desc)
  const slugByBizId = new Map(vanities.map((v) => [v.target_id, v.slug]));
  const eligibleBiz = businesses.filter((b) => slugByBizId.has(b.id));
  const norm = (s: string | null | undefined) =>
    (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  for (const h of hubs) {
    const key = norm(h.name);
    let matches: Biz[] = [];
    if (h.kind === "destination") {
      matches = eligibleBiz.filter((b) => norm(b.city) === key);
    } else if (h.kind === "neighborhood") {
      matches = eligibleBiz.filter((b) => norm(b.neighborhood) === key);
    } else {
      matches = eligibleBiz.filter(
        (b) => norm(b.main_category) === key || (b.categories || []).some((c) => norm(c) === key),
      );
    }
    matches.sort((a, b) => (b.google_rating ?? 0) - (a.google_rating ?? 0));
    h.items = matches.slice(0, 20).map((b) => ({
      name: b.name,
      url: `${BASE_URL}/${slugByBizId.get(b.id)}`,
      image: b.images?.[0] || null,
    }));
  }

  // 6e) Écriture des hubs
  let hubsWritten = 0;
  for (const h of hubs) {
    const dir = join(PUBLIC_DIR, h.kind, h.slug);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "index.html"), buildHubHtml(h), "utf8");
    hubsWritten++;
  }

  // 7) Page /events : ItemList d'Event Schema.org (agrégation)
  const { data: eventRows } = await supabase
    .from("events")
    .select("id, name, hook, description, start_date, end_date, start_time, end_time, images, logo_url, city_id, neighborhood_id, url, google_maps_url, latitude, longitude, recurrence, days_of_week, type")
    .order("start_date", { ascending: true, nullsFirst: false })
    .limit(200);

  const eventCityIds = [...new Set((eventRows || []).map((e: any) => e.city_id).filter(Boolean))];
  const { data: eventCityRows } = eventCityIds.length
    ? await supabase.from("destinations").select("id, name_fr, latitude, longitude").in("id", eventCityIds)
    : { data: [] as any[] };
  const eventCityById = new Map((eventCityRows || []).map((c: any) => [c.id, c]));

  const eventsWritten = writeEventsHub(eventRows || [], eventCityById);

  console.log(`[og-pages] ${written} fichiers business générés (${skipped} ignorés) + ${articles.length} articles blog + ${hubsWritten} hubs + ${eventsWritten} events dans /events.`);
}

function writeEventsHub(
  eventRows: Array<Record<string, any>>,
  cityById: Map<string, { name_fr: string; latitude?: number; longitude?: number }>,
): number {
  const today = new Date().toISOString().slice(0, 10);
  const events = eventRows
    .filter((e) => e.name)
    // Garde événements à venir OU récurrents OU sans date (permanents)
    .filter((e) => !e.end_date || e.end_date >= today);

  const eventNodes = events.map((ev) => {
    const city = ev.city_id ? cityById.get(ev.city_id) : null;
    const startISO = ev.start_date
      ? (ev.start_time ? `${ev.start_date}T${ev.start_time}:00` : ev.start_date)
      : null;
    const endISO = ev.end_date
      ? (ev.end_time ? `${ev.end_date}T${ev.end_time}:00` : ev.end_date)
      : null;
    const isRecurring = !!(ev.recurrence || (ev.days_of_week && ev.days_of_week.length));
    const eventUrl = ev.url || `${BASE_URL}/search?q=${encodeURIComponent(ev.name)}`;
    const node: Record<string, unknown> = {
      "@type": isRecurring ? "Event" : "Event",
      name: ev.name,
      ...(ev.hook || ev.description ? { description: stripHtml(ev.hook || ev.description || "").substring(0, 300) } : {}),
      ...(startISO ? { startDate: startISO } : {}),
      ...(endISO ? { endDate: endISO } : {}),
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      ...(ev.images?.[0] || ev.logo_url ? { image: ev.images?.[0] || ev.logo_url } : {}),
      url: eventUrl,
      location: {
        "@type": "Place",
        name: city?.name_fr || "Maroc",
        ...(ev.google_maps_url && { hasMap: ev.google_maps_url }),
        address: {
          "@type": "PostalAddress",
          ...(city?.name_fr && { addressLocality: city.name_fr }),
          addressCountry: "MA",
        },
        ...((ev.latitude && ev.longitude) || (city?.latitude && city?.longitude)
          ? {
              geo: {
                "@type": "GeoCoordinates",
                latitude: ev.latitude ?? city?.latitude,
                longitude: ev.longitude ?? city?.longitude,
              },
            }
          : {}),
      },
      organizer: { "@type": "Organization", name: SITE_NAME, url: BASE_URL },
    };
    return node;
  });

  const url = `${BASE_URL}/events`;
  const title = `Événements & sorties au Maroc | ${SITE_NAME}`;
  const description = `Concerts, festivals, marchés, retraites et sorties récurrentes sélectionnés à Marrakech, Essaouira et partout au Maroc.`;
  const image = `${BASE_URL}/images/og-image.jpg`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${url}#page`,
        name: title,
        description,
        url,
        isPartOf: { "@type": "WebSite", name: SITE_NAME, url: BASE_URL },
      },
      {
        "@type": "ItemList",
        "@id": `${url}#events`,
        name: `Événements ${SITE_NAME}`,
        numberOfItems: eventNodes.length,
        itemListElement: eventNodes.map((ev, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item: ev,
        })),
      },
    ],
  };

  const e = {
    title: escapeHtml(title),
    description: escapeHtml(description),
    image: escapeHtml(image),
    url: escapeHtml(url),
  };
  const html = `<!doctype html>
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
          .then(function (html) { document.open(); document.write(html); document.close(); })
          .catch(function () {});
      })();
    </script>
    <noscript>
      <h1>${e.title}</h1>
      <p>${e.description}</p>
    </noscript>
  </body>
</html>`;

  const eventsDir = join(PUBLIC_DIR, "events");
  mkdirSync(eventsDir, { recursive: true });
  writeFileSync(join(eventsDir, "index.html"), html, "utf8");
  writeFileSync(join(eventsDir, ".og-generated"), "", "utf8");
  return eventNodes.length;
}

main().catch((err) => {
  console.error("[og-pages] Erreur:", err);
  process.exit(1);
});

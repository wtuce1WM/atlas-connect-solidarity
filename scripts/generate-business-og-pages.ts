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

interface ArticleEntry {
  rank?: number | null;
  pretitle?: string | null;
  title?: string | null;
  hook?: string | null;
  hours?: string | null;
  paragraphs?: string[] | null;
  id?: string | null;
}

interface ArticleFaq {
  question?: string | null;
  answer?: string | null;
}

interface ArticleSection {
  title?: string | null;
  body?: string | null;
  paragraphs?: string[] | null;
}

interface StaticArticle {
  path: string;
  title: string;
  description: string;
  image: string;
  publishedAt: string;
  modifiedAt: string;
  /** Corps SEO (prérendu lisible sans JS) */
  heroTitle?: string;
  intro?: string | null;
  tldr?: string | null;
  content?: string | null;
  entries?: ArticleEntry[] | null;
  sections?: ArticleSection[] | null;
  faq?: ArticleFaq[] | null;
  authorName?: string | null;
  /** id business → URL interne (vanity) pour le maillage */
  entryUrlById?: Map<string, string>;
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

export interface BizRelations {
  pois?: Array<{ name: string; latitude?: number | null; longitude?: number | null; wikipedia?: string | null; url?: string | null; image?: string | null }>;
  destinations?: Array<{ name: string; wikipedia?: string | null; url?: string | null; image?: string | null; latitude?: number | null; longitude?: number | null }>;
  events?: Array<{ name: string; start_date?: string | null; end_date?: string | null; url?: string | null; image?: string | null; latitude?: number | null; longitude?: number | null; description?: string | null }>;
}

const DAY_LABELS_FR: Record<string, string> = {
  monday: "Lun", tuesday: "Mar", wednesday: "Mer", thursday: "Jeu",
  friday: "Ven", saturday: "Sam", sunday: "Dim",
};

function formatOpeningHoursText(oh: Biz["opening_hours"], is24h: boolean | null): string | null {
  if (is24h) return "Ouvert 24h/24, 7j/7";
  if (!oh || typeof oh !== "object") return null;
  const parts: string[] = [];
  for (const key of Object.keys(DAY_LABELS_FR)) {
    const d = oh[key];
    if (!d) continue;
    if (d.closed) { parts.push(`${DAY_LABELS_FR[key]} : fermé`); continue; }
    if (d.continuous) { parts.push(`${DAY_LABELS_FR[key]} : ouvert en continu`); continue; }
    if (d.open && d.close) {
      let s = `${DAY_LABELS_FR[key]} : ${d.open}–${d.close}`;
      if (d.open2 && d.close2) s += `, ${d.open2}–${d.close2}`;
      parts.push(s);
    }
  }
  return parts.length ? parts.join(" · ") : null;
}

function buildSeoBody(
  biz: Biz,
  reviews: DbReview[],
  relations: BizRelations,
  distanceProps: Array<Record<string, unknown>>,
  faqItems: Array<{ q: string; a: string }>,
  url: string,
  slugify: (s: string) => string,
): string {
  const parts: string[] = [];
  const img = biz.images?.[0];
  const heading = escapeHtml(`${biz.name}${biz.city ? ` — ${biz.city}` : ""}`);
  parts.push(`<h1>${heading}</h1>`);
  if (img) parts.push(`<img src="${escapeHtml(img)}" alt="${escapeHtml(biz.name)}" loading="lazy" width="1200" height="630" />`);

  const longDesc = stripHtml(biz.description || biz.hook_fr || "");
  if (longDesc) parts.push(`<p>${escapeHtml(longDesc)}</p>`);

  // Informations
  const infoRows: string[] = [];
  if (biz.main_category) infoRows.push(`<li><strong>Catégorie&nbsp;:</strong> ${escapeHtml(biz.main_category)}</li>`);
  const addrBits = [biz.address, biz.neighborhood, biz.city].filter(Boolean).join(", ");
  if (addrBits) infoRows.push(`<li><strong>Adresse&nbsp;:</strong> ${escapeHtml(addrBits)}</li>`);
  if (biz.phone) infoRows.push(`<li><strong>Téléphone&nbsp;:</strong> ${escapeHtml(biz.phone)}</li>`);
  if (biz.whatsapp) infoRows.push(`<li><strong>WhatsApp&nbsp;:</strong> ${escapeHtml(biz.whatsapp)}</li>`);
  if (biz.email) infoRows.push(`<li><strong>Email&nbsp;:</strong> ${escapeHtml(biz.email)}</li>`);
  if (biz.website) infoRows.push(`<li><strong>Site web&nbsp;:</strong> <a href="${escapeHtml(biz.website)}" rel="noopener">${escapeHtml(biz.website)}</a></li>`);
  const priceStr = biz.manual_price_range
    || (typeof biz.min_price === "number" && biz.min_price > 0 ? `à partir de ${biz.min_price} MAD` : null);
  if (priceStr) infoRows.push(`<li><strong>Prix&nbsp;:</strong> ${escapeHtml(priceStr)}</li>`);
  if (biz.languages && biz.languages.length) infoRows.push(`<li><strong>Langues&nbsp;:</strong> ${escapeHtml(biz.languages.join(", "))}</li>`);
  if (biz.google_rating) infoRows.push(`<li><strong>Note Google&nbsp;:</strong> ${biz.google_rating}/5 (${biz.google_review_count ?? 0} avis)</li>`);
  const hoursText = formatOpeningHoursText(biz.opening_hours, biz.is_open_24h);
  if (hoursText) infoRows.push(`<li><strong>Horaires&nbsp;:</strong> ${escapeHtml(hoursText)}</li>`);
  if (infoRows.length) {
    parts.push(`<section><h2>Informations pratiques</h2><ul>${infoRows.join("")}</ul></section>`);
  }

  // Services
  if (biz.services && biz.services.length) {
    const items = biz.services.slice(0, 20).map((s) => `<li>${escapeHtml(s)}</li>`).join("");
    parts.push(`<section><h2>Services proposés</h2><ul>${items}</ul></section>`);
  }

  // Catégories additionnelles
  if (biz.categories && biz.categories.length > 1) {
    const items = biz.categories.slice(0, 10).map((c) => `<li>${escapeHtml(c)}</li>`).join("");
    parts.push(`<section><h2>Catégories</h2><ul>${items}</ul></section>`);
  }

  // Avis (top 3 avec texte)
  const topReviews = reviews
    .filter((r) => r.business_id === biz.id)
    .filter((r) => (r.text_fr || r.text || r.text_en || "").trim().length >= 30)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 3);
  if (topReviews.length) {
    const items = topReviews.map((r) => {
      const body = stripHtml(r.text_fr || r.text || r.text_en || "").substring(0, 400);
      const author = escapeHtml(r.author_name || "Visiteur");
      const rating = r.rating ? ` (${r.rating}/5)` : "";
      const src = r.source ? ` — ${escapeHtml(r.source)}` : "";
      return `<article><p><strong>${author}${rating}${src}</strong></p><p>${escapeHtml(body)}</p></article>`;
    }).join("");
    parts.push(`<section><h2>Avis clients</h2>${items}</section>`);
  }

  // FAQ
  if (faqItems.length) {
    const items = faqItems.slice(0, 10).map((f) =>
      `<div><h3>${escapeHtml(f.q)}</h3><p>${escapeHtml(f.a)}</p></div>`
    ).join("");
    parts.push(`<section><h2>Questions fréquentes</h2>${items}</section>`);
  }

  // À proximité (POIs de la relation + distances landmarks)
  const nearby: string[] = [];
  for (const p of (relations.pois || []).slice(0, 8)) {
    if (p.name) nearby.push(`<li>${escapeHtml(p.name)}</li>`);
  }
  for (const dp of distanceProps) {
    const name = String(dp.name || "");
    const val = String(dp.value || "");
    if (name.startsWith("Distance ") && val) {
      nearby.push(`<li>${escapeHtml(name.replace("Distance ", ""))} : ${escapeHtml(val)}&nbsp;km</li>`);
    }
  }
  if (nearby.length) {
    parts.push(`<section><h2>À proximité</h2><ul>${nearby.join("")}</ul></section>`);
  }

  // Événements
  if (relations.events && relations.events.length) {
    const items = relations.events.slice(0, 5).map((e) => {
      const date = e.start_date ? ` (${escapeHtml(e.start_date.substring(0, 10))})` : "";
      return `<li>${escapeHtml(e.name)}${date}</li>`;
    }).join("");
    parts.push(`<section><h2>Événements</h2><ul>${items}</ul></section>`);
  }

  // Navigation contextuelle
  const navLinks: string[] = [];
  if (biz.city) navLinks.push(`<a href="/destination/${slugify(biz.city)}">Découvrir ${escapeHtml(biz.city)}</a>`);
  if (biz.neighborhood) navLinks.push(`<a href="/neighborhood/${slugify(biz.neighborhood)}">Quartier ${escapeHtml(biz.neighborhood)}</a>`);
  if (biz.main_category) navLinks.push(`<a href="/category/${slugify(biz.main_category)}">Autres ${escapeHtml(biz.main_category)}</a>`);
  navLinks.push(`<a href="${escapeHtml(url)}">Voir la fiche complète</a>`);
  parts.push(`<nav>${navLinks.join(" · ")}</nav>`);

  return `<main hidden aria-hidden="true">${parts.join("")}</main>`;
}

function buildHtml(slug: string, biz: Biz, reviews: DbReview[] = [], relations: BizRelations = {}): string {
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

  // containedInPlace : Quartier → Ville → Région → Maroc (chaîne d'appartenance)
  // Signal fort pour les LLM et Google : localise l'entité dans la hiérarchie géo.
  const containedChain: Array<Record<string, unknown>> = [];
  if (biz.city) {
    const cityNode: Record<string, unknown> = { "@type": "City", name: biz.city, address: { "@type": "PostalAddress", addressLocality: biz.city, addressCountry: "MA" } };
    if (biz.region) {
      cityNode.containedInPlace = { "@type": "AdministrativeArea", name: biz.region, containedInPlace: { "@type": "Country", name: "Maroc", identifier: "MA" } };
    } else {
      cityNode.containedInPlace = { "@type": "Country", name: "Maroc", identifier: "MA" };
    }
    if (biz.neighborhood) {
      containedChain.push({ "@type": "Place", name: biz.neighborhood, containedInPlace: cityNode });
    } else {
      containedChain.push(cityNode);
    }
  } else if (biz.region) {
    containedChain.push({ "@type": "AdministrativeArea", name: biz.region, containedInPlace: { "@type": "Country", name: "Maroc", identifier: "MA" } });
  }
  if (containedChain.length) {
    (businessNode as any).containedInPlace = containedChain.length === 1 ? containedChain[0] : containedChain;
  }

  // nearbyAttraction : POIs liés à la fiche (business_poi_businesses) + destinations touristiques
  const attractions: Array<Record<string, unknown>> = [];
  for (const p of relations.pois || []) {
    if (!p.name) continue;
    const node: Record<string, unknown> = { "@type": "TouristAttraction", name: p.name };
    if (p.latitude && p.longitude) node.geo = { "@type": "GeoCoordinates", latitude: p.latitude, longitude: p.longitude };
    if (p.image) node.image = p.image;
    const sa: string[] = [];
    if (p.wikipedia) sa.push(p.wikipedia);
    if (p.url) sa.push(p.url);
    if (sa.length) node.sameAs = sa;
    attractions.push(node);
  }
  for (const d of relations.destinations || []) {
    if (!d.name) continue;
    const node: Record<string, unknown> = { "@type": "TouristDestination", name: d.name };
    if (d.latitude && d.longitude) node.geo = { "@type": "GeoCoordinates", latitude: d.latitude, longitude: d.longitude };
    if (d.image) node.image = d.image;
    const sa: string[] = [];
    if (d.wikipedia) sa.push(d.wikipedia);
    if (d.url) sa.push(d.url);
    if (sa.length) node.sameAs = sa;
    attractions.push(node);
  }
  if (attractions.length) {
    (businessNode as any).nearbyAttraction = attractions.slice(0, 15);
  }

  // event : événements récurrents/ponctuels rattachés (event_businesses)
  const evts = (relations.events || []).filter((e) => e.name).slice(0, 10).map((e) => {
    const node: Record<string, unknown> = { "@type": "Event", name: e.name };
    if (e.start_date) node.startDate = e.start_date;
    if (e.end_date) node.endDate = e.end_date;
    if (e.url) node.url = e.url;
    if (e.image) node.image = e.image;
    if (e.description) node.description = stripHtml(e.description).substring(0, 300);
    if (e.latitude && e.longitude) {
      node.location = { "@type": "Place", name: biz.name, geo: { "@type": "GeoCoordinates", latitude: e.latitude, longitude: e.longitude } };
    } else {
      node.location = { "@type": "Place", name: biz.name };
    }
    return node;
  });
  if (evts.length) {
    (businessNode as any).event = evts;
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
    ${buildSeoBody(biz, reviews, relations, distanceProps, faqItems, url, slugify)}
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
  </body>
</html>`;
}

function buildArticleHtml(article: StaticArticle): string {
  const title = article.title;
  const description = stripHtml(article.description).substring(0, 200);
  const image = article.image || `${BASE_URL}/og-install-app.jpg`;
  const url = `${BASE_URL}/${article.path}`;
  const cleanTitle = title.replace(` — ${SITE_NAME}`, "");
  const h1 = article.heroTitle?.trim() || cleanTitle;

  /* ---- Corps SEO lisible sans JS (Googlebot + crawlers IA) ---- */
  const parts: string[] = [];
  parts.push(`<h1>${escapeHtml(h1)}</h1>`);
  if (article.tldr) {
    parts.push(`<section><h2>L'essentiel</h2><p>${escapeHtml(stripHtml(article.tldr))}</p></section>`);
  }
  const seenParagraphs = new Set<string>();
  const pushParagraph = (raw: string) => {
    const txt = stripHtml(raw).trim();
    if (!txt) return;
    const key = txt.toLowerCase().replace(/\s+/g, " ");
    if (seenParagraphs.has(key)) return;
    seenParagraphs.add(key);
    parts.push(`<p>${escapeHtml(txt)}</p>`);
  };
  for (const src of [article.intro, article.content]) {
    if (!src) continue;
    for (const p of stripHtml(src).split(/\n{2,}|\r?\n/)) pushParagraph(p);
  }

  for (const s of article.sections || []) {
    if (s.title) parts.push(`<h2>${escapeHtml(stripHtml(s.title))}</h2>`);
    const bodies = [
      ...(s.paragraphs || []),
      ...(s.body ? [s.body] : []),
    ];
    for (const b of bodies) {
      const txt = stripHtml(String(b)).trim();
      if (txt) parts.push(`<p>${escapeHtml(txt)}</p>`);
    }
  }

  const entries = (article.entries || []).filter((en) => en && (en.title || en.hook));
  const listItems: any[] = [];
  if (entries.length) {
    parts.push(`<h2>${escapeHtml(`La sélection ${SITE_NAME}`)}</h2>`);
    entries.forEach((en, i) => {
      const name = stripHtml(String(en.title || "")).trim();
      const internal = en.id ? article.entryUrlById?.get(en.id) : undefined;
      const heading = internal
        ? `<a href="${escapeHtml(internal)}">${escapeHtml(name)}</a>`
        : escapeHtml(name);
      parts.push(`<h3>${en.rank ? `${en.rank}. ` : ""}${heading}</h3>`);
      if (en.pretitle) parts.push(`<p><strong>${escapeHtml(stripHtml(String(en.pretitle)))}</strong></p>`);
      if (en.hook) parts.push(`<p>${escapeHtml(stripHtml(String(en.hook)))}</p>`);
      for (const p of en.paragraphs || []) {
        const txt = stripHtml(String(p)).trim();
        if (txt) parts.push(`<p>${escapeHtml(txt)}</p>`);
      }
      if (en.hours) parts.push(`<p>${escapeHtml(stripHtml(String(en.hours)))}</p>`);
      if (name) {
        listItems.push({
          "@type": "ListItem",
          position: i + 1,
          name,
          ...(internal ? { url: internal } : {}),
        });
      }
    });
  }

  const faq = (article.faq || []).filter((f) => f?.question && f?.answer);
  if (faq.length) {
    parts.push(`<h2>Questions fréquentes</h2>`);
    for (const f of faq) {
      parts.push(`<h3>${escapeHtml(stripHtml(String(f.question)))}</h3><p>${escapeHtml(stripHtml(String(f.answer)))}</p>`);
    }
  }
  parts.push(`<p><a href="${BASE_URL}/blog">Retour au blog ${escapeHtml(SITE_NAME)}</a></p>`);
  const bodyHtml = parts.join("\n      ");
  const wordCount = stripHtml(parts.join(" ")).split(/\s+/).filter(Boolean).length;

  const articleLd: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: cleanTitle,
    description,
    image: [image],
    datePublished: article.publishedAt,
    dateModified: article.modifiedAt,
    inLanguage: "fr",
    ...(wordCount ? { wordCount } : {}),
    author: article.authorName
      ? { "@type": "Person", name: article.authorName }
      : { "@type": "Organization", name: SITE_NAME, url: BASE_URL },
    publisher: { "@type": "Organization", name: SITE_NAME, logo: { "@type": "ImageObject", url: `${BASE_URL}/favicon.webp` } },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };
  const graph: any[] = [articleLd];
  graph.push({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE_NAME, item: `${BASE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${BASE_URL}/blog` },
      { "@type": "ListItem", position: 3, name: cleanTitle, item: url },
    ],
  });
  if (listItems.length) {
    graph.push({
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: cleanTitle,
      numberOfItems: listItems.length,
      itemListElement: listItems,
    });
  }

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
    <meta property="article:published_time" content="${escapeHtml(article.publishedAt)}" />
    <meta property="article:modified_time" content="${escapeHtml(article.modifiedAt)}" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${e.title}" />
    <meta name="twitter:description" content="${e.description}" />
    <meta name="twitter:image" content="${e.image}" />

${graph.map((g) => `    <script type="application/ld+json">${JSON.stringify(g).replace(/</g, "\\u003c")}</script>`).join("\n")}
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
    <main style="max-width:52rem;margin:0 auto;padding:24px;font-family:system-ui,sans-serif;color:#2b2b2b;line-height:1.6">
      ${bodyHtml}
    </main>
  </body>
</html>`;

}

/* ------------------------------------------------------------------------
 * Page custom /blog/etablissements-notes — prérendu COMPLET (contenu lisible
 * sans JS) pour Googlebot et les crawlers IA (ClaudeBot, GPTBot, PerplexityBot…),
 * qui n'exécutent pas le React de la SPA et ne voyaient donc que le shell.
 * Les visiteurs humains sont réhydratés vers l'app (même script que les autres
 * shells statiques).
 * ---------------------------------------------------------------------- */
interface RankedRow {
  rank: number;
  name: string;
  url: string;
  city: string;
  neighborhood: string;
  subcat: string;
  google: string;
  guru: string;
  tripadvisor: string;
  avg: string;
  total: number;
}

function buildRatedRankingHtml(rows: RankedRow[], totalCount: number, image: string): string {
  const url = `${BASE_URL}/blog/etablissements-notes`;
  const title = `Classement des établissements notés au Maroc — ${SITE_NAME}`;
  const description = `Classement sur 20 de ${totalCount} établissements du Maroc : notes Google, TripAdvisor et Restaurant Guru réunies. Hôtels, riads, restaurants et activités à Marrakech, Essaouira et au-delà.`;
  const e = {
    title: escapeHtml(title),
    description: escapeHtml(description),
    image: escapeHtml(image),
    url: escapeHtml(url),
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Classement des établissements notés au Maroc",
    description,
    numberOfItems: rows.length,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    itemListElement: rows.slice(0, 100).map((r) => ({
      "@type": "ListItem",
      position: r.rank,
      url: r.url,
      name: r.name,
    })),
  };

  const tableRows = rows
    .map(
      (r) => `<tr>
        <td>${r.rank}</td>
        <td><a href="${escapeHtml(r.url)}">${escapeHtml(r.name)}</a></td>
        <td>${escapeHtml(r.city)}</td>
        <td>${escapeHtml(r.neighborhood)}</td>
        <td>${escapeHtml(r.subcat)}</td>
        <td>${escapeHtml(r.google)}</td>
        <td>${escapeHtml(r.guru)}</td>
        <td>${escapeHtml(r.tripadvisor)}</td>
        <td><strong>${escapeHtml(r.avg)}</strong></td>
        <td>${r.total}</td>
      </tr>`,
    )
    .join("\n");

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
    <main style="font-family:system-ui,sans-serif;max-width:1100px;margin:0 auto;padding:24px">
      <h1>Établissements notés au Maroc</h1>
      <p>${e.description}</p>
      <p>
        Méthodologie : chaque note source (Google, Restaurant Guru, TripAdvisor) est ramenée sur 20,
        puis pondérée par le nombre d'avis de la source. Le classement ci-dessous présente les
        ${rows.length} meilleurs établissements sur ${totalCount} référencés avec des avis vérifiés.
      </p>
      <table border="1" cellspacing="0" cellpadding="4">
        <thead>
          <tr>
            <th>#</th><th>Nom</th><th>Ville</th><th>Quartier</th><th>Sous-catégorie</th>
            <th>Google</th><th>Restaurant Guru</th><th>TripAdvisor</th><th>Moyenne /20</th><th>Total avis</th>
          </tr>
        </thead>
        <tbody>
${tableRows}
        </tbody>
      </table>
      <p><a href="${BASE_URL}/blog">Retour au blog ${SITE_NAME}</a></p>
    </main>
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

  // 2c) Récupère les relations business → POIs / destinations / events
  // Ces jointures alimentent nearbyAttraction / containedInPlace / event dans le JSON-LD.
  const relationsByBiz = new Map<string, BizRelations>();
  const getRel = (id: string): BizRelations => {
    let r = relationsByBiz.get(id);
    if (!r) { r = { pois: [], destinations: [], events: [] }; relationsByBiz.set(id, r); }
    return r;
  };

  // POIs liés
  try {
    const poiLinks: Array<{ business_id: string; poi_business_id: string }> = [];
    for (let i = 0; i < activeIds.length; i += PAGE) {
      const chunk = activeIds.slice(i, i + PAGE);
      const { data } = await supabase.from("business_poi_businesses").select("business_id, poi_business_id").in("business_id", chunk);
      if (data) poiLinks.push(...(data as any));
    }
    const poiIds = [...new Set(poiLinks.map((l) => l.poi_business_id).filter(Boolean))];
    const poiById = new Map<string, any>();
    for (let i = 0; i < poiIds.length; i += PAGE) {
      const chunk = poiIds.slice(i, i + PAGE);
      const { data } = await supabase.from("points_of_interest").select("id, name_fr, latitude, longitude, wikipedia_fr, official_site_fr, image_url").in("id", chunk);
      for (const p of (data || []) as any[]) poiById.set(p.id, p);
    }
    for (const l of poiLinks) {
      const p = poiById.get(l.poi_business_id);
      if (!p?.name_fr) continue;
      getRel(l.business_id).pois!.push({
        name: p.name_fr,
        latitude: p.latitude,
        longitude: p.longitude,
        wikipedia: p.wikipedia_fr,
        url: p.official_site_fr,
        image: p.image_url,
      });
    }
  } catch (e) { console.warn("[og-pages] POI relations fetch failed:", (e as Error).message); }

  // Destinations liées
  try {
    const destLinks: Array<{ business_id: string; destination_id: string }> = [];
    for (let i = 0; i < activeIds.length; i += PAGE) {
      const chunk = activeIds.slice(i, i + PAGE);
      const { data } = await supabase.from("business_destinations").select("business_id, destination_id").in("business_id", chunk);
      if (data) destLinks.push(...(data as any));
    }
    const destIds = [...new Set(destLinks.map((l) => l.destination_id).filter(Boolean))];
    const destById = new Map<string, any>();
    for (let i = 0; i < destIds.length; i += PAGE) {
      const chunk = destIds.slice(i, i + PAGE);
      const { data } = await supabase.from("destinations").select("id, name_fr, latitude, longitude, wikipedia_fr, image_url").in("id", chunk);
      for (const d of (data || []) as any[]) destById.set(d.id, d);
    }
    for (const l of destLinks) {
      const d = destById.get(l.destination_id);
      if (!d?.name_fr) continue;
      getRel(l.business_id).destinations!.push({
        name: d.name_fr,
        latitude: d.latitude,
        longitude: d.longitude,
        wikipedia: d.wikipedia_fr,
        image: d.image_url,
      });
    }
  } catch (e) { console.warn("[og-pages] destination relations fetch failed:", (e as Error).message); }

  // Events liés
  try {
    const evtLinks: Array<{ business_id: string; event_id: string }> = [];
    for (let i = 0; i < activeIds.length; i += PAGE) {
      const chunk = activeIds.slice(i, i + PAGE);
      const { data } = await supabase.from("event_businesses").select("business_id, event_id").in("business_id", chunk);
      if (data) evtLinks.push(...(data as any));
    }
    const evtIds = [...new Set(evtLinks.map((l) => l.event_id).filter(Boolean))];
    const evtById = new Map<string, any>();
    for (let i = 0; i < evtIds.length; i += PAGE) {
      const chunk = evtIds.slice(i, i + PAGE);
      const { data } = await supabase.from("events").select("id, name, description, start_date, end_date, latitude, longitude, url, images, logo_url").in("id", chunk);
      for (const ev of (data || []) as any[]) evtById.set(ev.id, ev);
    }
    for (const l of evtLinks) {
      const ev = evtById.get(l.event_id);
      if (!ev?.name) continue;
      getRel(l.business_id).events!.push({
        name: ev.name,
        description: ev.description,
        start_date: ev.start_date,
        end_date: ev.end_date,
        latitude: ev.latitude,
        longitude: ev.longitude,
        url: ev.url,
        image: (Array.isArray(ev.images) && ev.images[0]) || ev.logo_url || null,
      });
    }
  } catch (e) { console.warn("[og-pages] event relations fetch failed:", (e as Error).message); }

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
    const bizRelations = relationsByBiz.get(biz.id) || {};
    writeFileSync(join(dir, "index.html"), buildHtml(slug, biz, bizReviews, bizRelations), "utf8");
    writeFileSync(join(dir, MARKER_FILE), "", "utf8");
    written++;
  }


  // 5) Récupère les articles blog publiés depuis la DB (blog_posts)
  const blogDir = join(PUBLIC_DIR, "blog");
  mkdirSync(blogDir, { recursive: true });
  writeFileSync(join(blogDir, MARKER_FILE), "", "utf8");

  const { data: posts, error: postsErr } = await supabase
    .from("blog_posts")
    .select(
      "slug, title_fr, excerpt_fr, cover_image_url, custom_hero_image_url, published_at, updated_at, is_published, author_name, hero_title_top_fr, hero_title_bottom_fr, intro_fr, tldr_fr, content_fr, entries_fr, editorial_sections_fr, faq_fr",
    )
    .eq("is_published", true);
  if (postsErr) console.error("[og-pages] blog_posts fetch error:", postsErr);

  // Maillage interne : id business → URL vanity (sinon /fiche/slug)
  const bizUrlById = new Map<string, string>();
  for (const v of vanities) if (v.slug && v.target_id) bizUrlById.set(v.target_id, `${BASE_URL}/${v.slug}`);
  for (const b of bizById.values() as any) {
    if (b?.id && !bizUrlById.has(b.id) && b.slug) bizUrlById.set(b.id, `${BASE_URL}/fiche/${b.slug}`);
  }

  const articles: StaticArticle[] = (posts || [])
    .filter((p: any) => p.slug && p.title_fr)
    .map((p: any): StaticArticle => ({
      path: `blog/${p.slug}`,
      title: `${p.title_fr} — ${SITE_NAME}`,
      description: p.excerpt_fr || `Découvrez ${p.title_fr} sur ${SITE_NAME}.`,
      image: p.custom_hero_image_url || p.cover_image_url || `${BASE_URL}/og-install-app.jpg`,
      publishedAt: p.published_at || p.updated_at || new Date().toISOString(),
      modifiedAt: p.updated_at || p.published_at || new Date().toISOString(),
      heroTitle:
        [p.hero_title_top_fr, p.hero_title_bottom_fr].filter(Boolean).join(" ").trim() || p.title_fr,
      intro: p.intro_fr || null,
      tldr: p.tldr_fr || null,
      content: p.content_fr || null,
      entries: Array.isArray(p.entries_fr) ? (p.entries_fr as ArticleEntry[]) : null,
      sections: Array.isArray(p.editorial_sections_fr) ? (p.editorial_sections_fr as ArticleSection[]) : null,
      faq: Array.isArray(p.faq_fr) ? (p.faq_fr as ArticleFaq[]) : null,
      authorName: p.author_name || null,
      entryUrlById: bizUrlById,
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

  // 5b) Page custom /blog/etablissements-notes : prérendu du classement réel
  //     (contenu lisible sans JS pour Googlebot + crawlers IA).
  try {
    const RPAGE = 1000;
    let rFrom = 0;
    const rated: any[] = [];
    while (true) {
      const { data, error } = await supabase
        .from("businesses")
        .select(
          "id, slug, name, city, neighborhood, main_category, categories, services, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, restaurant_guru_rating, restaurant_guru_review_count",
        )
        .eq("is_active", true)
        .or("google_review_count.gt.0,tripadvisor_review_count.gt.0,restaurant_guru_review_count.gt.0")
        .order("id")
        .range(rFrom, rFrom + RPAGE - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      rated.push(...data);
      if (data.length < RPAGE) break;
      rFrom += RPAGE;
    }

    const vanityBySlugTarget = new Map(vanities.map((v) => [v.target_id, v.slug]));
    const scored = rated
      .map((b) => {
        const sources: Array<{ rating: number; count: number }> = [];
        if (b.google_rating && b.google_review_count) sources.push({ rating: b.google_rating, count: b.google_review_count });
        if (b.tripadvisor_rating && b.tripadvisor_review_count) sources.push({ rating: b.tripadvisor_rating, count: b.tripadvisor_review_count });
        if (b.restaurant_guru_rating && b.restaurant_guru_review_count) sources.push({ rating: b.restaurant_guru_rating, count: b.restaurant_guru_review_count });
        const total = sources.reduce((s, x) => s + x.count, 0);
        if (!total) return null;
        const avg = Math.round((sources.reduce((s, x) => s + (x.rating / 5) * 20 * x.count, 0) / total) * 100) / 100;
        const vslug = vanityBySlugTarget.get(b.id) || b.slug;
        return {
          name: b.name as string,
          url: vslug ? `${BASE_URL}/${vslug}` : `${BASE_URL}/search?openBusiness=${b.id}`,
          city: (b.city as string) || "",
          neighborhood: (b.neighborhood as string) || "",
          subcat: (Array.isArray(b.categories) && b.categories[0]) || b.main_category || "",
          google: b.google_rating ? `${b.google_rating}/5 (${b.google_review_count})` : "—",
          guru: b.restaurant_guru_rating ? `${b.restaurant_guru_rating}/5 (${b.restaurant_guru_review_count})` : "—",
          tripadvisor: b.tripadvisor_rating ? `${b.tripadvisor_rating}/5 (${b.tripadvisor_review_count})` : "—",
          avg: avg.toFixed(2),
          avgNum: avg,
          total,
        };
      })
      .filter(Boolean) as Array<Record<string, any>>;

    scored.sort((a, b) => b.avgNum - a.avgNum || b.total - a.total);
    const rows: RankedRow[] = scored.slice(0, 500).map((r, i) => ({
      rank: i + 1,
      name: r.name,
      url: r.url,
      city: r.city,
      neighborhood: r.neighborhood,
      subcat: r.subcat,
      google: r.google,
      guru: r.guru,
      tripadvisor: r.tripadvisor,
      avg: r.avg,
      total: r.total,
    }));

    const ratedDir = join(PUBLIC_DIR, "blog", "etablissements-notes");
    mkdirSync(ratedDir, { recursive: true });
    writeFileSync(
      join(ratedDir, "index.html"),
      buildRatedRankingHtml(rows, scored.length, `${BASE_URL}/__l5e/assets-v1/74b197a6-8fb3-47b5-abac-9c3d7391adb5/rated-businesses-hero.webp`),
      "utf8",
    );
    console.log(`[og-pages] classement prérendu : ${rows.length} lignes / ${scored.length} établissements notés`);
  } catch (err) {
    console.error("[og-pages] échec prérendu /blog/etablissements-notes:", err);
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

  // 7b) Fetch reference tables for /ai feeds : cities, neighborhoods, pois, destinations
  const [citiesRes, nbhRes, poisRes, destsRes] = await Promise.all([
    supabase.from("cities").select("id, name_fr, name_en, region, latitude, longitude, wikipedia_fr, description_fr, image_url, is_active"),
    supabase.from("neighborhoods").select("id, city_id, name, name_en, latitude, longitude, hook, image_url"),
    supabase.from("points_of_interest").select("id, city_id, name_fr, name_en, latitude, longitude, wikipedia_fr, official_site_fr, image_url, hook, description"),
    supabase.from("destinations").select("id, name_fr, name_en, region, city_ids, latitude, longitude, wikipedia_fr, image_url, hook_fr, description_fr"),
  ]);

  // 8) Espace IA — flux machine-readable pour LLMs / agents (JSON, JSON-LD, OpenAPI)
  const aiWritten = writeAiFeed(
    businesses,
    vanities,
    eventRows || [],
    eventCityById,
    relationsByBiz,
    (citiesRes.data || []) as any[],
    (nbhRes.data || []) as any[],
    (poisRes.data || []) as any[],
    (destsRes.data || []) as any[],
  );

  console.log(`[og-pages] ${written} fichiers business générés (${skipped} ignorés) + ${articles.length} articles blog + ${hubsWritten} hubs + ${eventsWritten} events dans /events + ${aiWritten} fichiers dans /ai.`);
}

function writeAiFeed(
  businesses: Biz[],
  vanities: { slug: string; target_id: string }[],
  eventRows: Array<Record<string, any>>,
  cityById: Map<string, { name_fr: string; latitude?: number; longitude?: number }>,
  relationsByBiz: Map<string, BizRelations>,
  cityRows: Array<Record<string, any>>,
  neighborhoodRows: Array<Record<string, any>>,
  poiRows: Array<Record<string, any>>,
  destinationRows: Array<Record<string, any>>,
): number {
  const aiDir = join(PUBLIC_DIR, "ai");
  mkdirSync(aiDir, { recursive: true });
  writeFileSync(join(aiDir, MARKER_FILE), "", "utf8");

  const slugByBizId = new Map(vanities.map((v) => [v.target_id, v.slug]));

  // 8a) catalog.json — flux plat, champs essentiels
  const catalog = businesses
    .filter((b) => slugByBizId.has(b.id))
    .map((b) => {
      const slug = slugByBizId.get(b.id)!;
      return {
        id: b.id,
        slug,
        url: `${BASE_URL}/${slug}`,
        name: b.name,
        hook: b.hook_fr || null,
        description: b.description ? stripHtml(b.description).substring(0, 500) : null,
        main_category: b.main_category || null,
        categories: b.categories || [],
        services: b.services || [],
        city: b.city || null,
        neighborhood: b.neighborhood || null,
        region: b.region || null,
        country: "MA",
        latitude: b.latitude,
        longitude: b.longitude,
        address: b.address || null,
        phone: b.phone || null,
        whatsapp: b.whatsapp || null,
        website: b.website || null,
        image: b.images?.[0] || null,
        google_rating: b.google_rating,
        google_review_count: b.google_review_count,
        price_range: priceRangeFromBiz(b),
        min_price_mad: b.min_price,
        languages: b.languages || [],
        opening_hours: b.opening_hours || null,
        is_open_24h: !!b.is_open_24h,
        booking_url: b.booking_url || b.reserve_now_url || null,
        menu_url: b.menu_url || null,
        social: {
          instagram: b.instagram_url || null,
          facebook: b.facebook_url || null,
          tripadvisor: b.tripadvisor_url || null,
          youtube: b.youtube_url || null,
          linkedin: b.linkedin_url || null,
        },
      };
    });

  const catalogPayload = {
    "@meta": {
      source: SITE_NAME,
      url: `${BASE_URL}/ai/catalog.json`,
      generated_at: new Date().toISOString(),
      license: "Attribution requise · Contact : https://oneworldmorocco.com/contact",
      count: catalog.length,
    },
    businesses: catalog,
  };
  writeFileSync(join(aiDir, "catalog.json"), JSON.stringify(catalogPayload, null, 2), "utf8");

  // 8b) catalog.jsonld — même contenu en Schema.org ItemList
  const catalogJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Catalogue ${SITE_NAME}`,
    url: `${BASE_URL}/ai/catalog.jsonld`,
    numberOfItems: catalog.length,
    itemListElement: catalog.map((b, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: b.url,
      item: {
        "@type": "LocalBusiness",
        "@id": `${b.url}#business`,
        name: b.name,
        url: b.url,
        ...(b.image && { image: b.image }),
        ...(b.description && { description: b.description }),
        ...(b.address && {
          address: {
            "@type": "PostalAddress",
            streetAddress: b.address,
            ...(b.neighborhood && { addressLocality: b.neighborhood }),
            ...(b.city && { addressRegion: b.city }),
            addressCountry: "MA",
          },
        }),
        ...(b.latitude && b.longitude && {
          geo: { "@type": "GeoCoordinates", latitude: b.latitude, longitude: b.longitude },
        }),
        ...(b.phone && { telephone: b.phone }),
        ...(b.google_rating && {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: b.google_rating,
            reviewCount: b.google_review_count ?? 1,
            bestRating: 5,
          },
        }),
      },
    })),
  };
  writeFileSync(join(aiDir, "catalog.jsonld"), JSON.stringify(catalogJsonLd, null, 2), "utf8");

  // 8c) events.json — flux événements à venir/permanents
  const today = new Date().toISOString().slice(0, 10);
  const eventsFeed = eventRows
    .filter((e) => e.name && (!e.end_date || e.end_date >= today))
    .map((ev) => {
      const city = ev.city_id ? cityById.get(ev.city_id) : null;
      return {
        id: ev.id,
        name: ev.name,
        hook: ev.hook || null,
        description: ev.description ? stripHtml(ev.description).substring(0, 400) : null,
        start_date: ev.start_date || null,
        end_date: ev.end_date || null,
        start_time: ev.start_time || null,
        end_time: ev.end_time || null,
        recurrence: ev.recurrence || null,
        days_of_week: ev.days_of_week || [],
        type: ev.type || null,
        city: city?.name_fr || null,
        latitude: ev.latitude ?? city?.latitude ?? null,
        longitude: ev.longitude ?? city?.longitude ?? null,
        image: (ev.images && ev.images[0]) || ev.logo_url || null,
        url: ev.url || `${BASE_URL}/events`,
      };
    });
  writeFileSync(
    join(aiDir, "events.json"),
    JSON.stringify(
      {
        "@meta": {
          source: SITE_NAME,
          url: `${BASE_URL}/ai/events.json`,
          generated_at: new Date().toISOString(),
          count: eventsFeed.length,
        },
        events: eventsFeed,
      },
      null,
      2,
    ),
    "utf8",
  );

  // 8d) sitemap.xml — sitemap IA ciblé (uniquement fiches business)
  const urls = catalog
    .map(
      (b) => `  <url>
    <loc>${b.url}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`,
    )
    .join("\n");
  writeFileSync(
    join(aiDir, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`,
    "utf8",
  );

  // 8d-bis) cities.json / neighborhoods.json / pois.json — nomenclatures géo/POI
  const bizByCity = new Map<string, Array<{ slug: string; name: string }>>();
  const bizByNeighborhood = new Map<string, Array<{ slug: string; name: string }>>();
  const bizByPoi = new Map<string, Array<{ slug: string; name: string }>>();
  for (const b of businesses) {
    const slug = slugByBizId.get(b.id);
    if (!slug) continue;
    const entry = { slug, name: b.name };
    if (b.city) {
      const k = b.city.toLowerCase();
      const arr = bizByCity.get(k) || []; arr.push(entry); bizByCity.set(k, arr);
    }
    if (b.neighborhood) {
      const k = b.neighborhood.toLowerCase();
      const arr = bizByNeighborhood.get(k) || []; arr.push(entry); bizByNeighborhood.set(k, arr);
    }
    const rels = relationsByBiz.get(b.id);
    for (const p of rels?.pois || []) {
      const k = p.name.toLowerCase();
      const arr = bizByPoi.get(k) || []; arr.push(entry); bizByPoi.set(k, arr);
    }
  }

  const cityIdToNeighborhoods = new Map<string, Array<Record<string, any>>>();
  for (const n of neighborhoodRows) {
    if (!n.city_id) continue;
    const arr = cityIdToNeighborhoods.get(n.city_id) || [];
    arr.push(n); cityIdToNeighborhoods.set(n.city_id, arr);
  }

  const citiesFeed = cityRows
    .filter((c) => c.is_active !== false && c.name_fr)
    .map((c) => ({
      id: c.id,
      name: c.name_fr,
      name_en: c.name_en || null,
      region: c.region || null,
      country: "MA",
      latitude: c.latitude,
      longitude: c.longitude,
      image: c.image_url || null,
      wikipedia: c.wikipedia_fr || null,
      description: c.description_fr ? stripHtml(c.description_fr).substring(0, 400) : null,
      url: `${BASE_URL}/destination/${(c.name_fr || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`,
      neighborhoods: (cityIdToNeighborhoods.get(c.id) || []).map((n) => n.name).filter(Boolean),
      businesses_count: bizByCity.get((c.name_fr || "").toLowerCase())?.length || 0,
    }));
  writeFileSync(join(aiDir, "cities.json"), JSON.stringify({
    "@meta": { source: SITE_NAME, url: `${BASE_URL}/ai/cities.json`, generated_at: new Date().toISOString(), count: citiesFeed.length },
    cities: citiesFeed,
  }, null, 2), "utf8");

  const cityNameById = new Map(cityRows.map((c) => [c.id, c.name_fr]));
  const neighborhoodsFeed = neighborhoodRows
    .filter((n) => n.name)
    .map((n) => ({
      id: n.id,
      name: n.name,
      name_en: n.name_en || null,
      city: n.city_id ? cityNameById.get(n.city_id) || null : null,
      latitude: n.latitude,
      longitude: n.longitude,
      image: n.image_url || null,
      hook: n.hook || null,
      businesses: (bizByNeighborhood.get((n.name || "").toLowerCase()) || []).slice(0, 30).map((b) => ({ name: b.name, url: `${BASE_URL}/${b.slug}` })),
    }));
  writeFileSync(join(aiDir, "neighborhoods.json"), JSON.stringify({
    "@meta": { source: SITE_NAME, url: `${BASE_URL}/ai/neighborhoods.json`, generated_at: new Date().toISOString(), count: neighborhoodsFeed.length },
    neighborhoods: neighborhoodsFeed,
  }, null, 2), "utf8");

  const poisFeed = poiRows
    .filter((p) => p.name_fr)
    .map((p) => ({
      id: p.id,
      name: p.name_fr,
      name_en: p.name_en || null,
      city: p.city_id ? cityNameById.get(p.city_id) || null : null,
      latitude: p.latitude,
      longitude: p.longitude,
      image: p.image_url || null,
      wikipedia: p.wikipedia_fr || null,
      official_site: p.official_site_fr || null,
      hook: p.hook || null,
      description: p.description ? stripHtml(p.description).substring(0, 400) : null,
      nearby_businesses: (bizByPoi.get((p.name_fr || "").toLowerCase()) || []).slice(0, 30).map((b) => ({ name: b.name, url: `${BASE_URL}/${b.slug}` })),
    }));
  writeFileSync(join(aiDir, "pois.json"), JSON.stringify({
    "@meta": { source: SITE_NAME, url: `${BASE_URL}/ai/pois.json`, generated_at: new Date().toISOString(), count: poisFeed.length },
    points_of_interest: poisFeed,
  }, null, 2), "utf8");

  const destinationsFeed = destinationRows
    .filter((d) => d.name_fr)
    .map((d) => ({
      id: d.id,
      name: d.name_fr,
      name_en: d.name_en || null,
      region: d.region || null,
      latitude: d.latitude,
      longitude: d.longitude,
      image: d.image_url || null,
      wikipedia: d.wikipedia_fr || null,
      hook: d.hook_fr || null,
      description: d.description_fr ? stripHtml(d.description_fr).substring(0, 400) : null,
      cities: (d.city_ids || []).map((cid: string) => cityNameById.get(cid)).filter(Boolean),
    }));
  writeFileSync(join(aiDir, "destinations.json"), JSON.stringify({
    "@meta": { source: SITE_NAME, url: `${BASE_URL}/ai/destinations.json`, generated_at: new Date().toISOString(), count: destinationsFeed.length },
    destinations: destinationsFeed,
  }, null, 2), "utf8");

  // 8d-ter) graph.jsonld — graphe complet Schema.org (entités + arêtes)
  const graphNodes: unknown[] = [];
  // Cities
  for (const c of citiesFeed) {
    graphNodes.push({
      "@type": "City",
      "@id": `${BASE_URL}/ai/city/${c.id}`,
      name: c.name,
      ...(c.latitude && c.longitude && { geo: { "@type": "GeoCoordinates", latitude: c.latitude, longitude: c.longitude } }),
      ...(c.wikipedia && { sameAs: [c.wikipedia] }),
      containedInPlace: { "@type": "Country", name: "Maroc", identifier: "MA" },
    });
  }
  // Neighborhoods
  const nbhIdByKey = new Map<string, string>();
  for (const n of neighborhoodRows) {
    if (!n.name) continue;
    const id = `${BASE_URL}/ai/neighborhood/${n.id}`;
    nbhIdByKey.set((n.name || "").toLowerCase(), id);
    graphNodes.push({
      "@type": "Place",
      "@id": id,
      name: n.name,
      ...(n.latitude && n.longitude && { geo: { "@type": "GeoCoordinates", latitude: n.latitude, longitude: n.longitude } }),
      ...(n.city_id && cityNameById.get(n.city_id) && {
        containedInPlace: { "@type": "City", name: cityNameById.get(n.city_id) },
      }),
    });
  }
  // POIs
  const poiIdByKey = new Map<string, string>();
  for (const p of poiRows) {
    if (!p.name_fr) continue;
    const id = `${BASE_URL}/ai/poi/${p.id}`;
    poiIdByKey.set((p.name_fr || "").toLowerCase(), id);
    graphNodes.push({
      "@type": "TouristAttraction",
      "@id": id,
      name: p.name_fr,
      ...(p.latitude && p.longitude && { geo: { "@type": "GeoCoordinates", latitude: p.latitude, longitude: p.longitude } }),
      ...(p.wikipedia_fr && { sameAs: [p.wikipedia_fr] }),
      ...(p.image_url && { image: p.image_url }),
      ...(p.city_id && cityNameById.get(p.city_id) && {
        containedInPlace: { "@type": "City", name: cityNameById.get(p.city_id) },
      }),
    });
  }
  // Destinations
  for (const d of destinationsFeed) {
    graphNodes.push({
      "@type": "TouristDestination",
      "@id": `${BASE_URL}/ai/destination/${d.id}`,
      name: d.name,
      ...(d.latitude && d.longitude && { geo: { "@type": "GeoCoordinates", latitude: d.latitude, longitude: d.longitude } }),
      ...(d.wikipedia && { sameAs: [d.wikipedia] }),
      ...(d.image && { image: d.image }),
    });
  }
  // Businesses avec leurs arêtes
  for (const b of catalog) {
    const rels = relationsByBiz.get(b.id) || {};
    const nearby: Array<Record<string, unknown>> = [];
    for (const p of rels.pois || []) {
      const id = poiIdByKey.get((p.name || "").toLowerCase());
      nearby.push(id ? { "@id": id } : { "@type": "TouristAttraction", name: p.name });
    }
    const evts = (rels.events || []).map((e) => ({
      "@type": "Event",
      name: e.name,
      ...(e.start_date && { startDate: e.start_date }),
      ...(e.end_date && { endDate: e.end_date }),
      ...(e.url && { url: e.url }),
    }));
    const bizNode: Record<string, unknown> = {
      "@type": "LocalBusiness",
      "@id": `${b.url}#business`,
      name: b.name,
      url: b.url,
      ...(b.image && { image: b.image }),
      ...(b.latitude && b.longitude && { geo: { "@type": "GeoCoordinates", latitude: b.latitude, longitude: b.longitude } }),
      ...(b.city && { containedInPlace: { "@type": "City", name: b.city } }),
      ...(nearby.length && { nearbyAttraction: nearby.slice(0, 10) }),
      ...(evts.length && { event: evts.slice(0, 10) }),
    };
    graphNodes.push(bizNode);
  }

  const graphJsonLd = {
    "@context": "https://schema.org",
    "@graph": graphNodes,
  };
  writeFileSync(join(aiDir, "graph.jsonld"), JSON.stringify(graphJsonLd), "utf8");

  // 8e) openapi.json — spec OpenAPI 3.1 minimale des endpoints lisibles
  const openapi = {
    openapi: "3.1.0",
    info: {
      title: `${SITE_NAME} — AI Data Feed`,
      version: "1.0.0",
      description: "Flux lecture seule pour LLM et agents IA : catalogue d'établissements et événements au Maroc.",
      contact: { name: SITE_NAME, url: `${BASE_URL}/contact` },
      license: { name: "Attribution requise", url: `${BASE_URL}/mission` },
    },
    servers: [{ url: BASE_URL }],
    paths: {
      "/ai/catalog.json": {
        get: {
          summary: "Catalogue complet des établissements (JSON à plat)",
          responses: { "200": { description: "OK", content: { "application/json": {} } } },
        },
      },
      "/ai/catalog.jsonld": {
        get: {
          summary: "Catalogue complet en JSON-LD (Schema.org ItemList)",
          responses: { "200": { description: "OK", content: { "application/ld+json": {} } } },
        },
      },
      "/ai/events.json": {
        get: {
          summary: "Événements à venir (JSON)",
          responses: { "200": { description: "OK", content: { "application/json": {} } } },
        },
      },
      "/ai/cities.json": {
        get: { summary: "Villes avec quartiers + compteur d'établissements", responses: { "200": { description: "OK", content: { "application/json": {} } } } },
      },
      "/ai/neighborhoods.json": {
        get: { summary: "Quartiers avec liste d'établissements", responses: { "200": { description: "OK", content: { "application/json": {} } } } },
      },
      "/ai/pois.json": {
        get: { summary: "Points d'intérêt avec établissements à proximité", responses: { "200": { description: "OK", content: { "application/json": {} } } } },
      },
      "/ai/destinations.json": {
        get: { summary: "Destinations touristiques (régions/villes agrégées)", responses: { "200": { description: "OK", content: { "application/json": {} } } } },
      },
      "/ai/graph.jsonld": {
        get: { summary: "Graphe Schema.org complet (villes, quartiers, POIs, destinations, établissements + arêtes)", responses: { "200": { description: "OK", content: { "application/ld+json": {} } } } },
      },
      "/ai/sitemap.xml": {
        get: {
          summary: "Sitemap XML dédié aux fiches établissement",
          responses: { "200": { description: "OK", content: { "application/xml": {} } } },
        },
      },
    },
    "x-mcp-server": {
      transport: "streamable-http",
      url: "https://plnphgdrawpsnumnejzc.supabase.co/functions/v1/mcp",
      description: "Serveur MCP public (lecture seule) exposant le catalogue.",
    },
  };
  writeFileSync(join(aiDir, "openapi.json"), JSON.stringify(openapi, null, 2), "utf8");

  // 8f) index.html — page humaine décrivant les flux
  const indexHtml = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Espace IA & agents | ${SITE_NAME}</title>
    <meta name="description" content="Flux machine-readable de ${SITE_NAME} pour LLMs, agents IA et moteurs de recherche : catalogue JSON, JSON-LD, OpenAPI, sitemap dédié, serveur MCP." />
    <link rel="canonical" href="${BASE_URL}/ai/" />
    <meta property="og:title" content="Espace IA & agents | ${SITE_NAME}" />
    <meta property="og:description" content="Catalogue JSON, JSON-LD, OpenAPI, sitemap dédié, serveur MCP." />
    <meta property="og:url" content="${BASE_URL}/ai/" />
    <style>
      body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; max-width: 780px; margin: 2rem auto; padding: 0 1.5rem; color: #1a1a1a; background: #faf8f5; line-height: 1.55; }
      h1 { font-size: 1.8rem; margin-bottom: .3rem; }
      h2 { margin-top: 2rem; font-size: 1.15rem; border-bottom: 1px solid #e5ddd0; padding-bottom: .3rem; }
      code { background: #f0e9de; padding: 1px 5px; border-radius: 4px; font-size: .92em; }
      a { color: #C04F17; }
      ul { padding-left: 1.2rem; }
      li { margin: .35rem 0; }
      .meta { color: #6b6b6b; font-size: .9rem; }
    </style>
  </head>
  <body>
    <h1>Espace IA & agents</h1>
    <p class="meta">Flux lecture seule pour LLMs, agents IA et moteurs. Généré au build depuis la base ${SITE_NAME}.</p>

    <h2>Flux disponibles</h2>
    <ul>
      <li><a href="/ai/catalog.json">/ai/catalog.json</a> — Catalogue complet (${catalog.length} établissements) en JSON à plat</li>
      <li><a href="/ai/catalog.jsonld">/ai/catalog.jsonld</a> — Même catalogue en Schema.org <code>ItemList</code> / <code>LocalBusiness</code></li>
      <li><a href="/ai/graph.jsonld">/ai/graph.jsonld</a> — Graphe Schema.org complet : villes, quartiers, POIs, destinations, établissements + arêtes (<code>containedInPlace</code>, <code>nearbyAttraction</code>, <code>event</code>)</li>
      <li><a href="/ai/cities.json">/ai/cities.json</a> — Villes (${citiesFeed.length}) avec quartiers</li>
      <li><a href="/ai/neighborhoods.json">/ai/neighborhoods.json</a> — Quartiers (${neighborhoodsFeed.length}) avec établissements</li>
      <li><a href="/ai/pois.json">/ai/pois.json</a> — Points d'intérêt (${poisFeed.length}) avec établissements à proximité</li>
      <li><a href="/ai/destinations.json">/ai/destinations.json</a> — Destinations touristiques (${destinationsFeed.length})</li>
      <li><a href="/ai/events.json">/ai/events.json</a> — Événements à venir (${eventsFeed.length})</li>
      <li><a href="/ai/sitemap.xml">/ai/sitemap.xml</a> — Sitemap ciblé fiches établissement</li>
      <li><a href="/ai/openapi.json">/ai/openapi.json</a> — Spec OpenAPI 3.1</li>
      <li><a href="/llms.txt">/llms.txt</a> — Index racine style llmstxt.org</li>
    </ul>

    <h2>Serveur MCP</h2>
    <p>Un serveur <a href="https://modelcontextprotocol.io">Model Context Protocol</a> public (lecture seule) expose la recherche et la fiche business :</p>
    <p><code>https://plnphgdrawpsnumnejzc.supabase.co/functions/v1/mcp</code></p>

    <h2>Licence & usage</h2>
    <p>Réutilisation autorisée avec <strong>attribution</strong> (${SITE_NAME} + lien vers la fiche source). Pour un usage commercial ou une reprise en volume, <a href="${BASE_URL}/contact">contactez-nous</a>.</p>
  </body>
</html>`;
  writeFileSync(join(aiDir, "index.html"), indexHtml, "utf8");

  return 11;
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

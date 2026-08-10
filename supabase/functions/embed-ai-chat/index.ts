// Public embed AI concierge scoped to a single affiliate business.
// - Anonymous (no auth). Designed to be iframed on the business's own site.
// - Streams via the Vercel AI SDK UIMessageStream protocol (useChat-compatible).
// - Markers (SHOW_ON_MAP, EVENTS_SNAPSHOT, KNOWN_BUSINESSES) are still appended
//   as trailing text so the front can render maps / carousels / events panels
//   with the same components as before.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  convertToModelMessages,
  type UIMessage,
} from "npm:ai@5";
import { createLovableAiGatewayProvider, normalizeGatewayBodyForModel } from "../_shared/ai-gateway.ts";
import { AI_MODEL, getSurfaceConfig } from "../_shared/ai-engine/surfaces.ts";
import { classify, isConfident } from "../_shared/ai-engine/classify.ts";
import { detectViewIntent } from "../_shared/ai-engine/view-targets.ts";

import {
  pickLang, fmtHours, normalize, levenshtein, DAY_KEYS, DAY_LABELS,
  fetchPriorFull, orderByIds, fmtKm, toMapMarker, haversineKmLocal,
} from "../_shared/ai-engine/routes/shared.ts";
import {
  isHoursIntent, buildHoursAnswer, buildHoursForBusinesses, isOpensFirstIntent,
  isClosesLastIntent, buildHoursRanking, parseOpenFilterIntent, buildOpenFilter,
  type OpenFilterIntent,
} from "../_shared/ai-engine/routes/opening.ts";
import { isBookingIntent, isReserveCta, buildBookingAnswer, buildBookingForBusinesses } from "../_shared/ai-engine/routes/booking.ts";
import { isWeatherIntent } from "../_shared/ai-engine/routes/weather.ts";
import {
  isDistanceRankingIntent, isDistanceListIntent, isRatingRankingIntent, parseOrdinalIntent,
  isCountIntent, extractPriorOrderedBusinesses, buildDistanceRanking, buildDistanceList,
  buildRatingRanking, buildOrdinalPick, buildCountAnswer,
} from "../_shared/ai-engine/routes/ranking.ts";
import { buildEventsWeekendAnswer } from "../_shared/ai-engine/routes/events.ts";
import {
  isNearbyOverviewIntent, isProximityIntent, isSuggestionRefinement, parseInlineRadiusKm,
  fetchEntityPoolFromCurated, buildTwoEntityProximityCurated, buildNearbyOverview, buildPoiNearby,
  buildDisclosureFromCounts, stripText, type TwoEntityIntent,
} from "../_shared/ai-engine/routes/nearby.ts";
import { isDescribeIntent, parseDescribeFacet, buildDescribePriors } from "../_shared/ai-engine/routes/describe.ts";
import {
  stripEngPrefix, matchEngagementsFromPriors, isCityEngagementSearchIntent,
  extractEngagementQueryTerm, resolveCityEngagementTerm, buildCityEngagementSearch,
} from "../_shared/ai-engine/routes/engagement.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Moteur A/B/C (docs/ai/spec-moteur-abc.md §4) — route canonique inférée depuis
// les détecteurs déterministes déjà utilisés par le routage. Instrumentation
// uniquement : aucun impact sur le routage lui-même.
// ─────────────────────────────────────────────────────────────────────────────
function inferEmbedRoute(text: string): string {
  const t = String(text || "");
  if (!t.trim()) return "smalltalk";
  if (isWeatherIntent(t)) return "weather";
  if (isBookingIntent(t)) return "booking";
  if (isHoursIntent(t) || isOpensFirstIntent(t) || isClosesLastIntent(t)) return "opening";
  if (isNearbyOverviewIntent(t) || isProximityIntent(t)) return "nearby";
  if (isDescribeIntent(t)) return "business_qa";
  if (isCityEngagementSearchIntent(t)) return "discover";
  if (isDistanceRankingIntent(t) || isDistanceListIntent(t) || isRatingRankingIntent(t) || isCountIntent(t)) return "discover";
  return "discover";
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = AI_MODEL;
const IS_GPT5 = /^openai\/gpt-5/.test(MODEL);
const MAX_ROUNDS = 4;
const SEARCH_LIMIT_HARD = 30;

type Msg = { role: "system" | "user" | "assistant" | "tool"; content: string; tool_call_id?: string; tool_calls?: any[] };

// ============= Blog grounding (hybrid) =============
// Cache published blog posts in module scope for 5 minutes to avoid a DB round-trip per turn.
type BlogRow = {
  id: string; slug: string;
  title_fr: string | null; title_en: string | null; title_ar: string | null;
  custom_hero_image_url: string | null; cover_image_url: string | null;
  anchor_business_id: string | null;
};
let BLOG_CACHE: { at: number; items: BlogRow[] } | null = null;
async function fetchBlogPostsCached(admin: any): Promise<BlogRow[]> {
  const now = Date.now();
  if (BLOG_CACHE && now - BLOG_CACHE.at < 5 * 60 * 1000) return BLOG_CACHE.items;
  const { data } = await admin
    .from("blog_posts")
    .select("id, slug, title_fr, title_en, title_ar, custom_hero_image_url, cover_image_url, anchor_business_id")
    .eq("is_published", true)
    .limit(300);
  BLOG_CACHE = { at: now, items: (data as BlogRow[]) || [] };
  return BLOG_CACHE.items;
}

const BLOG_STOPWORDS = new Set<string>([
  "le","la","les","un","une","des","de","du","au","aux","en","sur","dans","ou","et","pour","avec",
  "a","à","d","l","s","c","que","qui","quoi","où","ou","est","sont","ce","ces","cet","cette","mon","ma","mes",
  "the","a","an","of","to","in","on","at","and","or","for","with","near","close","by",
  "plus","proche","proches","autour",
  "je","tu","il","elle","on","nous","vous","ils","elles","me","te","se","moi","toi",
  "veux","voudrais","cherche","chercher","trouver","montre","montrer","voir",
  "quoi","comment","quel","quelle","quels","quelles","what","which","how",
  // City / region names — trop génériques pour porter le signal éditorial
  "marrakech","marrakesh","essaouira","casablanca","rabat","tanger","tangier",
  "fes","fez","agadir","chefchaouen","ouarzazate","meknes","meknès","oujda",
  "morocco","maroc","maghreb",
]);
function tokenizeForBlog(s: string): string[] {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !BLOG_STOPWORDS.has(t));
}
function matchBlogArticle(userText: string, lang: "fr" | "en" | "ar", posts: BlogRow[], hostId: string, hostName?: string | null): BlogRow | null {
  // Strip host business name tokens from BOTH sides so that follow-ups mentioning
  // "{businessName}" don't auto-match owner articles that contain the same name
  // in their title (e.g. "…proches de Riad Dar Najat"). The match must rely on
  // editorial/topical overlap only.
  const hostTokens = new Set(tokenizeForBlog(hostName || ""));
  const stripHost = (tokens: string[]) => tokens.filter((t) => !hostTokens.has(t));
  const qTokens = new Set(stripHost(tokenizeForBlog(userText)));
  if (qTokens.size < 2) return null;
  let best: { row: BlogRow; score: number; overlap: number; owner: boolean } | null = null;
  for (const p of posts) {
    const titles = [p.title_fr, p.title_en, p.title_ar].filter(Boolean) as string[];
    if (!titles.length) continue;
    let bestForRow = 0, bestOverlap = 0;
    for (const t of titles) {
      const tTokens = new Set(stripHost(tokenizeForBlog(t)));
      if (tTokens.size < 2) continue;
      let overlap = 0;
      for (const w of qTokens) if (tTokens.has(w)) overlap++;
      if (overlap < 2) continue;
      const score = overlap / Math.min(qTokens.size, tTokens.size);
      if (score > bestForRow) { bestForRow = score; bestOverlap = overlap; }
    }
    if (bestForRow < 0.5) continue;
    const owner = p.anchor_business_id === hostId;
    const boost = owner ? 0.15 : 0;
    const finalScore = bestForRow + boost;
    if (!best || finalScore > best.score) best = { row: p, score: finalScore, overlap: bestOverlap, owner };
  }
  return best ? best.row : null;
}




// Damerau-Levenshtein-lite (Levenshtein). Used for neighborhood typo tolerance.

// Try to spot a neighborhood name in free text, tolerant to typos and aliases.
// Aliases come from neighborhoods.{name,name_en,name_ar,keywords,keywords_en,keywords_ar}.
// Returns the canonical neighborhood.name (as stored on businesses.neighborhood) or null.
async function detectNeighborhoodInText(
  admin: any,
  cityName: string | null | undefined,
  text: string,
): Promise<{ name: string; matchedAlias: string } | null> {
  const nq = normalize(text);
  if (!nq) return null;
  const words = nq.split(/[^\p{L}\p{N}]+/u).filter((w) => w && w.length >= 3);
  if (!words.length) return null;

  try {
    // Look up city id first (case-insensitive).
    let cityId: string | null = null;
    if (cityName) {
      const { data: cityRow } = await admin
        .from("cities")
        .select("id")
        .ilike("name_fr", cityName)
        .maybeSingle();
      cityId = cityRow?.id ?? null;
    }
    let q = admin
      .from("neighborhoods")
      .select("name, name_en, name_ar, keywords, keywords_en, keywords_ar, city_id");
    if (cityId) q = q.eq("city_id", cityId);
    const { data: hoods } = await q;
    const rows: any[] = Array.isArray(hoods) ? hoods : [];
    if (!rows.length) return null;

    type Cand = { canonical: string; alias: string; aliasN: string };
    const cands: Cand[] = [];
    for (const h of rows) {
      const canonical = String(h.name || "");
      if (!canonical) continue;
      const push = (a: any) => {
        const s = String(a || "").trim();
        if (!s) return;
        const n = normalize(s);
        if (n.length < 3) return;
        cands.push({ canonical, alias: s, aliasN: n });
      };
      push(h.name);
      push(h.name_en);
      push(h.name_ar);
      for (const k of Array.isArray(h.keywords) ? h.keywords : []) push(k);
      for (const k of Array.isArray(h.keywords_en) ? h.keywords_en : []) push(k);
      for (const k of Array.isArray(h.keywords_ar) ? h.keywords_ar : []) push(k);
    }
    if (!cands.length) return null;

    // 1) Exact substring on normalized text (multi-word aliases win first).
    cands.sort((a, b) => b.aliasN.length - a.aliasN.length);
    for (const c of cands) {
      if (c.aliasN.length < 4) continue;
      const re = new RegExp(`(^|[^\\p{L}\\p{N}])${c.aliasN.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}([^\\p{L}\\p{N}]|$)`, "u");
      if (re.test(nq)) return { name: c.canonical, matchedAlias: c.alias };
    }
    // 2) Fuzzy per-word (Levenshtein ≤ 1 for len 4-6, ≤ 2 for len ≥ 7).
    for (const w of words) {
      for (const c of cands) {
        if (c.aliasN.includes(" ")) continue; // fuzzy only on single-word aliases
        const L = c.aliasN.length;
        if (L < 4) continue;
        const maxD = L >= 7 ? 2 : 1;
        if (Math.abs(L - w.length) > maxD) continue;
        if (levenshtein(w, c.aliasN) <= maxD) {
          return { name: c.canonical, matchedAlias: c.alias };
        }
      }
    }
    return null;
  } catch (e) {
    console.error("[embed-ai-chat] detectNeighborhoodInText_error", e);
    return null;
  }
}

function shouldForceDirectorySearch(text: string): boolean {
  const q = normalize(text);
  if (!q) return false;
  return /\b(que faire|proximite|autour|pres de|ou |où |restaurant|dejeuner|diner|manger|boire|bar|cafe|the|rooftop|terrasse|visiter|activite|sortie|agenda|week[- ]?end|nearby|around|where|eat|drink|visit|activity|event)\b/i.test(q);
}






/**
 * Parse prior assistant messages for the `<!--KNOWN_BUSINESSES:[...]-->` marker
 * and return the ids of previously-shown businesses (most recent turn first,
 * host excluded, deduped).
 */
function textForEmbedMarkers(input: any): string {
  const chunks: string[] = [];
  const walk = (value: any, depth = 0) => {
    if (value == null || depth > 5) return;
    if (typeof value === "string") {
      chunks.push(value);
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) walk(item, depth + 1);
      return;
    }
    if (typeof value === "object") {
      for (const key of ["content", "text", "delta", "parts"]) {
        if (key in value) walk(value[key], depth + 1);
      }
    }
  };
  walk(input);
  return chunks.join("\n");
}

function parseEmbedJsonMarker(raw: string): any | null {
  const candidates = [
    raw,
    raw.replace(/&quot;/g, '"').replace(/--&gt;/g, "-->"),
    raw.replace(/\\"/g, '"').replace(/\\n/g, "\n"),
  ];
  for (const candidate of candidates) {
    try { return JSON.parse(candidate); } catch { /* try next */ }
  }
  return null;
}

function extractPriorKnownBusinessIds(messages: any[], hostId: string): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "assistant") continue;
    const content = textForEmbedMarkers(m) || String(m.content ?? "");
    // Prefer KNOWN_BUSINESSES, fall back to SHOW_ON_MAP (deterministic routes like
    // poi_nearby emit only SHOW_ON_MAP but still represent the latest result set).
    let arr: any = null;
    const knownMatch = content.match(/<!--KNOWN_BUSINESSES:(\[[\s\S]*?\])-->/);
    if (knownMatch) {
      arr = parseEmbedJsonMarker(knownMatch[1]);
    }
    if (!arr) {
      const mapMatch = content.match(/<!--SHOW_ON_MAP:(\{[\s\S]*?\})-->/);
      if (mapMatch) {
        const parsed = parseEmbedJsonMarker(mapMatch[1]);
        if (parsed && Array.isArray(parsed.businesses)) arr = parsed.businesses;
      }
    }
    if (Array.isArray(arr)) {
      for (const b of arr) {
        const id = b?.id;
        if (typeof id === "string" && id && id !== hostId && !seen.has(id)) {
          seen.add(id);
          ids.push(id);
        }
      }
      if (ids.length) break; // stop at the most recent turn that had results
    }
  }
  return ids;
}

/**
 * Build a multi-business hours summary for the previous search results.
 * Only lists businesses that have `show_opening_hours = true`.
 * For each, shows today's slot (Morocco time) + a compact weekly line.
 */


/**
 * Rank previous results by earliest opening time or latest closing time today (Morocco).
 * Uses opening_hours (both slots) and is_open_24h. Excludes businesses whose hours
 * are hidden (show_opening_hours != true) or closed today / on vacation.
 */

// ============================================================
// Deterministic ranking / filter / pick on prior results
// ============================================================


















/**
 * Build a multi-business booking summary for the previous search results.
 * Scans reserve_now_url + online_shop_url + url_4 + url_5 with a Reserve/Book CTA.
 * Businesses without an online booking URL fall back to phone/WhatsApp.
 */





// Detect any "à proximité / autour de / near / around / قرب" phrasing,
// independent of the nearby-overview route (which requires no other filter).

// A free-text message keeps the previous suggestion's deterministic context
// (badges / subcategories / pinned ids) only when it looks like a refinement
// of the same thread — proximity phrase, explicit radius, or a very short
// modifier ("à Marrakech", "moins cher", "500 m"). A longer free-text message
// without those signals is treated as a NEW topic and the suggestion force is
// dropped so we don't hijack the search with the previous badges.

// Parse an explicit radius the user typed inline (FR/EN/AR).
// Recognizes forms like "500 m", "500m", "à moins de 500 m", "0.5 km", "2 km",
// "within 500 m", "within 2 km", "أقل من 500 م", "ضمن 2 كم".
// Returns kilometres, or null if not found.


// ─────────────────────────────────────────────────────────────────────────────
// TWO-ENTITY PROXIMITY (curated only): "A à côté d'un B" where A and B are
// resolved from staff-picked subcategories/badges on the active suggestion.
// No free-text fallback — free "A à côté d'un B" queries fall through to the
// LLM via search_businesses.
// ─────────────────────────────────────────────────────────────────────────────





// Curated variant: uses staff-picked subcatIds/badgeIds for A and B directly,
// skipping resolveEntityTerm. Any match on subcategory OR badge is trusted.










function buildContextualIntro(userMessage: string, host: any, city: string, lang: "fr" | "en" | "ar", proximityActive: boolean, radiusUsed: number | null): string {
  const q = normalize(userMessage);
  const hostName = host?.name || "";
  const radiusLabel = radiusUsed ? (radiusUsed < 1 ? `${Math.round(radiusUsed * 1000)} m` : `${radiusUsed.toFixed(1).replace(/\.0$/, "")} km`) : "";
  const proximity = proximityActive && radiusLabel && hostName ? ` à moins de ${radiusLabel} de **${hostName}**` : "";

  const hasDelivery = /livraison|glovo|livrer|expedition|expédition|expedier|expédier|envoi|envoyer|internationale|ship|shipping/.test(q);
  const hasShop = /magasin|boutique|shopping|souk|tapis|artisan|atelier|cuir|art de table|souvenir|boutiques/.test(q);
  const hasRooftop = /rooftop|terrasse|toit|toit-terrasse|vue|panorama|rooftops/.test(q);
  const hasBar = /bar|cocktail|boire|aperitif|apéritif|apero|apéro|soiree|soirée|afterwork|nightlife|verre/.test(q);
  const hasRestaurant = /restaurant|manger|dejeuner|déjeuner|diner|dîner|table|cuisine|repas|brunch/.test(q);
  const hasPool = /piscine|beach|plage|beach-club|beach club|bain|baigner|nager/.test(q);
  const hasGolf = /golf|parcours|green|swing/.test(q);
  const hasArt = /art|galerie|exposition|museum|musée|culture|artistique/.test(q);
  const hasTea = /the|thé|menthe|salon de the|salon de thé|patisserie|pâtisserie|goûter|gouter/.test(q);
  const hasPizza = /pizza|italien|pizzeria|trattoria/.test(q);
  const hasHotel = /hotel|hôtel|riad|villa|hebergement|hébergement|dormir|loger/.test(q);
  const hasNight = /night|club|boite|boîte|nocturne|afterwork|after-work|dj/.test(q);
  const hasSpa = /spa|massage|hammam|bien-etre|bien-être|soin|soins|detente|détente/.test(q);
  const hasCoffee = /cafe|café|coffee|work|cowork|wifi/.test(q);
  const hasVegan = /vegan|vegetarien|végétarien|vegetalien|végétalien|sans viande/.test(q);
  const hasKids = /famille|enfant|kids|familial|enfants|bebe|bébé/.test(q);
  const hasPet = /chien|animal|pet|chiens|animaux/.test(q);

  const topic = hasDelivery && hasShop ? "delivery_shop"
    : hasDelivery ? "delivery"
    : hasShop ? "shop"
    : hasRooftop ? "rooftop"
    : hasBar && !hasRestaurant ? "bar"
    : hasRestaurant && hasPizza ? "pizza"
    : hasRestaurant ? "restaurant"
    : hasPool ? "pool"
    : hasGolf ? "golf"
    : hasArt ? "art"
    : hasTea ? "tea"
    : hasHotel ? "hotel"
    : hasNight ? "night"
    : hasSpa ? "spa"
    : hasCoffee ? "coffee"
    : hasVegan ? "vegan"
    : hasKids ? "kids"
    : hasPet ? "pet"
    : "default";

  const templatesFr: Record<string, string> = {
    delivery_shop: `À **${city}**, pour les achats avec livraison internationale, voici les adresses qui gèrent l’expédition — pratique quand on repart avec un souvenir un peu lourd ou une commande précise.${proximity ? ` Je me suis concentré sur les boutiques à moins de ${radiusLabel} de **${hostName}**.` : ""}`,
    delivery: `Voici les adresses à **${city}** qui proposent une livraison — pour recevoir chez toi ou expédier jusqu’à destination.${proximity ? ` J’ai privilégié celles à moins de ${radiusLabel} de **${hostName}**.` : ""}`,
    shop: `Pour le shopping à **${city}**, voici les boutiques, ateliers et souks retenus dans le guide One World Morocco.${proximity ? ` Je me concentre sur ceux à moins de ${radiusLabel} de **${hostName}**.` : ""}`,
    rooftop: `À **${city}**, les rooftops et terrasses en hauteur sont une pause à part : vue sur la médina, coucher de soleil ou soirée. Voici ceux qui ressortent dans le guide One World Morocco.${proximity ? ` Tous sont à moins de ${radiusLabel} de **${hostName}**.` : ""}`,
    bar: `Pour boire un verre à **${city}**, entre cocktail soigné et adresse locale, voici les bars à mettre en premier.${proximity ? ` J’ai privilégié ceux à moins de ${radiusLabel} de **${hostName}**.` : ""}`,
    pizza: `Pour une pizza à **${city}**, voici les adresses qui cuisinent l’Italie au coin de la rue — pizzerias, trattorias et tables italiennes retenues dans le guide.${proximity ? ` Je me suis concentré sur celles à moins de ${radiusLabel} de **${hostName}**.` : ""}`,
    restaurant: `Pour manger à **${city}**, voici les tables qui ressortent dans le guide One World Morocco — sélectionnées pour leur ambiance et leur qualité.${proximity ? ` Toutes sont à moins de ${radiusLabel} de **${hostName}**.` : ""}`,
    pool: `Pour se rafraîchir à **${city}**, entre piscine de ville et beach-club, voici les adresses qui proposent un vrai moment de détente.${proximity ? ` J’ai privilégié celles à moins de ${radiusLabel} de **${hostName}**.` : ""}`,
    golf: `Pour jouer à **${city}**, voici les parcours et golfs les plus proches — greens, fairways et infrastructures retenues dans le guide.${proximity ? ` Tous sont à moins de ${radiusLabel} de **${hostName}**.` : ""}`,
    art: `Pour de l’art et des galeries à **${city}**, voici les lieux où la culture se visite — expositions, œuvres locales et adresses curatoriales.${proximity ? ` Je me concentre sur ceux à moins de ${radiusLabel} de **${hostName}**.` : ""}`,
    tea: `Pour un thé à la menthe à **${city}**, voici les adresses qui en font un vrai rituel — riads, salons de thé et terrasses au cœur de l’ambiance locale.${proximity ? ` Tous sont à moins de ${radiusLabel} de **${hostName}**.` : ""}`,
    hotel: `Pour dormir à **${city}**, voici les hébergements retenus dans le guide One World Morocco — riads, hôtels et villas avec du caractère.${proximity ? ` Je me suis concentré sur ceux à moins de ${radiusLabel} de **${hostName}**.` : ""}`,
    night: `Pour sortir le soir à **${city}**, voici les adresses nocturnes qui comptent — bars, clubs et afterworks retenus dans le guide.${proximity ? ` J’ai privilégié celles à moins de ${radiusLabel} de **${hostName}**.` : ""}`,
    spa: `Pour un moment de soin à **${city}**, voici les spas, hammams et adresses bien-être du guide One World Morocco.${proximity ? ` Tous sont à moins de ${radiusLabel} de **${hostName}**.` : ""}`,
    coffee: `Pour un café ou un moment de travail à **${city}**, voici les adresses avec bonne connexion et atmosphère calme.${proximity ? ` Je me suis concentré sur celles à moins de ${radiusLabel} de **${hostName}**.` : ""}`,
    vegan: `Pour manger vegan ou végétarien à **${city}**, voici les adresses du guide One World Morocco qui proposent une offre adaptée.${proximity ? ` Toutes sont à moins de ${radiusLabel} de **${hostName}**.` : ""}`,
    kids: `Pour une sortie en famille à **${city}**, voici les adresses accueillantes pour les enfants retenues dans le guide.${proximity ? ` J’ai privilégié celles à moins de ${radiusLabel} de **${hostName}**.` : ""}`,
    pet: `Pour sortir avec son chien à **${city}**, voici les adresses du guide One World Morocco qui acceptent les animaux.${proximity ? ` Toutes sont à moins de ${radiusLabel} de **${hostName}**.` : ""}`,
    default: `À **${city}**, voici une sélection d’adresses One World Morocco qui répond à ta demande, avec les lieux les plus pertinents en premier.${proximity ? ` Je me suis concentré sur ceux à moins de ${radiusLabel} de **${hostName}**.` : ""}`,
  };

  const templatesEn: Record<string, string> = {
    delivery_shop: `In **${city}**, for shopping with international delivery, here are the addresses that handle shipping — handy when you’re heading home with a heavy souvenir or a specific order.${proximity ? ` I focused on shops within ${radiusLabel} of **${hostName}**.` : ""}`,
    delivery: `Here are **${city}** addresses that offer delivery — to your door or shipped to your destination.${proximity ? ` I prioritized those within ${radiusLabel} of **${hostName}**.` : ""}`,
    shop: `For shopping in **${city}**, here are the boutiques, workshops and souks featured in the One World Morocco guide.${proximity ? ` I focused on those within ${radiusLabel} of **${hostName}**.` : ""}`,
    rooftop: `In **${city}**, rooftops and elevated terraces are a special kind of pause: medina views, sunsets or a night out. Here are the standouts in the One World Morocco guide.${proximity ? ` All within ${radiusLabel} of **${hostName}**.` : ""}`,
    bar: `For a drink in **${city}**, from crafted cocktails to local spots, here are the bars to try first.${proximity ? ` I prioritized those within ${radiusLabel} of **${hostName}**.` : ""}`,
    pizza: `For pizza in **${city}**, here are the places that bring Italy to the neighborhood — pizzerias, trattorias and Italian tables in the guide.${proximity ? ` I focused on those within ${radiusLabel} of **${hostName}**.` : ""}`,
    restaurant: `For dining in **${city}**, here are the tables that stand out in the One World Morocco guide — selected for atmosphere and quality.${proximity ? ` All within ${radiusLabel} of **${hostName}**.` : ""}`,
    pool: `To cool off in **${city}**, from city pools to beach clubs, here are the addresses for a real moment of relaxation.${proximity ? ` I prioritized those within ${radiusLabel} of **${hostName}**.` : ""}`,
    golf: `To play in **${city}**, here are the nearest courses and golf clubs — greens, fairways and facilities featured in the guide.${proximity ? ` All within ${radiusLabel} of **${hostName}**.` : ""}`,
    art: `For art and galleries in **${city}**, here are the places where culture is visited — exhibitions, local works and curated addresses.${proximity ? ` I focused on those within ${radiusLabel} of **${hostName}**.` : ""}`,
    tea: `For mint tea in **${city}**, here are the addresses that make it a real ritual — riads, tea rooms and terraces at the heart of the local atmosphere.${proximity ? ` All within ${radiusLabel} of **${hostName}**.` : ""}`,
    hotel: `To stay in **${city}**, here are the accommodations in the One World Morocco guide — riads, hotels and villas with character.${proximity ? ` I focused on those within ${radiusLabel} of **${hostName}**.` : ""}`,
    night: `For a night out in **${city}**, here are the evening addresses that matter — bars, clubs and afterworks featured in the guide.${proximity ? ` I prioritized those within ${radiusLabel} of **${hostName}**.` : ""}`,
    spa: `For a wellness moment in **${city}**, here are the spas, hammams and wellbeing addresses in the One World Morocco guide.${proximity ? ` All within ${radiusLabel} of **${hostName}**.` : ""}`,
    coffee: `For coffee or a work session in **${city}**, here are the addresses with good connection and a calm atmosphere.${proximity ? ` I focused on those within ${radiusLabel} of **${hostName}**.` : ""}`,
    vegan: `For vegan or vegetarian food in **${city}**, here are the One World Morocco guide addresses with a suitable offer.${proximity ? ` All within ${radiusLabel} of **${hostName}**.` : ""}`,
    kids: `For a family outing in **${city}**, here are the kid-friendly addresses featured in the guide.${proximity ? ` I prioritized those within ${radiusLabel} of **${hostName}**.` : ""}`,
    pet: `For going out with your dog in **${city}**, here are the One World Morocco guide addresses that welcome pets.${proximity ? ` All within ${radiusLabel} of **${hostName}**.` : ""}`,
    default: `In **${city}**, here is a selection of One World Morocco addresses that match your request, with the most relevant places first.${proximity ? ` I focused on those within ${radiusLabel} of **${hostName}**.` : ""}`,
  };

  const templatesAr: Record<string, string> = {
    delivery_shop: `في **${city}**، للتسوق مع توصيل دولي، إليك العناوين التي تتولى الشحن — عملي عند المغادرة مع تذكار ثقيل أو طلب محدد.${proximity ? ` ركّزت على المتاجر على بعد أقل من ${radiusLabel} من **${hostName}**.` : ""}`,
    delivery: `إليك عناوين **${city}** التي تقدّم خدمة التوصيل — إلى باب منزلك أو شحنها إلى وجهتك.${proximity ? ` ركّزت على تلك التي تبعد أقل من ${radiusLabel} عن **${hostName}**.` : ""}`,
    shop: `للتسوق في **${city}**، إليك المتاجر والورش والأسواق المختارة في دليل One World Morocco.${proximity ? ` ركّزت على تلك التي تبعد أقل من ${radiusLabel} عن **${hostName}**.` : ""}`,
    rooftop: `في **${city}**، تشكّل الأسطح والتراسات المرتفعة نوعًا خاصًا من الاسترخاء: إطلالة على المدينة العتيقة، غروب الشمس أو ليلة خارجية. إليك الأفضل في دليل One World Morocco.${proximity ? ` جميعها على بعد أقل من ${radiusLabel} من **${hostName}**.` : ""}`,
    bar: `لشرب كأس في **${city}**، من الكوكتيلات المصنّعة إلى الأماكن المحليّة، إليك الحانات التي تستحقّ التجربة أولاً.${proximity ? ` ركّزت على تلك التي تبعد أقل من ${radiusLabel} عن **${hostName}**.` : ""}`,
    pizza: `للبيتزا في **${city}**، إليك الأماكن التي تحضّر إيطاليا في الحي — بيتزا محلّات ومطاعم إيطاليّة في الدليل.${proximity ? ` ركّزت على تلك التي تبعد أقل من ${radiusLabel} عن **${hostName}**.` : ""}`,
    restaurant: `للطعام في **${city}**، إليك الطاولات التي تبرز في دليل One World Morocco — مختارة للأجواء والجودة.${proximity ? ` جميعها على بعد أقل من ${radiusLabel} من **${hostName}**.` : ""}`,
    pool: `للاسترخاء في **${city}**، من المسابح الحضريّة إلى نوادي الشاطئ، إليك العناوين التي تقدّم لحظة راحة حقيقية.${proximity ? ` ركّزت على تلك التي تبعد أقل من ${radiusLabel} عن **${hostName}**.` : ""}`,
    golf: `للعب في **${city}**، إليك أقرب الملاعب ونوادي الغولف — الميادين الخضراء والمرافق المختارة في الدليل.${proximity ? ` جميعها على بعد أقل من ${radiusLabel} من **${hostName}**.` : ""}`,
    art: `للفن والمعارض في **${city}**، إليك الأماكن التي تُزار فيها الثقافة — معارض، أعمال محليّة وعناوين مختارة.${proximity ? ` ركّزت على تلك التي تبعد أقل من ${radiusLabel} عن **${hostName}**.` : ""}`,
    tea: `لشرب الشاي بالنعناع في **${city}**، إليك العناوين التي تجعل منه طقسًا حقيقيًا — الرياضات، صالونات الشاي والتراسات في قلب الأجواء المحليّة.${proximity ? ` جميعها على بعد أقل من ${radiusLabel} من **${hostName}**.` : ""}`,
    hotel: `للإقامة في **${city}**، إليك أماكن الإقامة في دليل One World Morocco — الرياضات والفنادق والفِلل ذات الطابع الخاص.${proximity ? ` ركّزت على تلك التي تبعد أقل من ${radiusLabel} عن **${hostName}**.` : ""}`,
    night: `لقضاء ليلة في **${city}**، إليك عناوين المساء التي تهمّ — حانات ونوادي ومواقع ما بعد العمل المختارة في الدليل.${proximity ? ` ركّزت على تلك التي تبعد أقل من ${radiusLabel} عن **${hostName}**.` : ""}`,
    spa: `للحصول على لحظة عناية في **${city}**، إليك المنتجعات الصحيّة والحَمّامات وعناوين الرفاهية في دليل One World Morocco.${proximity ? ` جميعها على بعد أقل من ${radiusLabel} من **${hostName}**.` : ""}`,
    coffee: `للقهوة أو للعمل في **${city}**، إليك العناوين ذات الاتصال الجيد والأجواء الهادئة.${proximity ? ` ركّزت على تلك التي تبعد أقل من ${radiusLabel} عن **${hostName}**.` : ""}`,
    vegan: `للطعام النباتي في **${city}**، إليك عناوين دليل One World Morocco التي تقدّم عروضًا مناسبة.${proximity ? ` جميعها على بعد أقل من ${radiusLabel} من **${hostName}**.` : ""}`,
    kids: `للخروج العائلي في **${city}**، إليك العناوين الملائمة للأطفال المختارة في الدليل.${proximity ? ` ركّزت على تلك التي تبعد أقل من ${radiusLabel} عن **${hostName}**.` : ""}`,
    pet: `للخروج مع الكلب في **${city}**، إليك عناوين دليل One World Morocco التي ترحّب بالحيوانات.${proximity ? ` جميعها على بعد أقل من ${radiusLabel} من **${hostName}**.` : ""}`,
    default: `في **${city}**، إليك مجموعة من عناوين One World Morocco التي تطابق طلبك، مع الأماكن الأكثر صلة أولاً.${proximity ? ` ركّزت على تلك التي تبعد أقل من ${radiusLabel} عن **${hostName}**.` : ""}`,
  };

  if (lang === "en") return templatesEn[topic] || templatesEn.default;
  if (lang === "ar") return templatesAr[topic] || templatesAr.default;
  return templatesFr[topic] || templatesFr.default;
}

function buildContextualClosing(userMessage: string, lang: "fr" | "en" | "ar"): string {
  const q = normalize(userMessage);
  const hasDelivery = /livraison|glovo|livrer|expedition|expédition|expedier|expédier|envoi|envoyer|internationale|ship|shipping/.test(q);
  const hasShop = /magasin|boutique|shopping|souk|tapis|artisan|atelier|cuir|art de table|souvenir/.test(q);
  const hasRooftop = /rooftop|terrasse|toit|vue|panorama/.test(q);
  const hasBar = /bar|cocktail|boire|aperitif|apéritif|apero|apéro|soiree|soirée|afterwork|verre/.test(q);
  const hasRestaurant = /restaurant|manger|dejeuner|déjeuner|diner|dîner|table|cuisine|repas|brunch/.test(q);
  const hasPool = /piscine|beach|plage|beach-club|beach club|bain|nager/.test(q);
  const hasGolf = /golf|parcours|green|swing/.test(q);
  const hasArt = /art|galerie|exposition|museum|musée|culture/.test(q);
  const hasTea = /the|thé|menthe|salon de the|salon de thé|patisserie|pâtisserie|goûter|gouter/.test(q);
  const hasPizza = /pizza|italien|pizzeria|trattoria/.test(q);
  const hasHotel = /hotel|hôtel|riad|villa|hebergement|hébergement|dormir|loger/.test(q);
  const hasNight = /night|club|boite|boîte|nocturne|afterwork|dj/.test(q);
  const hasSpa = /spa|massage|hammam|bien-etre|bien-être|soin|detente|détente/.test(q);

  const topic = hasDelivery && hasShop ? "delivery_shop"
    : hasDelivery ? "delivery"
    : hasShop ? "shop"
    : hasRooftop ? "rooftop"
    : hasBar && !hasRestaurant ? "bar"
    : hasRestaurant && hasPizza ? "pizza"
    : hasRestaurant ? "restaurant"
    : hasPool ? "pool"
    : hasGolf ? "golf"
    : hasArt ? "art"
    : hasTea ? "tea"
    : hasHotel ? "hotel"
    : hasNight ? "night"
    : hasSpa ? "spa"
    : "default";

  const closingsFr: Record<string, string> = {
    delivery_shop: "Tu veux que je précise par type d’article (tapis, cuir, art de table), par budget, ou que je te montre les boutiques ouvertes maintenant ?",
    delivery: "Tu veux que je précise par délai de livraison, ville de destination, ou que je te montre les adresses ouvertes maintenant ?",
    shop: "Tu veux que je précise par type de produit (tapis, cuir, art de table, souvenirs), par quartier, ou par budget ?",
    rooftop: "Tu veux que je précise par vue (médina, Koutoubia, Atlas), par ambiance (calme, festif), ou par moment de la journée ?",
    bar: "Tu veux que je précise par ambiance (intime, festif, vue), par type de cocktail, ou par quartier ?",
    pizza: "Tu veux que je précise par type de pâte, ambiance, ou quartier ?",
    restaurant: "Tu veux que je précise par type de cuisine, par quartier, ou que je te montre les tables ouvertes maintenant ?",
    pool: "Tu veux que je précise par piscine payante, accès hôtel, plage, ou ambiance familiale ?",
    golf: "Tu veux que je précise par niveau de difficulté, par tarif, ou que je te montre les parcours ouverts maintenant ?",
    art: "Tu veux que je précise par type d’art (contemporain, traditionnel, artisanat), par quartier, ou par exposition en cours ?",
    tea: "Tu veux que je précise par cadre (riad, terrasse, salon de thé), par quartier, ou que je te montre les adresses ouvertes maintenant ?",
    hotel: "Tu veux que je précise par standing, par quartier, ou par budget (à partir de) ?",
    night: "Tu veux que je précise par ambiance (lounge, club, rooftop), par quartier, ou par type de musique ?",
    spa: "Tu veux que je précise par soin (hammam, massage, soin visage), par ambiance, ou par prix ?",
    default: "Tu veux que je resserre par quartier, ambiance ou moment de la journée ?",
  };

  const closingsEn: Record<string, string> = {
    delivery_shop: "Want me to narrow by product type (rugs, leather, tableware), budget, or show shops open now?",
    delivery: "Want me to narrow by delivery time, destination city, or show addresses open now?",
    shop: "Want me to narrow by product type (rugs, leather, tableware, souvenirs), neighborhood, or budget?",
    rooftop: "Want me to narrow by view (medina, Koutoubia, Atlas), vibe (quiet, lively), or time of day?",
    bar: "Want me to narrow by vibe (intimate, lively, view), cocktail style, or neighborhood?",
    pizza: "Want me to narrow by crust style, vibe, or neighborhood?",
    restaurant: "Want me to narrow by cuisine type, neighborhood, or show tables open now?",
    pool: "Want me to narrow by day pass, hotel access, beach, or family-friendly?",
    golf: "Want me to narrow by difficulty, price, or show courses open now?",
    art: "Want me to narrow by art type (contemporary, traditional, crafts), neighborhood, or current exhibitions?",
    tea: "Want me to narrow by setting (riad, terrace, tea room), neighborhood, or show places open now?",
    hotel: "Want me to narrow by standard, neighborhood, or budget?",
    night: "Want me to narrow by vibe (lounge, club, rooftop), neighborhood, or music style?",
    spa: "Want me to narrow by treatment (hammam, massage, facial), vibe, or price?",
    default: "Want me to narrow by neighborhood, vibe, or time of day?",
  };

  const closingsAr: Record<string, string> = {
    delivery_shop: "هل تريد التحديد حسب نوع المنتج (سجاد، جلد، أدوات مائدة)، الميزانية، أو عرض المتاجر المفتوحة الآن؟",
    delivery: "هل تريد التحديد حسب مدة التوصيل، مدينة الوجهة، أو عرض العناوين المفتوحة الآن؟",
    shop: "هل تريد التحديد حسب نوع المنتج (سجاد، جلد، أدوات مائدة، تذكارات)، الحي، أو الميزانية؟",
    rooftop: "هل تريد التحديد حسب الإطلالة (المدينة العتيقة، الكتبية، الأطلس)، الأجواء (هادئة، حيوية)، أو وقت الزيارة؟",
    bar: "هل تريد التحديد حسب الأجواء (حميمة، حيوية، إطلالة)، نوع الكوكتيل، أو الحي؟",
    pizza: "هل تريد التحديد حسب نوع العجين، الأجواء، أو الحي؟",
    restaurant: "هل تريد التحديد حسب نوع المطبخ، الحي، أو عرض الطاولات المفتوحة الآن؟",
    pool: "هل تريد التحديد حسب تذكرة الدخول، وصول الفندق، الشاطئ، أو ملاءمة العائلة؟",
    golf: "هل تريد التحديد حسب مستوى الصعوبة، السعر، أو عرض الملاعب المفتوحة الآن؟",
    art: "هل تريد التحديد حسب نوع الفن (معاصر، تقليدي، حرف)، الحي، أو المعارض الحالية؟",
    tea: "هل تريد التحديد حسب الإطار (رياض، تراس، صالون شاي)، الحي، أو عرض الأماكن المفتوحة الآن؟",
    hotel: "هل تريد التحديد حسب المستوى، الحي، أو الميزانية؟",
    night: "هل تريد التحديد حسب الأجواء (صالة، نادي، سطح)، الحي، أو نوع الموسيقى؟",
    spa: "هل تريد التحديد حسب العلاج (حمام، تدليك، عناية بالوجه)، الأجواء، أو السعر؟",
    default: "هل تريد أن أضيّق حسب الحي أو الأجواء أو الوقت؟",
  };

  if (lang === "en") return closingsEn[topic] || closingsEn.default;
  if (lang === "ar") return closingsAr[topic] || closingsAr.default;
  return closingsFr[topic] || closingsFr.default;
}

function buildImmersiveBusinessAnswer(
  result: any,
  host: any,
  userMessage: string,
  lang: "fr" | "en" | "ar",
): string {
  const rows: any[] = Array.isArray(result?.results) ? result.results : [];
  const city = result?.city || host.city || "Marrakech";
  const disclosure = result?.disclosure_note || buildDisclosureFromCounts(rows.length, Number(result?.total_found) || rows.length, city);
  const proximityActive: boolean = !!result?.proximity_active;
  const radiusUsed: number | null = Number.isFinite(Number(result?.radius_km_used)) ? Number(result.radius_km_used) : null;
  const radiusExpanded: boolean = !!result?.radius_expanded;
  const fmtRadius = (r: number) => (r < 1 ? `${Math.round(r * 1000)} m` : Number.isInteger(r) ? `${r} km` : `${r.toFixed(1)} km`);
  const radiusLine = (l: "fr" | "en" | "ar"): string => {
    if (!proximityActive || !radiusUsed) return "";
    if (l === "en") return radiusExpanded
      ? `Not enough results within 1 km — expanded to **${fmtRadius(radiusUsed)}** around **${host.name}**.`
      : `Results within **${fmtRadius(radiusUsed)}** of **${host.name}**.`;
    if (l === "ar") return radiusExpanded
      ? `لا توجد نتائج كافية ضمن 1 كم — تم توسيع النطاق إلى **${fmtRadius(radiusUsed)}** حول **${host.name}**.`
      : `النتائج ضمن **${fmtRadius(radiusUsed)}** حول **${host.name}**.`;
    return radiusExpanded
      ? `Pas assez de résultats à 1 km — périmètre élargi à **${fmtRadius(radiusUsed)}** autour de **${host.name}**.`
      : `Résultats dans un rayon de **${fmtRadius(radiusUsed)}** autour de **${host.name}**.`;
  };
  const nextWider = radiusUsed ? (radiusUsed < 1 ? 1 : radiusUsed < 2 ? 2 : radiusUsed < 3 ? 3 : radiusUsed + 2) : null;
  const nextTighter = radiusUsed ? (radiusUsed > 2 ? 2 : radiusUsed > 1 ? 1 : 0.5) : null;
  const radiusCta = (l: "fr" | "en" | "ar"): string => {
    if (!proximityActive || !radiusUsed || !nextWider || !nextTighter) return "";
    if (l === "en") return ` I can also **widen the radius to ${fmtRadius(nextWider)}** or **tighten it to ${fmtRadius(nextTighter)}** — just say the word.`;
    if (l === "ar") return ` يمكنني أيضًا **توسيع النطاق إلى ${fmtRadius(nextWider)}** أو **تضييقه إلى ${fmtRadius(nextTighter)}** — فقط أخبرني.`;
    return ` Je peux aussi **élargir à ${fmtRadius(nextWider)}** ou **resserrer à ${fmtRadius(nextTighter)}** — dis-moi.`;
  };
  if (!rows.length) return disclosure;

  const intro = buildContextualIntro(userMessage, host, city, lang, proximityActive, radiusUsed);
  const closing = buildContextualClosing(userMessage, lang);

  if (lang === "en") {
    const body = rows.map((b) => {
      const hook = stripText(b.hook_en || b.hook_fr || b.description_en || b.description || "");
      const area = [b.neighborhood, b.city].filter(Boolean).join(", ");
      const detail = hook || [b.main_category, Array.isArray(b.categories) ? b.categories.join(", ") : null].filter(Boolean).join(" · ");
      return `**${b.name}**${area ? `, ${area}` : ""}. ${detail || "A curated One World Morocco address to keep on your shortlist."}`;
    }).join("\n\n");
    const rl = radiusLine("en");
    return `${intro}\n\n${body}\n\n${disclosure}${rl ? `\n\n${rl}` : ""}\n\n${closing}${radiusCta("en")}`;
  }

  if (lang === "ar") {
    const body = rows.map((b) => {
      const hook = stripText(b.hook_ar || b.hook_fr || b.description_ar || b.description || "");
      const area = [b.neighborhood, b.city].filter(Boolean).join("، ");
      const detail = hook || [b.main_category, Array.isArray(b.categories) ? b.categories.join("، ") : null].filter(Boolean).join(" · ");
      return `**${b.name}**${area ? `، ${area}` : ""}. ${detail || "عنوان مختار ضمن دليل One World Morocco."}`;
    }).join("\n\n");
    const rl = radiusLine("ar");
    return `${intro}\n\n${body}\n\n${disclosure}${rl ? `\n\n${rl}` : ""}\n\n${closing}${radiusCta("ar")}`;
  }

  const body = rows.map((b) => {
    const hook = stripText(b.hook_fr || b.hook_en || b.description || b.description_en || "");
    const area = [b.neighborhood, b.city].filter(Boolean).join(", ");
    const detail = hook || [b.main_category, Array.isArray(b.categories) ? b.categories.join(", ") : null].filter(Boolean).join(" · ");
    return `**${b.name}**${area ? `, ${area}` : ""}. ${detail || "Une adresse sélectionnée dans le guide One World Morocco, à garder dans ta shortlist."}`;
  }).join("\n\n");
  const rl = radiusLine("fr");
  return `${intro}\n\n${body}\n\n${disclosure}${rl ? `\n\n${rl}` : ""}\n\n${closing}${radiusCta("fr")}`;
}




function buildSystemPrompt(host: any, lang: "fr" | "en" | "ar"): string {
  const hook = lang === "en" ? (host.hook_en || host.hook_fr) : lang === "ar" ? (host.hook_ar || host.hook_fr) : host.hook_fr;
  const description = lang === "en" ? (host.description_en || host.description) : lang === "ar" ? (host.description_ar || host.description) : host.description;
  const price = host.manual_price_range || (host.min_price ? `à partir de ${host.min_price} MAD` : "");
  const hours = fmtHours(host.opening_hours);

  const langLabel = lang === "en" ? "English" : lang === "ar" ? "Arabic (العربية)" : "French";

  const facts = [
    `Nom: ${host.name}`,
    host.city ? `Ville: ${host.city}` : "",
    host.neighborhood ? `Quartier: ${host.neighborhood}` : "",
    host.address ? `Adresse: ${host.address}` : "",
    hook ? `Accroche: ${hook}` : "",
    description ? `Description: ${String(description).slice(0, 500)}` : "",
    price ? `Prix indicatif: ${price}` : "",
    hours ? `Horaires: ${hours}` : "",
    host.phone ? `Téléphone: ${host.phone}` : "",
    host.whatsapp ? `WhatsApp: ${host.whatsapp}` : "",
    host.website ? `Site: ${host.website}` : "",
    host.main_category ? `Catégorie: ${host.main_category}` : "",
  ].filter(Boolean).join("\n");

  return `You are the friendly, concise digital concierge of "${host.name}" (${host.city || "Morocco"}).
Reply in ${langLabel} regardless of the user's language.

FACTS about "${host.name}" (source of truth — never contradict, never invent):
${facts}

SCOPE — "complementary only":
- Your job is to help the visitor make the most of their stay AROUND "${host.name}".
- You can recommend COMPLEMENTARY places to visit around ${host.city || "the area"}: activities, events, restaurants, bars, cafés, spas, guided tours, cultural venues, shops, viewpoints… — anything that enriches the visit.
- You MUST NEVER recommend a direct competitor of "${host.name}" (same category). The search tool already filters competitors out; if the user explicitly asks for one, politely redirect them to what "${host.name}" itself offers.
- When answering "where to eat / drink / do X near me", assume near ${host.city || "Morocco"} and near ${host.name}.

TOOLS:
- search_businesses(query, category, city, neighborhood, badges, services, limit) — searches One World Morocco's curated directory. Results are automatically filtered to exclude "${host.name}" and its direct competitors. Default city = "${host.city || "Marrakech"}".
- search_events(city, query, from_date, to_date, limit) — finds cultural/festive events with the #Agenda badge.
- show_on_map(business_slugs[]) — displays a Google Maps panel with the chosen businesses. Call it whenever the visitor asks "where", "on a map", "show me", or when you've listed 2+ addresses.

STYLE:
- Warm, generous, useful. Aim for substantive answers (6–14 sentences typically), not one-liners. When the visitor asks a broad question, offer real depth: context, atmosphere, what makes each place special, best moment to go, quartier, distance-feel from "${host.name}", and a small practical tip.
- When you recommend places, propose SEVERAL options (typically 3 to 6) rather than a single pick, grouped as a markdown bulleted list. For each item: **Name** — one to two sentences describing the vibe / signature dish / signature experience, plus quartier and a concrete reason to go.
- Whenever you list 2+ addresses, also call show_on_map with their slugs so the visitor can see them on a map.
- End with a short follow-up question or 2–3 suggested next directions ("plutôt bar rooftop ou table gastronomique ?", "je peux affiner par quartier ?") so the conversation keeps opening up.
- When you recommend a place from search_businesses, name it exactly as returned. Never invent a place that wasn't returned by a tool. If search results are thin, say so honestly and propose a refined search.
- 🔴 RÈGLE ABSOLUE — DIVULGATION DU COMPTE : à CHAQUE fois que tu utilises search_businesses ou search_events, tu DOIS inclure la phrase exacte renvoyée dans le champ \`disclosure_note\` du résultat de l'outil (ou son équivalent traduit dans la langue de réponse) sur sa propre ligne, AVANT ta question de relance. Cette phrase précise le nombre d'adresses affichées sur le nombre trouvé et invite à explorer les autres. Aucune réponse contenant des recommandations issues d'un outil ne peut être envoyée sans cette phrase.
- Never output raw HTML, JSON, or code fences. Plain markdown only (bold, bullets, light emojis ok).
- For bookings AT "${host.name}", invite the visitor to WhatsApp/phone/website in FACTS.
- Never say you are an AI, a model, or a system.`;
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "search_businesses",
      description: "Recherche des établissements RÉELS dans la base One World Morocco (autour de l'hôte). Filtre automatiquement les concurrents directs. Utilise-la avant de citer une adresse.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          category: { type: "string" },
          city: { type: "string" },
          neighborhood: { type: "string" },
          badges: { type: "array", items: { type: "string" } },
          services: { type: "array", items: { type: "string" } },
          limit: { type: "number", default: 12 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_events",
      description: "Recherche d'événements #Agenda à venir.",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string" },
          query: { type: "string" },
          from_date: { type: "string" },
          to_date: { type: "string" },
          limit: { type: "number", default: 8 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "show_on_map",
      description: "Affiche sur une carte Google Maps un ensemble d'établissements (par slugs).",
      parameters: {
        type: "object",
        properties: {
          business_slugs: { type: "array", items: { type: "string" } },
          title: { type: "string" },
        },
        required: ["business_slugs"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "Météo actuelle et prévisions (jusqu'à 7 jours) pour une ville marocaine.",
      parameters: {
        type: "object",
        properties: { city: { type: "string" } },
      },
    },
  },
];

// Extract our custom body fields from a useChat request. `messages` is the UIMessage[]
// array; the extra fields come from prepareSendMessagesRequest on the client.
function extractTextFromUIMessage(m: UIMessage): string {
  if (!m) return "";
  const parts = (m as any).parts;
  if (Array.isArray(parts)) {
    return parts
      .filter((p: any) => p?.type === "text" && typeof p.text === "string")
      .map((p: any) => p.text)
      .join("");
  }
  return String((m as any).content ?? "");
}

function preserveEmbedMarkers(text: string, maxTextChars = 4000): string {
  const markerRe = /<!--(?:SHOW_ON_MAP|EVENTS_SNAPSHOT|KNOWN_BUSINESSES|ARTICLE_CARD):[\s\S]*?-->/g;
  const markers = text.match(markerRe) || [];
  const clean = text.replace(markerRe, "").slice(0, maxTextChars).trim();
  return [clean, ...markers].filter(Boolean).join("\n\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(SUPABASE_URL, SERVICE);

    const body = await req.json().catch(() => ({} as any));
    // Keep last 8 turns only — older context inflates tokens without helping recall.
    const uiMessages: UIMessage[] = Array.isArray(body.messages) ? body.messages.slice(-8) : [];
    const slugOrId = String(body.businessSlug || body.businessId || "").trim();
    const language = pickLang(body.language);
    const sessionId: string | null = typeof body.sessionId === "string" ? body.sessionId : null;
    const messageIndex: number = Number.isFinite(body.messageIndex) ? Number(body.messageIndex) : 0;
    const suggestionId: string | null = typeof body.suggestionId === "string" && body.suggestionId ? body.suggestionId : null;
    const followupId: string | null = typeof body.followupId === "string" && body.followupId ? body.followupId : null;
    const scope: "filter" | "broaden" | null =
      body.scope === "filter" || body.scope === "broaden" ? body.scope : null;

    if (!slugOrId) {
      return new Response(JSON.stringify({ error: "businessSlug required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!uiMessages.length) {
      return new Response(JSON.stringify({ error: "messages required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert UIMessages -> classic {role,content} for our existing tool loop.
    const inMessages: Msg[] = uiMessages
      .filter((m: any) => m && (m.role === "user" || m.role === "assistant"))
      .map((m: any) => {
        const role = m.role as "user" | "assistant";
        const raw = extractTextFromUIMessage(m);
        return {
          role,
          content: role === "assistant" ? preserveEmbedMarkers(raw, 4000) : raw.slice(0, 4000),
        };
      });

    // Build the UI message stream (AI SDK v5 protocol).
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const t0 = Date.now();
        let firstTokenAt: number | null = null;
        let llmUsed = false; // Moteur A/B/C : true dès qu'un appel générateur est fait
        const textId = crypto.randomUUID();
        let textStarted = false;
        const startText = () => {
          if (!textStarted) {
            writer.write({ type: "text-start", id: textId });
            textStarted = true;
          }
        };
        const emitDelta = (delta: string) => {
          if (!delta) return;
          if (!firstTokenAt) firstTokenAt = Date.now();
          startText();
          writer.write({ type: "text-delta", id: textId, delta });
        };
        const endText = () => {
          if (textStarted) {
            writer.write({ type: "text-end", id: textId });
            textStarted = false;
          }
        };

        // Keep the iframe/client connection alive immediately. Some deterministic
        // routes do DB work + synthesis before the first visible token; without an
        // early stream frame, the browser/SDK can treat the request as interrupted.
        startText();

        // Resolve host business
        let bizQ = admin
          .from("businesses")
          .select("id, slug, name, city, neighborhood, address, main_category, categories, hook_fr, hook_en, hook_ar, description, description_en, description_ar, min_price, manual_price_range, phone, whatsapp, website, opening_hours, show_opening_hours, reserve_now_url, reserve_now_cta, presentation_mode, online_shop_url, online_shop_cta, online_shop_presentation_mode, url_4, url_4_cta, url_4_presentation_mode, url_5, url_5_cta, url_5_presentation_mode, latitude, longitude, is_active")
          .eq("is_active", true)
          .limit(1);
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
        bizQ = isUuid ? bizQ.eq("id", slugOrId) : bizQ.eq("slug", slugOrId);
        const { data: bizRows } = await bizQ;
        if (!bizRows?.length) {
          emitDelta("Établissement introuvable.");
          endText();
          return;
        }
        const host = bizRows[0];

        // Host subcategories & category names for competitor filtering
        const { data: hostSubs } = await admin
          .from("subcategory_relations")
          .select("subcategory_id")
          .eq("business_id", host.id);
        const hostSubIds = new Set<string>((hostSubs || []).map((r: any) => r.subcategory_id).filter(Boolean));
        const hostCategoryNames = new Set<string>([
          ...(Array.isArray(host.categories) ? host.categories : []),
          host.main_category,
        ].map(normalize).filter(Boolean));
        const hostMainCatN = normalize(host.main_category);

        const isCompetitor = async (candidate: any): Promise<boolean> => {
          if (!candidate) return true;
          if (candidate.id === host.id) return true;
          if (hostMainCatN && normalize(candidate.main_category) === hostMainCatN) return true;
          if (hostSubIds.size >= 2 && candidate.id) {
            const { data: subs } = await admin
              .from("subcategory_relations")
              .select("subcategory_id")
              .eq("business_id", candidate.id);
            const overlap = (subs || []).filter((r: any) => hostSubIds.has(r.subcategory_id)).length;
            if (overlap >= 2) return true;
          }
          return false;
        };

        const filterOutCompetitors = async (list: any[]): Promise<any[]> => {
          const kept: any[] = [];
          for (const c of list) {
            const bad = await isCompetitor(c);
            if (!bad) kept.push(c);
          }
          return kept;
        };

        const filterOutClosed = async (list: any[]): Promise<any[]> => {
          const ids = list.map((b: any) => b?.id).filter(Boolean);
          if (!ids.length) return list;
          const { data } = await admin
            .from("businesses")
            .select("id, closure_message")
            .in("id", ids);
          const closed = new Set(
            (data || [])
              .filter((r: any) => r.closure_message && String(r.closure_message).trim())
              .map((r: any) => r.id),
          );
          return list.filter((b: any) => !closed.has(b.id));
        };

        // Deterministic route context (suggestion pins / subcategories / badges / mode)
        let deterministicSubcategoryNames: string[] | null = null;
        let deterministicBadgeIds: string[] | null = null;
        let suggestionPinnedIds: string[] = [];
        let suggestionMode: string | null = null;
        let suggestionLabel: string | null = null;
        let suggestionDestinationIds: string[] = [];
        // Staff-pinned blog articles for this suggestion (explicit link wins over
        // semantic detection — same rule as the Club assistant).
        let suggestionBlogIds: string[] = [];
        // Curated two-entity proximity: staff-picked subcats/badges for A and B.
        // When both sides have at least one mapping, the two-entity route runs
        // with these exact mappings and bypasses free-text term resolution.
        let curatedProximity: {
          a: { subcatIds: string[]; badgeIds: string[]; subcatNames: string[] };
          b: { subcatIds: string[]; badgeIds: string[]; subcatNames: string[] };
        } | null = null;
        if (suggestionId) {
          try {
            const { data: sugg } = await admin
              .from("embed_ai_suggestions")
              .select("subcategory_ids, badge_ids, business_ids, destination_ids, blog_post_ids, mode, label_fr, label_en, label_ar, proximity_a_subcategory_ids, proximity_a_badge_ids, proximity_b_subcategory_ids, proximity_b_badge_ids")
              .eq("id", suggestionId)
              .maybeSingle();
            const subIds: string[] = Array.isArray(sugg?.subcategory_ids) ? sugg!.subcategory_ids : [];
            if (subIds.length) {
              const { data: subs } = await admin
                .from("subcategories")
                .select("name_fr")
                .in("id", subIds);
              const names = (subs || []).map((s: any) => s.name_fr).filter(Boolean);
              if (names.length) deterministicSubcategoryNames = names;
            }
            const bIds: string[] = Array.isArray(sugg?.badge_ids) ? sugg!.badge_ids : [];
            if (bIds.length) deterministicBadgeIds = bIds;
            const pIds: string[] = Array.isArray(sugg?.business_ids) ? sugg!.business_ids : [];
            // Cite the linked business only on the first response (initial suggestion click).
            // On follow-ups (followupId present), drop the pin so it is not re-cited.
            if (pIds.length && !followupId) suggestionPinnedIds = pIds;
            suggestionMode = (sugg?.mode as string | null) || null;
            suggestionLabel = (sugg?.label_fr as string | null) || (sugg?.label_en as string | null) || (sugg?.label_ar as string | null) || null;
            const dIds: string[] = Array.isArray(sugg?.destination_ids) ? sugg!.destination_ids : [];
            if (dIds.length) suggestionDestinationIds = dIds;
            const blogIds: string[] = Array.isArray(sugg?.blog_post_ids) ? sugg!.blog_post_ids.filter(Boolean) : [];
            if (blogIds.length && !followupId) suggestionBlogIds = blogIds;

            // Load curated proximity mappings if both A and B are populated
            const paSub: string[] = Array.isArray(sugg?.proximity_a_subcategory_ids) ? sugg!.proximity_a_subcategory_ids : [];
            const paBadge: string[] = Array.isArray(sugg?.proximity_a_badge_ids) ? sugg!.proximity_a_badge_ids : [];
            const pbSub: string[] = Array.isArray(sugg?.proximity_b_subcategory_ids) ? sugg!.proximity_b_subcategory_ids : [];
            const pbBadge: string[] = Array.isArray(sugg?.proximity_b_badge_ids) ? sugg!.proximity_b_badge_ids : [];
            const aHas = paSub.length > 0 || paBadge.length > 0;
            const bHas = pbSub.length > 0 || pbBadge.length > 0;
            if (aHas && bHas) {
              const allSubIds = [...new Set([...paSub, ...pbSub])];
              const namesMap = new Map<string, string>();
              if (allSubIds.length) {
                const { data: subs2 } = await admin.from("subcategories").select("id, name_fr").in("id", allSubIds);
                for (const s of subs2 || []) if (s?.id && s?.name_fr) namesMap.set(String(s.id), String(s.name_fr));
              }
              curatedProximity = {
                a: { subcatIds: paSub, badgeIds: paBadge, subcatNames: paSub.map((i) => namesMap.get(i)).filter(Boolean) as string[] },
                b: { subcatIds: pbSub, badgeIds: pbBadge, subcatNames: pbSub.map((i) => namesMap.get(i)).filter(Boolean) as string[] },
              };
            }
          } catch (e) {
            console.error("[embed-ai-chat] suggestion_route_lookup_error", e);
          }
        }

        // Per-business links (affiliate tab "Agent IA"): a suggestion or a
        // followup can be tied to blog articles and to AI texts generated in the
        // "TXT IA" tab. These links win over generic staff mappings because the
        // owner curated them for this exact widget.
        let ownerAiTexts: Array<{ title: string; hook: string; content: string }> = [];
        {
          const linkKind: "suggestion" | "followup" | null = followupId ? "followup" : (suggestionId ? "suggestion" : null);
          const linkItemId = followupId || suggestionId;
          if (linkKind && linkItemId) {
            try {
              const { data: link } = await admin
                .from("business_embed_ai_item_links")
                .select("blog_post_ids, ai_text_ids")
                .eq("business_id", host.id)
                .eq("item_kind", linkKind)
                .eq("item_id", linkItemId)
                .maybeSingle();
              const linkedBlogIds: string[] = Array.isArray(link?.blog_post_ids) ? link!.blog_post_ids.filter(Boolean) : [];
              if (linkedBlogIds.length) {
                suggestionBlogIds = [...new Set([...linkedBlogIds, ...suggestionBlogIds])];
              }
              const linkedTextIds: string[] = Array.isArray(link?.ai_text_ids) ? link!.ai_text_ids.filter(Boolean) : [];
              if (linkedTextIds.length) {
                const { data: txts } = await admin
                  .from("business_ai_texts")
                  .select("title, hook, content, position")
                  .in("id", linkedTextIds)
                  .order("position", { ascending: true });
                ownerAiTexts = (txts || [])
                  .map((t: any) => ({
                    title: String(t?.title || "").trim(),
                    hook: String(t?.hook || "").trim(),
                    content: String(t?.content || "").trim(),
                  }))
                  .filter((t) => t.content);
              }
            } catch (e) {
              console.error("[embed-ai-chat] item_links_lookup_error", e);
            }
          }
        }



        // If the user typed a fresh free-text message (no followup click) that
        // doesn't look like a refinement of the current suggestion thread, drop
        // the deterministic suggestion force so the previous badges/subcats
        // don't hijack the new query. Initial suggestion click (message text ==
        // suggestion label) always keeps the force.
        if (suggestionId && !followupId) {
          const lastUser = uiMessages[uiMessages.length - 1];
          const lastUserText = lastUser?.role === "user" ? extractTextFromUIMessage(lastUser) : "";
          const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").replace(/[?!.\s]+$/g, "").trim();
          const isInitialClick = !!(suggestionLabel && norm(lastUserText) === norm(suggestionLabel));

          // Pinned businesses / destinations / mode are cited ONLY on the very
          // first AI response (initial suggestion click). Any subsequent turn
          // — free-text refinement, follow-up, broaden/filter — drops them so
          // the linked establishments are never re-appended below new answers.
          if (!isInitialClick) {
            suggestionPinnedIds = [];
            suggestionMode = null;
            suggestionDestinationIds = [];
            suggestionBlogIds = [];
          }

          // Explicit user scope overrides the heuristic for the deterministic
          // taxonomic scope (subcats / badges / curated proximity):
          //  - "broaden" → always drop it (fresh city-wide search).
          //  - "filter"  → always keep it (narrow within the current thread).
          const shouldDrop =
            scope === "broaden"
              ? true
              : scope === "filter"
                ? false
                : !isInitialClick && !isSuggestionRefinement(lastUserText);
          if (shouldDrop) {
            deterministicSubcategoryNames = null;
            deterministicBadgeIds = null;
            curatedProximity = null;
          }
        }

        // Blog article route runs later, once emitTrailingMarkers / knownBusinesses
        // / lastMapPayload are in scope. Placeholder kept here to preserve context.






        // Tool executor
        const runTool = async (name: string, args: any): Promise<any> => {
          try {
            if (name === "search_businesses") {
              const limit = Math.min(Math.max(Number(args.limit) || 10, 1), SEARCH_LIMIT_HARD);
              const qParts: string[] = [];
              if (args.query) qParts.push(String(args.query));
              if (args.category) qParts.push(String(args.category));
              (Array.isArray(args.badges) ? args.badges : []).forEach((b: string) => qParts.push(String(b).replace(/^#/, "")));
              (Array.isArray(args.services) ? args.services : []).forEach((s: string) => qParts.push(String(s).replace(/^#/, "")));
              if (args.neighborhood) qParts.push(String(args.neighborhood));
              const baseQuery = qParts.filter(Boolean).join(" ").trim();
              // « vue atlas » ≡ « vue montagne » : on injecte le nom EXACT du
              // service/badge en base (panorama = attribut, jamais une distance).
              const viewHints = detectViewIntent(baseQuery).panoramas.map((p) => p.attributeNames[0]);
              const fullQuery = viewHints.length ? `${baseQuery} ${viewHints.join(" ")}`.trim() : baseQuery;
              const city = args.city || host.city || "Marrakech";
              const subcategoryNames: string[] | undefined = Array.isArray(args._subcategoryNames) && args._subcategoryNames.length
                ? args._subcategoryNames.map((s: any) => String(s)).filter(Boolean)
                : undefined;
              const badgeIds: string[] | undefined = Array.isArray(args._badgeIds) && args._badgeIds.length
                ? args._badgeIds.map((s: any) => String(s)).filter(Boolean)
                : undefined;
              const r = await fetch(`${SUPABASE_URL}/functions/v1/business-search`, {
                method: "POST",
                headers: { Authorization: `Bearer ${SERVICE}`, apikey: SERVICE, "Content-Type": "application/json" },
                body: JSON.stringify({
                  query: fullQuery || undefined,
                  spoken: fullQuery || undefined,
                  language,
                  pageSize: SEARCH_LIMIT_HARD,
                  offset: 0,
                  compact: "card",
                  city,
                  neighborhood: args.neighborhood || undefined,
                  subcategoryNames,
                  badgeIds,
                }),
              });
              const text = await r.text();
              let sres: any = null; try { sres = JSON.parse(text); } catch { /* */ }
              const all: any[] = Array.isArray(sres?.businesses) ? sres.businesses : [];
              const pinnedSet = new Set(suggestionPinnedIds);
              const nonPinned = all.filter((b: any) => !pinnedSet.has(b.id));
              const pinnedFromAll = all.filter((b: any) => pinnedSet.has(b.id));
              // When a deterministic badge/subcategory filter is active, the user is
              // explicitly asking for a different vertical than the host — skip the
              // "competitor" filter so results aren't dropped for sharing generic
              // subcategories (e.g. a rooftop restaurant hosted inside a riad).
              const skipCompetitorFilter = !!(subcategoryNames?.length || badgeIds?.length);
              const nonPinnedFiltered = skipCompetitorFilter ? nonPinned : await filterOutCompetitors(nonPinned);
              let filtered = await filterOutClosed([...pinnedFromAll, ...nonPinnedFiltered]);

              if (suggestionPinnedIds.length) {
                const already = new Set(filtered.map((b: any) => b.id));
                const missingIds = suggestionPinnedIds.filter((id) => !already.has(id));
                let pinnedFetched: any[] = [];
                if (missingIds.length) {
                  const { data: pinnedRows } = await admin
                    .from("businesses")
                    .select("id, name, slug, city, neighborhood, main_category, hook_fr, hook_en, hook_ar, latitude, longitude, min_price, manual_price_range, logo_url, images, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, computed_rating, total_review_count")
                    .in("id", missingIds)
                    .eq("is_active", true)
                    .is("closure_message", null);
                  pinnedFetched = pinnedRows || [];
                }
                const pinnedFromFiltered = filtered.filter((b: any) => suggestionPinnedIds.includes(b.id));
                const rest = filtered.filter((b: any) => !suggestionPinnedIds.includes(b.id));
                const pinnedAll = [...pinnedFromFiltered, ...pinnedFetched];
                const orderedPinned = suggestionPinnedIds
                  .map((id) => pinnedAll.find((b: any) => b.id === id))
                  .filter(Boolean);
                filtered = [...orderedPinned, ...rest];
              }

              // Proximity filter — progressive expansion around anchor (host by default).
              const anchorLat = Number(args._anchorLat);
              const anchorLng = Number(args._anchorLng);
              const requestedRadius = Number(args._radiusKm);
              let proximityActive = false;
              let radiusUsedKm: number | null = null;
              let radiusExpanded = false;
              if (Number.isFinite(anchorLat) && Number.isFinite(anchorLng) && Number.isFinite(requestedRadius) && requestedRadius > 0) {
                proximityActive = true;
                const withDist = filtered
                  .map((b: any) => {
                    const la = Number(b.latitude), lo = Number(b.longitude);
                    if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;
                    return { b, d: haversineKmLocal(anchorLat, anchorLng, la, lo) };
                  })
                  .filter(Boolean) as Array<{ b: any; d: number }>;
                withDist.sort((x, y) => x.d - y.d);
                const strict = !!args._strictRadius;
                const steps = strict
                  ? [requestedRadius]
                  : Array.from(new Set([requestedRadius, requestedRadius * 2, requestedRadius * 3])).sort((a, b) => a - b);
                let chosen: typeof withDist = [];
                for (let i = 0; i < steps.length; i++) {
                  const r = steps[i];
                  chosen = withDist.filter((x) => x.d <= r);
                  if (strict || chosen.length >= 3 || i === steps.length - 1) {
                    radiusUsedKm = r;
                    radiusExpanded = i > 0;
                    break;
                  }
                }
                // Keep pinned regardless, then near-first ordering
                const pinnedKept = filtered.filter((b: any) => suggestionPinnedIds.includes(b.id));
                const nearIds = new Set(chosen.map((x) => x.b.id));
                const nearOrdered = chosen.map((x) => x.b);
                filtered = [
                  ...pinnedKept.filter((b: any) => !nearIds.has(b.id)),
                  ...nearOrdered,
                ];
              }

              const totalFound = filtered.length;
              const results = filtered.slice(0, limit);
              const pool_ids: string[] = filtered.map((b: any) => String(b.id)).filter(Boolean);
              if (!results.length) {
                return { results: [], total_shown: 0, total_found: 0, total_count: 0, city, disclosure_note: buildDisclosureFromCounts(0, 0, city), note: `Aucun établissement complémentaire trouvé pour "${fullQuery}" à ${city}.`, proximity_active: proximityActive, radius_km_used: radiusUsedKm, radius_expanded: radiusExpanded, pool_ids };
              }
              const disclosure = buildDisclosureFromCounts(results.length, totalFound, city);
              return {
                results: results.map((b: any) => ({
                  id: b.id, name: b.name, slug: b.slug, city: b.city, neighborhood: b.neighborhood,
                  main_category: b.main_category, hook_fr: b.hook_fr, hook_en: b.hook_en, hook_ar: b.hook_ar,
                  latitude: b.latitude, longitude: b.longitude,
                  logo_url: b.logo_url ?? null,
                  images: Array.isArray(b.images) ? b.images : [],
                  google_rating: b.google_rating ?? null,
                  google_review_count: b.google_review_count ?? null,
                  tripadvisor_rating: b.tripadvisor_rating ?? null,
                  tripadvisor_review_count: b.tripadvisor_review_count ?? null,
                  computed_rating: b.computed_rating ?? null,
                  total_review_count: b.total_review_count ?? null,
                  price_range: b.manual_price_range || (b.min_price ? `${b.min_price}+ MAD` : null),
                  is_pinned: suggestionPinnedIds.includes(b.id),
                  pin_rank: suggestionPinnedIds.includes(b.id) ? suggestionPinnedIds.indexOf(b.id) + 1 : null,
                })),
                total_shown: results.length,
                total_found: totalFound,
                total_count: results.length,
                city,
                disclosure_note: disclosure,
                proximity_active: proximityActive,
                radius_km_used: radiusUsedKm,
                radius_expanded: radiusExpanded,
                pool_ids,
              };
            }

            if (name === "search_events") {
              const limit = Math.min(Number(args.limit) || 8, 10);
              const today = new Date().toISOString().slice(0, 10);
              const from = (args.from_date && String(args.from_date).slice(0, 10)) || today;
              const to = (args.to_date && String(args.to_date).slice(0, 10)) || new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
              let eventIds: string[] | null = null;
              const overrideBadgeIds: string[] | undefined = Array.isArray(args._badgeIds) && args._badgeIds.length
                ? args._badgeIds.map((s: any) => String(s)).filter(Boolean)
                : undefined;
              if (overrideBadgeIds) {
                const { data: eb } = await admin.from("event_badges").select("event_id").in("badge_id", overrideBadgeIds);
                eventIds = (eb || []).map((r: any) => r.event_id).filter(Boolean);
                if (!eventIds.length) return { results: [], note: "Aucun événement pour ce(s) badge(s)." };
              } else {
                const { data: badge } = await admin.from("badges").select("id").ilike("name_fr", "%agenda%").limit(1).maybeSingle();
                if (badge?.id) {
                  const { data: eb } = await admin.from("event_badges").select("event_id").eq("badge_id", badge.id);
                  eventIds = (eb || []).map((r: any) => r.event_id).filter(Boolean);
                  if (!eventIds.length) return { results: [], note: "Aucun événement #Agenda." };
                }
              }
              let q = admin
                .from("events")
                .select("id,name,hook,description,start_date,end_date,recurrence,days_of_week,start_time,end_time,url,city_id,default_business_id,images,videos,sort_order,logo_url,cities:city_id(name_fr),neighborhoods:neighborhood_id(name)")
                .or(`and(start_date.gte.${from},start_date.lte.${to}),and(start_date.lte.${to},end_date.gte.${from}),recurrence.not.is.null,days_of_week.neq.{}`)
                .order("sort_order", { ascending: true, nullsFirst: false })
                .order("start_date", { ascending: true, nullsFirst: false })
                .limit(limit * 5);
              if (eventIds) q = q.in("id", eventIds.slice(0, 500));
              if (args.query) {
                const qv = String(args.query).replace(/[,()"]/g, " ").trim();
                if (qv) q = q.or(`name.ilike.%${qv}%,description.ilike.%${qv}%,hook.ilike.%${qv}%`);
              }
              const { data } = await q;
              let results = data || [];
              const targetCity = args.city || host.city;
              if (targetCity) {
                const cv = normalize(targetCity);
                results = results.filter((e: any) => normalize(e.cities?.name_fr || "").includes(cv));
              }
              // Post-filter: an event with recurrence must ACTUALLY intersect [from, to].
              // The SQL OR clause `recurrence.not.is.null` lets any recurring event through
              // regardless of dates — we filter here so yearly/monthly/weekly recurrences
              // only surface when a real occurrence falls in the window.
              const fromDate = new Date(from + "T00:00:00Z");
              const toDate = new Date(to + "T23:59:59Z");
              const DOW_MAP: Record<string, number> = { sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tue: 2, wednesday: 3, wed: 3, thursday: 4, thu: 4, friday: 5, fri: 5, saturday: 6, sat: 6 };
              const normalizeDows = (arr: any): number[] => (Array.isArray(arr) ? arr : []).map((v: any) => typeof v === "number" ? v : DOW_MAP[String(v).toLowerCase()]).filter((n: any) => Number.isInteger(n));
              const eventIntersectsWindow = (e: any): boolean => {
                const sd = e.start_date ? new Date(e.start_date + "T00:00:00Z") : null;
                const ed = e.end_date ? new Date(e.end_date + "T23:59:59Z") : sd;
                const dows = normalizeDows(e.days_of_week);
                // Implicit weekly: days_of_week set but no recurrence flag
                const rec = e.recurrence ? String(e.recurrence).toLowerCase() : (dows.length ? "weekly" : "");
                if (!rec) return sd ? (sd <= toDate && (ed ?? sd) >= fromDate) : false;
                if (rec === "daily") return true;
                if (rec === "weekly") {
                  if (!dows.length) return true;
                  for (let t = fromDate.getTime(); t <= toDate.getTime(); t += 86400000) {
                    const d = new Date(t).getUTCDay();
                    if (dows.includes(d)) return true;
                  }
                  return false;
                }
                if (rec === "monthly" && sd) {
                  const dom = sd.getUTCDate();
                  for (let t = fromDate.getTime(); t <= toDate.getTime(); t += 86400000) {
                    if (new Date(t).getUTCDate() === dom) return true;
                  }
                  return false;
                }
                if (rec === "yearly" && sd) {
                  const m = sd.getUTCMonth(), d = sd.getUTCDate();
                  for (let t = fromDate.getTime(); t <= toDate.getTime(); t += 86400000) {
                    const dt = new Date(t);
                    if (dt.getUTCMonth() === m && dt.getUTCDate() === d) return true;
                  }
                  return false;
                }
                // Unknown recurrence type → keep only if start_date overlaps window
                return sd ? (sd <= toDate && (ed ?? sd) >= fromDate) : false;
              };
              results = results.filter(eventIntersectsWindow);
              results = results.slice(0, limit);

              // Same thumbnail logic as /search #Agenda: event image 1 first,
              // otherwise thumbnail_url from business_documents matching video 1.
              const firstVideoUrls = results
                .map((e: any) => (Array.isArray(e.videos) ? e.videos.filter(Boolean)[0] : null))
                .filter(Boolean) as string[];
              const thumbByUrl = new Map<string, string>();
              if (firstVideoUrls.length) {
                const { data: docs } = await admin
                  .from("business_documents")
                  .select("url,thumbnail_url")
                  .eq("business_is_active", true)
                  .in("url", firstVideoUrls);
                for (const d of docs || []) {
                  if ((d as any).url && (d as any).thumbnail_url) thumbByUrl.set((d as any).url, (d as any).thumbnail_url);
                }
              }

              // Fetch linked business names — prefer default_business_id, fall back to event_businesses
              const resultEventIds = results.map((e: any) => e.id).filter(Boolean) as string[];
              const linkedByEvent = new Map<string, string>(); // event_id -> business_id
              for (const e of results) {
                if (e.default_business_id) linkedByEvent.set(e.id, e.default_business_id);
              }
              const missingEventIds = resultEventIds.filter((id) => !linkedByEvent.has(id));
              if (missingEventIds.length) {
                const { data: ebRows } = await admin
                  .from("event_businesses")
                  .select("event_id,business_id")
                  .in("event_id", missingEventIds);
                for (const r of ebRows || []) {
                  const eid = (r as any).event_id;
                  const bid = (r as any).business_id;
                  if (eid && bid && !linkedByEvent.has(eid)) linkedByEvent.set(eid, bid);
                }
              }
              const allBizIds = Array.from(new Set(Array.from(linkedByEvent.values())));
              const bizNameById = new Map<string, string>();
              if (allBizIds.length) {
                const { data: bizRows } = await admin
                  .from("businesses")
                  .select("id,name")
                  .in("id", allBizIds);
                for (const b of bizRows || []) {
                  if ((b as any).id) bizNameById.set((b as any).id, (b as any).name || "");
                }
              }

              results = results.map((e: any) => {
                const bizId = linkedByEvent.get(e.id) || null;
                return {
                  id: e.id, name: e.name, hook: e.hook,
                  start_date: e.start_date, end_date: e.end_date,
                  recurrence: e.recurrence, days_of_week: e.days_of_week,
                  start_time: e.start_time, end_time: e.end_time,
                  city: e.cities?.name_fr || null,
                  neighborhood: e.neighborhoods?.name || null,
                  url: e.url || null,
                  sort_order: e.sort_order ?? null,
                  default_business_id: bizId,
                  business_name: bizId ? (bizNameById.get(bizId) || null) : null,
                  image: (() => {
                    const firstImage = Array.isArray(e.images) ? e.images.filter(Boolean)[0] : null;
                    const firstVideo = Array.isArray(e.videos) ? e.videos.filter(Boolean)[0] : null;
                    return firstImage || (firstVideo ? thumbByUrl.get(firstVideo) || null : null);
                  })(),
                  video: Array.isArray(e.videos) ? e.videos[0] : null,
                };
              });
              if (!results.length) return { results: [], note: `Aucun événement trouvé entre ${from} et ${to}.` };
              return { results, period: { from, to }, city: targetCity || null };
            }

            if (name === "show_on_map") {
              const slugs: string[] = Array.isArray(args.business_slugs)
                ? args.business_slugs.filter((s: any) => typeof s === "string" && s.trim()).slice(0, SEARCH_LIMIT_HARD)
                : [];
              if (!slugs.length) return { error: "Aucun slug fourni", count: 0 };
              const { data } = await admin
                .from("businesses")
                .select("id,name,slug,city,neighborhood,address,main_category,categories,latitude,longitude,logo_url,images,hook_fr,google_rating,google_review_count,tripadvisor_rating,tripadvisor_review_count,engagements")
                .in("slug", slugs)
                .eq("is_active", true)
                .is("closure_message", null);
              const rows = (data || []).filter((b: any) => b.id !== host.id);
              const nonCompetitor = await filterOutCompetitors(rows);
              const withCoords = nonCompetitor.filter((b: any) => b.latitude != null && b.longitude != null);
              return {
                ok: true,
                count: withCoords.length,
                businesses: withCoords,
                title: args.title || null,
                instruction: "Carte rendue côté UI. Poursuis normalement.",
              };
            }
            if (name === "get_weather") {
              const city = args.city || host.city || "Marrakech";
              const { data, error } = await admin.functions.invoke("get-weather", { body: { city } });
              if (error) return { error: String(error), city };
              return { city, ...(data || {}) };
            }
          } catch (e) {
            return { error: String(e) };
          }
          return { error: "unknown tool" };
        };

        // Build conversation
        const system = buildSystemPrompt(host, language);
        const ownerTextSystem = ownerAiTexts.length
          ? [
              "SOURCE PROPRIÉTAIRE (textes rédigés/validés par l'établissement, liés à cette suggestion/relance).",
              "Appuie ta réponse sur ces textes en priorité, sans les recopier mot pour mot, et sans jamais citer de prix.",
              ...ownerAiTexts.map((t, i) =>
                `--- Texte ${i + 1}${t.title ? ` — ${t.title}` : ""}\n${t.hook ? `${t.hook}\n` : ""}${t.content.slice(0, 2000)}`,
              ),
            ].join("\n\n")
          : null;
        const convo: Msg[] = [
          { role: "system", content: system },
          ...(ownerTextSystem ? [{ role: "system" as const, content: ownerTextSystem }] : []),
          // Assistant turns are long (recommandations markdown) — 1200 chars suffisent au rappel contextuel.
          ...inMessages.map((m) => ({ role: m.role, content: String(m.content).slice(0, m.role === "user" ? 800 : 1200) })),
        ];

        let lastMapPayload: any = null;
        let lastEventsPayload: any = null;
        let lastDisclosureNote: string | null = null;
        let lastPoolIds: string[] | null = null;
        let lastPoolCity: string | null = null;
        const knownBusinesses: Array<{ id: string; slug: string | null; name: string }> = [];
        const toolsCalledLog: Array<{ name: string; args: any; result_count?: number; ok?: boolean }> = [];
        let hadError = false;
        let errorMsg: string | null = null;
        let finalText = "";

        const userMessage = (() => {
          for (let i = inMessages.length - 1; i >= 0; i--) {
            if (inMessages[i].role === "user") return String(inMessages[i].content || "").slice(0, 2000);
          }
          return "";
        })();

        // ── Classifieur B (spec §2) ────────────────────────────────────────
        // Le routage déterministe (classe A) renvoie "discover" comme fourre-tout :
        // tout message qu'aucun détecteur ne reconnaît y tombe. On lance alors le
        // classifieur B EN PARALLÈLE du tour (aucune latence ajoutée sur la
        // réponse) et on l'exploite au moment du log pour distinguer
        // search / business_qa / compare / itinerary / other.
        const deterministicRoute = inferEmbedRoute(userMessage);
        const classifierPromise = deterministicRoute === "discover" && userMessage.trim()
          ? classify(
              {
                message: userMessage,
                surface: "embed",
                focus: {
                  active_city: host.city || null,
                  last_business_names: inMessages.length > 1 ? [host.name] : undefined,
                } as any,
              },
              LOVABLE_API_KEY,
            ).catch(() => null)
          : Promise.resolve(null);


        const rememberSearchResult = (fname: string, fargs: any, result: any) => {
          const resCount = Array.isArray(result?.results)
            ? result.results.length
            : Array.isArray(result?.businesses)
              ? result.businesses.length
              : 0;
          toolsCalledLog.push({ name: fname, args: fargs, result_count: resCount, ok: !result?.error });

          if (fname === "search_businesses" && Array.isArray(result?.results)) {
            for (const b of result.results) {
              if (b?.id && b?.name) knownBusinesses.push({ id: b.id, slug: b.slug || null, name: b.name });
            }
            if (result?.disclosure_note) lastDisclosureNote = String(result.disclosure_note);
            // Include ALL results in the carousel payload; the map component
            // itself will only place markers for businesses with valid coords.
            // Previously we dropped coord-less rows here, which caused the
            // carousel to show fewer businesses than the disclosure announced
            // (e.g. "10 sur 30" but only 2 miniatures visible).
            if (result.results.length && !lastMapPayload) {
              lastMapPayload = { title: null, businesses: result.results };
            }
            if (Array.isArray(result?.pool_ids) && result.pool_ids.length) {
              lastPoolIds = result.pool_ids.map((x: any) => String(x)).filter(Boolean);
              lastPoolCity = String(result?.city || host.city || "Marrakech");
            }
          }
        };

        const logTurn = async (opts: { finalText: string; streamCompleted: boolean }) => {
          try {
            const t_end = Date.now();
            // Sortie du classifieur B (null si route déterministe A).
            const clf = await classifierPromise;
            const clfOut = clf?.output ?? null;
            const clfConfident = isConfident(clfOut, "embed");
            const intentToRoute: Record<string, string> = {
              search: "discover",
              business_qa: "business_qa",
              compare: "compare",
              itinerary: "itinerary",
              other: "smalltalk",
            };
            const routeTaken = clfOut && clfConfident
              ? (intentToRoute[clfOut.intent] || "discover")
              : deterministicRoute;
            // Classe : A si aucun LLM génératif ; sinon C. B seul = classifieur
            // exploité sans génération (cas rare sur embed, mais tracé fidèlement).
            const aiClass = llmUsed ? "C" : (clfOut && clfConfident ? "B" : "A");
            await admin.from("ai_conversation_turns").insert({
              chat_id: null,
              user_id: null,
              affiliate_id: null,
              user_message: userMessage,
              intent_classified: clfOut ? `classifier:${clfOut.intent}` : deterministicRoute,
              route_taken: routeTaken,
              surface: "embed",
              ai_class: aiClass,
              model: llmUsed || clfOut ? MODEL : null,
              classifier_confidence: clfOut ? clfOut.confidence : null,
              fallback_reason: hadError
                ? "route_failed"
                : (clfOut && !clfConfident ? "confidence_low" : null),
              tools_called: {
                business_id: host.id,
                business_slug: host.slug,
                business_name: host.name,
                session_id: sessionId,
                tools: toolsCalledLog,
                classifier: clfOut
                  ? {
                      intent: clfOut.intent,
                      category: clfOut.category,
                      exclude: clfOut.exclude,
                      city: clfOut.city,
                      confidence: clfOut.confidence,
                      threshold: getSurfaceConfig("embed").confidenceThreshold,
                      tokens_in: clf?.tokensIn ?? null,
                      tokens_out: clf?.tokensOut ?? null,
                      error: clf?.error ?? null,
                    }
                  : null,
              },
              latency_ms_total: t_end - t0,
              latency_ms_first_token: firstTokenAt ? firstTokenAt - t0 : null,
              latency_ms_synth: null,
              tokens_in: clf?.tokensIn ?? null,
              tokens_out: clf?.tokensOut ?? null,
              cost_usd: null,
              city_active: host.city || null,
              city_detected: clfOut?.city ?? null,

              results_count: knownBusinesses.length,
              results_shown: (lastMapPayload?.businesses?.length ?? 0) + (lastEventsPayload?.events?.length ?? 0),
              had_error: hadError,
              error_message: errorMsg,
              stream_completed: opts.streamCompleted,
              message_index: messageIndex,
              language,
            });
          } catch (e) {
            console.error("[embed-ai-chat] log_error", e);
          }

          // Persist a lightweight thread trace in ai_chats (kind='embed_ask').
          // We key the row by the client-provided sessionId (UUID). This lets the
          // backoffice inspect abandoned/completed conversations without depending
          // on any authenticated user.
          try {
            const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (sessionId && uuidRe.test(sessionId)) {
              const threadMessages = [
                ...inMessages.map((m) => ({ role: m.role, content: m.content })),
                { role: "assistant" as const, content: opts.finalText || "" },
              ];
              const title = (host.name ? String(host.name) : "Embed").slice(0, 120)
                + (userMessage ? ` — ${userMessage.slice(0, 60)}` : "");
              await admin
                .from("ai_chats")
                .upsert({
                  id: sessionId,
                  anon_token: sessionId,
                  user_id: null,
                  kind: "embed_ask",
                  title,
                  city: host.city || null,
                  messages: threadMessages,
                  updated_at: new Date().toISOString(),
                }, { onConflict: "id" });
            }
          } catch (e) {
            console.error("[embed-ai-chat] thread_persist_error", e);
          }
        };

        // Pinned business highlight — when the active suggestion has business_ids,
        // fetch their rich data (image, rating/20, default review, phone/whatsapp)
        // so the frontend can render a prominent contact card alongside the AI text.
        let pinnedBusinessCards: any[] | null = null;
        if (suggestionPinnedIds.length > 0) {
          try {
            const { data: pinnedRows } = await admin
              .from("businesses")
              .select("id, name, slug, city, neighborhood, phone, whatsapp, computed_rating, total_review_count, images")
              .in("id", suggestionPinnedIds);
            const { data: defReviews } = await admin
              .from("reviews")
              .select("business_id, author_name, rating, text, text_fr, text_en, text_ar, source")
              .in("business_id", suggestionPinnedIds)
              .eq("is_default", true)
              .neq("is_hidden", true);
            const revByBiz = new Map<string, any>();
            for (const r of defReviews || []) if (r?.business_id) revByBiz.set(String(r.business_id), r);
            const orderedRows = suggestionPinnedIds
              .map((id) => (pinnedRows || []).find((b: any) => b.id === id))
              .filter(Boolean) as any[];
            pinnedBusinessCards = orderedRows.map((b: any) => {
              const image = Array.isArray(b.images) && b.images.length ? b.images[0] : null;
              const rev = revByBiz.get(String(b.id));
              const reviewText = rev
                ? (language === "en" ? (rev.text_en || rev.text || rev.text_fr)
                  : language === "ar" ? (rev.text_ar || rev.text || rev.text_fr)
                  : (rev.text_fr || rev.text))
                : null;
              return {
                id: b.id,
                name: b.name,
                slug: b.slug,
                city: b.city,
                neighborhood: b.neighborhood,
                phone: b.phone,
                whatsapp: b.whatsapp,
                image,
                rating20: b.computed_rating != null ? Number(b.computed_rating) : null,
                review_count: b.total_review_count ?? null,
                review: rev
                  ? { author: rev.author_name, rating: rev.rating, text: reviewText, source: rev.source }
                  : null,
              };
            });
          } catch (e) {
            console.error("[embed-ai-chat] pinned_business_fetch_error", e);
          }
        }

        const emitTrailingMarkers = (): string => {
          const markers: string[] = [];
          if (lastMapPayload) {
            const safe = JSON.stringify(lastMapPayload).replace(/-->/g, "--&gt;");
            markers.push(`<!--SHOW_ON_MAP:${safe}-->`);
          }
          if (lastEventsPayload) {
            const safe = JSON.stringify(lastEventsPayload).replace(/-->/g, "--&gt;");
            markers.push(`<!--EVENTS_SNAPSHOT:${safe}-->`);
          }
          if (knownBusinesses.length) {
            const seen = new Set<string>();
            const dedup = knownBusinesses.filter((b) => (seen.has(b.id) ? false : (seen.add(b.id), true)));
            const safe = JSON.stringify(dedup).replace(/-->/g, "--&gt;");
            markers.push(`<!--KNOWN_BUSINESSES:${safe}-->`);
          }
          if (pinnedBusinessCards && pinnedBusinessCards.length) {
            const safe = JSON.stringify(pinnedBusinessCards).replace(/-->/g, "--&gt;");
            markers.push(`<!--PINNED_BUSINESS_CARDS:${safe}-->`);
          }
          if (lastPoolIds && lastPoolIds.length) {
            const safe = JSON.stringify({ ids: lastPoolIds, city: lastPoolCity }).replace(/-->/g, "--&gt;");
            markers.push(`<!--POOL_BUSINESS_IDS:${safe}-->`);
          }
          if (!markers.length) return "";
          const chunk = "\n\n" + markers.join("\n");
          emitDelta(chunk);
          return chunk;
        };

        // Followup with radius / mode
        let followupRadiusKm: number | null = null;
        let followupMode: string | null = null;
        if (followupId) {
          try {
            const { data: fu } = await admin
              .from("embed_ai_followups")
              .select("radius_km, mode")
              .eq("id", followupId)
              .maybeSingle();
            const rv = fu?.radius_km;
            if (rv != null && Number.isFinite(Number(rv)) && Number(rv) > 0) followupRadiusKm = Number(rv);
            followupMode = (fu?.mode as string | null) || null;
          } catch (e) {
            console.error("[embed-ai-chat] followup_lookup_error", e);
          }
        }

        const loadPriorBusinessIdsForThread = async (): Promise<string[]> => {
          const immediate = extractPriorKnownBusinessIds(inMessages, host.id);
          if (immediate.length) return immediate;

          const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!sessionId || !uuidRe.test(sessionId)) return [];

          try {
            const { data: trace } = await admin
              .from("ai_chats")
              .select("messages")
              .eq("id", sessionId)
              .maybeSingle();

            const rawMessages = (trace as any)?.messages;
            const rows: Msg[] = Array.isArray(rawMessages)
              ? rawMessages
                  .filter((m: any) => m && (m.role === "user" || m.role === "assistant"))
                  .map((m: any) => ({ role: m.role, content: String(m.content || "") }))
              : Array.isArray(rawMessages?.aiChat)
                ? rawMessages.aiChat
                    .filter((m: any) => m && (m.role === "user" || m.role === "assistant"))
                    .map((m: any) => ({ role: m.role, content: String(m.content || "") }))
                : [];

            return extractPriorKnownBusinessIds(rows, host.id);
          } catch (e) {
            console.error("[embed-ai-chat] prior_thread_lookup_error", e);
            return [];
          }
        };

        // Deterministic ONLINE BOOKING must run before blog/suggestion routing.
        // A follow-up like “On peut réserver en ligne ?” refers to the latest
        // visible result set, not to the active suggestion nor to the host.
        if (isBookingIntent(userMessage) || followupMode === "booking") {
          const priorIds = await loadPriorBusinessIdsForThread();
          if (priorIds.length) {
            const answer = await buildBookingForBusinesses(admin, priorIds, language);
            if (answer) {
              const priorRows = orderByIds(await fetchPriorFull(admin, priorIds), priorIds);
              if (priorRows.length) {
                lastMapPayload = { title: null, businesses: priorRows };
                for (const b of priorRows) {
                  if (b?.id && b?.name) knownBusinesses.push({ id: b.id, slug: b.slug || null, name: b.name });
                }
              }
              emitDelta(answer);
              const trailing = emitTrailingMarkers();
              finalText = answer + trailing;
              toolsCalledLog.push({ name: "booking_lookup", args: { scope: "previous_results", count: priorIds.length, early: true }, ok: true });
              endText();
              await logTurn({ finalText, streamCompleted: true });
              return;
            }
          }

          if (!deterministicSubcategoryNames && !deterministicBadgeIds && !suggestionPinnedIds.length && !suggestionMode) {
            const answer = buildBookingAnswer(host, language);
            emitDelta(answer);
            finalText = answer;
            toolsCalledLog.push({ name: "booking_lookup", args: { scope: "host", early: true }, ok: true });
            endText();
            await logTurn({ finalText, streamCompleted: true });
            return;
          }
        }

        // Deterministic WEATHER (early) — runs before blog grounding so a followup
        // like "Quelle est la météo prévue ?" always renders the immersive widget.
        if (isWeatherIntent(userMessage) || followupMode === "weather" || suggestionMode === "weather") {
          try {
            const city = host.city || "Marrakech";
            const { data, error } = await admin.functions.invoke("get-weather", { body: { city } });
            if (!error && data && !data.error) {
              const w = data as any;
              const cityName = w.city_name || city;
              const L = {
                fr: `Voici la météo à **${cityName}** ainsi que la tendance des 3 prochains jours. 👇`,
                en: `Here's the weather in **${cityName}** and the trend for the next 3 days. 👇`,
                ar: `إليك حالة الطقس في **${cityName}** والتوقعات للأيام الثلاثة القادمة. 👇`,
              }[language] || `Voici la météo à **${cityName}**. 👇`;
              const weatherJson = {
                city_name: cityName,
                temp: w.temp,
                feels_like: w.feels_like,
                temp_min: w.temp_min,
                temp_max: w.temp_max,
                humidity: w.humidity,
                wind_speed: w.wind_speed,
                description: w.description || "",
                icon: w.icon || "",
                hourly: Array.isArray(w.hourly) ? w.hourly.slice(0, 8) : [],
                daily: Array.isArray(w.daily) ? w.daily.slice(0, 3) : [],
              };
              const marker = `\n\n<!--WEATHER_FORECAST:${JSON.stringify(weatherJson)}-->`;
              emitDelta(L + marker);
              finalText = L + marker;
              toolsCalledLog.push({ name: "get_weather", args: { city, source: followupMode === "weather" ? "followup" : "intent" }, ok: true });
              endText();
              await logTurn({ finalText, streamCompleted: true });
              return;
            }
            console.error("[embed-ai-chat] weather_route_early_error", error || data?.error);
          } catch (e) {
            console.error("[embed-ai-chat] weather_route_early_exception", e);
          }
        }

        // ============= Blog grounding (hybrid) =============

        // If the last user message maps to a published blog article (by title
        // similarity), emit an ARTICLE_CARD marker AND — when no suggestion-forced
        // route is active — build a full immersive answer from the article's
        // curated entries (up to 10), so the user gets a real editorial listing
        // instead of a laconic "3 sur 3 trouvées" disclosure.
        {
          let blogRouteHandled = false;
          try {
            const lastUserMsg = uiMessages[uiMessages.length - 1];
            const lastUserText = lastUserMsg?.role === "user" ? extractTextFromUIMessage(lastUserMsg) : "";
            if (lastUserText && lastUserText.trim().length >= 6) {
              const posts = await fetchBlogPostsCached(admin);
              // Explicit staff link first (suggestion → blog_post_ids), semantic
              // detection only as a fallback for free-text follow-ups.
              const pinnedPosts = suggestionBlogIds
                .map((id) => posts.find((p) => p.id === id))
                .filter(Boolean) as BlogRow[];
              const match = pinnedPosts[0] || matchBlogArticle(lastUserText, language, posts, host.id, host.name);
              const extraPinned = pinnedPosts.slice(1);
              const emitExtraArticleCards = () => {
                for (const p of extraPinned) {
                  const t =
                    (language === "en" && p.title_en) ||
                    (language === "ar" && p.title_ar) ||
                    p.title_fr || p.title_en || p.title_ar || "";
                  const img = p.custom_hero_image_url || p.cover_image_url || null;
                  const payload = { id: p.id, slug: p.slug, title: t, image: img, hero: img, tldr: null, hook: null, intro: null, inline: false, isOwner: p.anchor_business_id === host.id };
                  emitDelta(`\n\n<!--ARTICLE_CARD:${JSON.stringify(payload)}-->\n\n`);
                }
              };
              if (match) {
                const title =
                  (language === "en" && match.title_en) ||
                  (language === "ar" && match.title_ar) ||
                  match.title_fr || match.title_en || match.title_ar || "";
                const image = match.custom_hero_image_url || match.cover_image_url || null;
                const tldr =
                  (language === "en" && ((match as any).tldr_en || (match as any).excerpt_en)) ||
                  (language === "ar" && ((match as any).tldr_ar || (match as any).excerpt_ar)) ||
                  (match as any).tldr_fr || (match as any).tldr_en || (match as any).tldr_ar ||
                  (match as any).excerpt_fr || (match as any).excerpt_en || (match as any).excerpt_ar || null;
                const hookText =
                  (language === "en" && (match as any).hero_subtitle_en) ||
                  (language === "ar" && (match as any).hero_subtitle_ar) ||
                  (match as any).hero_subtitle_fr || (match as any).hero_subtitle_en || (match as any).hero_subtitle_ar || null;
                const introText =
                  (language === "en" && (match as any).intro_en) ||
                  (language === "ar" && (match as any).intro_ar) ||
                  (match as any).intro_fr || (match as any).intro_en || (match as any).intro_ar || null;
                const articlePayload: any = {
                  id: match.id,
                  slug: match.slug,
                  title,
                  image,
                  hero: image,
                  tldr,
                  hook: hookText,
                  intro: introText,
                  inline: false,
                  isOwner: match.anchor_business_id === host.id,
                };

                // Blog editorial listing wins over the LLM narration whenever a
                // published article title clearly matches the user's message,
                // even if the suggestion click also forced badges/subcats — the
                // curated podium is what the user is actually after.
                // Curated proximity ("X à côté de Y") is still preserved
                // because it delivers its own two-entity carousel.
                if (!curatedProximity) {
                  const { data: full } = await admin
                    .from("blog_posts")
                    .select("entries_fr, entries_en, entries_ar, hero_subtitle_fr, hero_subtitle_en, hero_subtitle_ar, tldr_fr, tldr_en, tldr_ar, intro_fr, intro_en, intro_ar, excerpt_fr, excerpt_en, excerpt_ar")
                    .eq("id", match.id)
                    .maybeSingle();
                  if (full) {
                    for (const k of ["hero_subtitle_fr","hero_subtitle_en","hero_subtitle_ar","tldr_fr","tldr_en","tldr_ar","intro_fr","intro_en","intro_ar","excerpt_fr","excerpt_en","excerpt_ar"]) {
                      (match as any)[k] = (full as any)[k];
                    }
                    // Recompute payload fields from full row
                    articlePayload.tldr =
                      (language === "en" && ((full as any).tldr_en || (full as any).excerpt_en)) ||
                      (language === "ar" && ((full as any).tldr_ar || (full as any).excerpt_ar)) ||
                      (full as any).tldr_fr || (full as any).tldr_en || (full as any).tldr_ar ||
                      (full as any).excerpt_fr || (full as any).excerpt_en || (full as any).excerpt_ar || null;
                    articlePayload.hook =
                      (language === "en" && (full as any).hero_subtitle_en) ||
                      (language === "ar" && (full as any).hero_subtitle_ar) ||
                      (full as any).hero_subtitle_fr || (full as any).hero_subtitle_en || (full as any).hero_subtitle_ar || null;
                    articlePayload.intro =
                      (language === "en" && (full as any).intro_en) ||
                      (language === "ar" && (full as any).intro_ar) ||
                      (full as any).intro_fr || (full as any).intro_en || (full as any).intro_ar || null;
                  }
                  const entriesRaw: any[] =
                    (language === "en" && Array.isArray(full?.entries_en) && full!.entries_en.length ? full!.entries_en : null) ||
                    (language === "ar" && Array.isArray(full?.entries_ar) && full!.entries_ar.length ? full!.entries_ar : null) ||
                    (Array.isArray(full?.entries_fr) ? full!.entries_fr : []) as any[];
                  const entries = Array.isArray(entriesRaw) ? entriesRaw : [];
                  const businessIds = entries.map((e: any) => e?.id).filter(Boolean).slice(0, 12);

                  if (businessIds.length >= 3) {
                    const { data: bizRows } = await admin
                      .from("businesses")
                      .select("id, name, slug, city, neighborhood, main_category, categories, hook_fr, hook_en, hook_ar, latitude, longitude, logo_url, images, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, computed_rating, total_review_count, engagements, closure_message, is_active, is_featured, rating")
                      .in("id", businessIds)
                      .eq("is_active", true)
                      .is("closure_message", null);
                    const byId = new Map<string, any>((bizRows || []).map((b: any) => [b.id, b]));
                    // Pair each entry with its business, then sort the same way BlogArticleTemplate does:
                    // featured first, then rating desc, then review count desc, then name — keeping the
                    // article's original order as the stable fallback.
                    const paired = entries
                      .map((entry: any, originalIdx: number) => ({ entry, originalIdx, biz: byId.get(entry?.id) }))
                      .filter((p: any) => p.biz);
                    paired.sort((a: any, b: any) => {
                      const fa = a.biz?.is_featured ? 1 : 0;
                      const fb = b.biz?.is_featured ? 1 : 0;
                      if (fb !== fa) return fb - fa;
                      const ra = a.biz?.computed_rating ?? a.biz?.rating ?? -1;
                      const rb = b.biz?.computed_rating ?? b.biz?.rating ?? -1;
                      if (rb !== ra) return rb - ra;
                      const ca = a.biz?.total_review_count ?? 0;
                      const cb = b.biz?.total_review_count ?? 0;
                      if (cb !== ca) return cb - ca;
                      return a.originalIdx - b.originalIdx;
                    });
                    const orderedBiz = paired.map((p: any) => p.biz);
                    const orderedEntries = paired.map((p: any) => p.entry);

                    if (orderedBiz.length >= 3) {
                      const shown = orderedBiz.slice(0, Math.min(orderedBiz.length, 10));
                      const shownEntries = orderedEntries.slice(0, shown.length);
                      const shownIds = shown.map((b: any) => b.id);

                      // Fetch reviews: prefer is_default; fall back to first review per business.
                      const revByBiz = new Map<string, any>();
                      try {
                        const { data: defRevs } = await admin
                          .from("reviews")
                          .select("business_id, author_name, rating, text, text_fr, text_en, text_ar, source, is_default")
                          .in("business_id", shownIds)
                          .neq("is_hidden", true)
                          .order("is_default", { ascending: false });
                        for (const r of defRevs || []) {
                          const bid = String((r as any).business_id);
                          if (!revByBiz.has(bid)) revByBiz.set(bid, r);
                        }
                      } catch (_) { /* noop */ }

                      articlePayload.inline = true;
                      emitDelta(`\n\n<!--ARTICLE_CARD:${JSON.stringify(articlePayload)}-->\n\n`);

                      const cityForCopy = host.city || "Marrakech";
                      // Intro/hook/tldr are rendered by the frontend from the ARTICLE_CARD payload
                      // (hero + hook + En bref + intro). The streamed text bubble contains only the
                      // ranked entries + disclosure so the map can be inserted between the intro
                      // and the first result on the client.

                      const reviewsLabel = language === "en" ? "reviews" : language === "ar" ? "مراجعة" : "avis";
                      const anonLabel = language === "en" ? "Anonymous" : language === "ar" ? "مجهول" : "Anonyme";

                      const body = shown.map((biz: any, idx: number) => {
                        const entry = shownEntries[idx] || {};
                        const pretitle = stripText(entry.pretitle || "");
                        const rank = Number(entry.rank) || idx + 1;
                        const hook = stripText(entry.hook || "") ||
                          stripText(
                            language === "en" ? (biz.hook_en || biz.hook_fr || "") :
                            language === "ar" ? (biz.hook_ar || biz.hook_fr || "") :
                            (biz.hook_fr || biz.hook_en || "")
                          );
                        const paragraphs = Array.isArray(entry.paragraphs) && entry.paragraphs.length
                          ? entry.paragraphs.map((p: any) => stripText(String(p || ""))).filter(Boolean).join("\n\n")
                          : "";
                        const hours = stripText(entry.hours || "");
                        const area = pretitle || [biz.neighborhood, biz.city].filter(Boolean).join(" · ");
                        const detail = [hook, paragraphs].filter(Boolean).join("\n\n");
                        const hoursLine = hours ? `\n\n_${hours}_` : "";
                        const fallback = language === "en" ? "A curated One World Morocco address."
                          : language === "ar" ? "عنوان مختار ضمن دليل One World Morocco."
                          : "Une adresse sélectionnée dans le guide One World Morocco.";
                        // Rating + review count line
                        const rating20 = biz.computed_rating != null ? Number(biz.computed_rating) : null;
                        const revCount = biz.total_review_count ?? null;
                        const ratingLine = rating20 != null
                          ? `\n\n⭐ **${rating20.toFixed(1)}/20**${revCount ? ` · ${revCount.toLocaleString(language === "en" ? "en-US" : "fr-FR")} ${reviewsLabel}` : ""}`
                          : "";
                        // First review (default preferred)
                        const rev = revByBiz.get(String(biz.id));
                        const revText = rev
                          ? (language === "en" ? (rev.text_en || rev.text || rev.text_fr)
                            : language === "ar" ? (rev.text_ar || rev.text || rev.text_fr)
                            : (rev.text_fr || rev.text))
                          : null;
                        const revLine = revText
                          ? `\n\n> « ${stripText(String(revText))} »\n> — _${rev.author_name || anonLabel}${rev.source ? ` · ${rev.source}` : ""}_`
                          : "";
                        return `${rank}. **${biz.name}**${area ? ` — _${area}_` : ""}\n\n${detail || fallback}${ratingLine}${revLine}${hoursLine}`;
                      }).join("\n\n---\n\n");

                      const total = orderedBiz.length;
                      const disclosure = shown.length < total
                        ? (language === "en"
                            ? `📍 Showing **${shown.length}** of **${total}** picks from **${title}** in ${cityForCopy} — want me to keep going, focus on the top 3, or refine by neighborhood / vibe / budget?`
                            : language === "ar"
                              ? `📍 أعرض **${shown.length}** من **${total}** اختيارًا من **${title}** في ${cityForCopy} — هل أواصل، أو أركّز على أفضل 3، أو أُضيّق حسب الحي / الأجواء / الميزانية؟`
                              : `📍 Je te déroule **${shown.length}** adresses sur **${total}** issues de **${title}** à ${cityForCopy} — tu veux la suite, le podium en zoom, ou qu'on affine par quartier / ambiance / budget ?`)
                        : (language === "en"
                            ? `📍 That's the full **${title}** shortlist in ${cityForCopy} — say the word for the podium detailed, an alternative neighborhood, or the map view.`
                            : language === "ar"
                              ? `📍 هذه هي القائمة الكاملة **${title}** في ${cityForCopy} — أخبرني إن أردت تفصيل المنصة أو حيًا آخر أو عرض الخريطة.`
                              : `📍 Voici la sélection complète **${title}** à ${cityForCopy} — dis-moi si tu veux le podium détaillé, un autre quartier, ou la vue carte.`);

                      for (const b of shown) {
                        if (b?.id && b?.name) knownBusinesses.push({ id: b.id, slug: b.slug || null, name: b.name });
                      }
                      const mapBusinesses = shown.map((b: any) => ({
                        id: b.id, slug: b.slug, name: b.name, city: b.city, neighborhood: b.neighborhood,
                        address: null, main_category: b.main_category,
                        categories: Array.isArray(b.categories) ? b.categories : [],
                        latitude: b.latitude, longitude: b.longitude, logo_url: b.logo_url,
                        images: Array.isArray(b.images) ? b.images : [],
                        google_rating: b.google_rating, google_review_count: b.google_review_count,
                        tripadvisor_rating: b.tripadvisor_rating, tripadvisor_review_count: b.tripadvisor_review_count,
                        engagements: b.engagements,
                      }));
                      lastMapPayload = { title, businesses: mapBusinesses };

                      const answer = `${body}\n\n${disclosure}`;
                      emitDelta(answer);
                      const trailing = emitTrailingMarkers();
                      toolsCalledLog.push({ name: "blog_article_route", args: { slug: match.slug, shown: shown.length, total }, ok: true });
                      endText();
                      await logTurn({ finalText: answer + trailing, streamCompleted: true });
                      blogRouteHandled = true;
                    }
                  }
                }

                if (!blogRouteHandled) {
                  emitDelta(`\n\n<!--ARTICLE_CARD:${JSON.stringify(articlePayload)}-->\n\n`);
                  emitExtraArticleCards();
                }
              }
            }
          } catch (e) {
            console.error("[embed-ai-chat] blog_grounding_error", e);
          }
          if (blogRouteHandled) return;
        }



        // Deterministic: MAP REPLAY — the user asks to see the previous results on a map.
        // We do NOT re-run any search. We reuse the last <!--SHOW_ON_MAP:...--> payload
        // emitted in a previous assistant turn and re-attach it to a short reply.
        const isMapReplayIntent = (t: string): boolean => {
          const n = normalize(t);
          if (!n) return false;
          if (/(sur (?:une |la )?carte|voir sur (?:la |une )?carte|montre[rz]?[- ]moi.*carte|affiche.*carte|resultats?.*carte|carte des resultats?)/i.test(n)) return true;
          if (/(on (?:a |the )?map|show (?:them |these |the )?(?:results? )?on (?:a |the )?map|view on map|map view)/i.test(n)) return true;
          if (/(على (?:ال)?خريطة|في (?:ال)?خريطة|أرني.*خريطة)/.test(t)) return true;
          return false;
        };

        // Deterministic: WEATHER — appelle get-weather directement pour la ville de l'établissement hôte.
        if (isWeatherIntent(userMessage)) {
          try {
            const city = host.city || "Marrakech";
            const { data, error } = await admin.functions.invoke("get-weather", { body: { city } });
            if (!error && data && !data.error) {
              const w = data as any;
              const cityName = w.city_name || city;

              const L = {
                fr: `Voici la météo à **${cityName}** ainsi que la tendance des 3 prochains jours. 👇`,
                en: `Here's the weather in **${cityName}** and the trend for the next 3 days. 👇`,
                ar: `إليك حالة الطقس في **${cityName}** والتوقعات للأيام الثلاثة القادمة. 👇`,
              }[language] || `Voici la météo à **${cityName}**. 👇`;

              const weatherJson = {
                city_name: cityName,
                temp: w.temp,
                feels_like: w.feels_like,
                temp_min: w.temp_min,
                temp_max: w.temp_max,
                humidity: w.humidity,
                wind_speed: w.wind_speed,
                description: w.description || "",
                icon: w.icon || "",
                hourly: Array.isArray(w.hourly) ? w.hourly.slice(0, 8) : [],
                daily: Array.isArray(w.daily) ? w.daily.slice(0, 3) : [],
              };
              const marker = `\n\n<!--WEATHER_FORECAST:${JSON.stringify(weatherJson)}-->`;

              emitDelta(L + marker);
              finalText = L + marker;
              toolsCalledLog.push({ name: "get_weather", args: { city }, ok: true });

              endText();
              await logTurn({ finalText, streamCompleted: true });
              return;
            }
            console.error("[embed-ai-chat] weather_route_error", error || data?.error);
          } catch (e) {
            console.error("[embed-ai-chat] weather_route_exception", e);
          }
          // fall through to LLM if weather fetch failed
        }

        if (isMapReplayIntent(userMessage)) {
          // Walk backwards through prior assistant messages to find a SHOW_ON_MAP marker.
          let mapJson: any = null;
          for (let i = inMessages.length - 1; i >= 0; i--) {
            const m = inMessages[i];
            if (m.role !== "assistant") continue;
            const match = String(m.content || "").match(/<!--SHOW_ON_MAP:([\s\S]*?)-->/);
            if (match) {
              try { mapJson = JSON.parse(match[1].replace(/--&gt;/g, "-->")); } catch { /* */ }
              if (mapJson) break;
            }
          }
          if (mapJson && Array.isArray(mapJson.businesses) && mapJson.businesses.length) {
            lastMapPayload = mapJson;
            for (const b of mapJson.businesses) {
              if (b?.id && b?.name) knownBusinesses.push({ id: b.id, slug: b.slug || null, name: b.name });
            }
            const n = mapJson.businesses.length;
            const reply = language === "en"
              ? `Here are the **${n}** previous results plotted on the map — tap a marker to open its card.`
              : language === "ar"
                ? `إليك **${n}** من النتائج السابقة على الخريطة — انقر على العلامة لفتح بطاقة العنوان.`
                : `Voici les **${n}** résultats précédents replacés sur la carte — clique sur un marqueur pour ouvrir la fiche.`;
            emitDelta(reply);
            finalText = reply + emitTrailingMarkers();
            toolsCalledLog.push({ name: "map_replay", args: { count: n }, ok: true });
            endText();
            await logTurn({ finalText, streamCompleted: true });
            return;
          }
          // No prior map payload — fall through to normal flow.
        }

        // Deterministic: SHOW MORE — the user asks to see the remaining results
        // from the last search (pool_ids). We re-fetch the un-shown businesses
        // and render them with the same immersive template. No LLM.
        const isShowMoreIntent = (t: string): boolean => {
          const n = normalize(t);
          if (!n) return false;
          if (/\b(montre|montrer|montre[- ]moi|affiche|donne|voir|vois|liste)\b[^\.]*\b(les? )?(autres?|suivants?|restants?|reste)\b/i.test(n)) return true;
          if (/^\s*(les? )?(autres?|suivants?|reste|restants?)\s*[!\.\?]*\s*$/i.test(n)) return true;
          if (/\b(show|see|list|give)\b[^\.]*\b(the )?(others?|rest|remaining|more)\b/i.test(n)) return true;
          if (/^\s*(the )?(others?|more|rest)\s*[!\.\?]*\s*$/i.test(n)) return true;
          if (/(الباقي|البقية|الأخرى|المزيد)/.test(t)) return true;
          return false;
        };
        if (isShowMoreIntent(userMessage)) {
          // Walk back for the most recent POOL_BUSINESS_IDS marker.
          let poolInfo: { ids: string[]; city: string } | null = null;
          for (let i = inMessages.length - 1; i >= 0; i--) {
            const m = inMessages[i];
            if (m.role !== "assistant") continue;
            const match = String(m.content || "").match(/<!--POOL_BUSINESS_IDS:([\s\S]*?)-->/);
            if (match) {
              try {
                const parsed = JSON.parse(match[1].replace(/--&gt;/g, "-->"));
                if (Array.isArray(parsed?.ids) && parsed.ids.length) {
                  poolInfo = { ids: parsed.ids.map((x: any) => String(x)), city: String(parsed?.city || host.city || "Marrakech") };
                }
              } catch { /* */ }
              if (poolInfo) break;
            }
          }
          if (poolInfo) {
            // Compute already-shown IDs from prior KNOWN_BUSINESSES / SHOW_ON_MAP markers.
            const shownSet = new Set<string>();
            for (const m of inMessages) {
              if (m.role !== "assistant") continue;
              const c = String(m.content || "");
              const kb = c.match(/<!--KNOWN_BUSINESSES:([\s\S]*?)-->/);
              if (kb) {
                try {
                  const arr = JSON.parse(kb[1].replace(/--&gt;/g, "-->"));
                  if (Array.isArray(arr)) for (const b of arr) if (b?.id) shownSet.add(String(b.id));
                } catch { /* */ }
              }
              const som = c.match(/<!--SHOW_ON_MAP:([\s\S]*?)-->/);
              if (som) {
                try {
                  const obj = JSON.parse(som[1].replace(/--&gt;/g, "-->"));
                  if (Array.isArray(obj?.businesses)) for (const b of obj.businesses) if (b?.id) shownSet.add(String(b.id));
                } catch { /* */ }
              }
            }
            const remainingIds = poolInfo.ids.filter((id) => !shownSet.has(id));
            if (remainingIds.length) {
              const nextIds = remainingIds.slice(0, 10);
              try {
                const { data: rows } = await admin
                  .from("businesses")
                  .select("id, name, slug, city, neighborhood, main_category, hook_fr, hook_en, hook_ar, description, description_en, description_ar, latitude, longitude, logo_url, images, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, computed_rating, total_review_count, min_price, manual_price_range, phone, whatsapp")
                  .in("id", nextIds);
                const ordered = Array.isArray(rows)
                  ? nextIds.map((id) => rows.find((r: any) => String(r.id) === id)).filter(Boolean) as any[]
                  : [];
                if (ordered.length) {
                  const totalFound = poolInfo.ids.length;
                  const priorShownCount = shownSet.size;
                  const newShownCount = priorShownCount + ordered.length;
                  const city = poolInfo.city;
                  const disclosure = language === "en"
                    ? `📍 Here are **${ordered.length}** more addresses (${newShownCount} of ${totalFound} shown in ${city}) — tell me if you want to refine by area, mood or vibe.`
                    : language === "ar"
                      ? `📍 إليك **${ordered.length}** عناوين إضافية (${newShownCount} من ${totalFound} في ${city}) — أخبرني إذا أردت التصفية حسب الحي أو الأجواء.`
                      : `📍 Voici **${ordered.length}** adresses supplémentaires (${newShownCount} sur ${totalFound} montrées à ${city}) — dis-moi si tu veux affiner par quartier, ambiance ou envie.`;
                  const wrapped = {
                    results: ordered.map((b: any) => ({
                      id: b.id, name: b.name, slug: b.slug, city: b.city, neighborhood: b.neighborhood,
                      main_category: b.main_category, hook_fr: b.hook_fr, hook_en: b.hook_en, hook_ar: b.hook_ar,
                      description: b.description, description_en: b.description_en, description_ar: b.description_ar,
                      latitude: b.latitude, longitude: b.longitude,
                      logo_url: b.logo_url ?? null,
                      images: Array.isArray(b.images) ? b.images : [],
                      google_rating: b.google_rating ?? null,
                      google_review_count: b.google_review_count ?? null,
                      tripadvisor_rating: b.tripadvisor_rating ?? null,
                      tripadvisor_review_count: b.tripadvisor_review_count ?? null,
                      computed_rating: b.computed_rating ?? null,
                      total_review_count: b.total_review_count ?? null,
                      price_range: b.manual_price_range || (b.min_price ? `${b.min_price}+ MAD` : null),
                    })),
                    total_shown: ordered.length,
                    total_found: totalFound,
                    city,
                    disclosure_note: disclosure,
                    proximity_active: false,
                    radius_km_used: null,
                    radius_expanded: false,
                    pool_ids: poolInfo.ids,
                  };
                  // Populate markers so the frontend renders the carousel + map.
                  lastMapPayload = { title: null, businesses: wrapped.results };
                  for (const b of wrapped.results) {
                    if (b?.id && b?.name) knownBusinesses.push({ id: b.id, slug: b.slug || null, name: b.name });
                  }
                  lastPoolIds = poolInfo.ids;
                  lastPoolCity = city;
                  const answer = buildImmersiveBusinessAnswer(wrapped, host, userMessage, language);
                  emitDelta(answer);
                  finalText = answer + emitTrailingMarkers();
                  toolsCalledLog.push({ name: "show_more", args: { new_count: ordered.length, remaining: remainingIds.length - ordered.length }, ok: true });
                  endText();
                  await logTurn({ finalText, streamCompleted: true });
                  return;
                }
              } catch (e) {
                console.error("[embed-ai-chat] show_more_error", e);
              }
            } else {
              // Everything already shown.
              const reply = language === "en"
                ? `You've already seen all **${poolInfo.ids.length}** results from the previous search — want me to refine by area, mood, or open now?`
                : language === "ar"
                  ? `لقد رأيت بالفعل جميع النتائج (**${poolInfo.ids.length}**) من البحث السابق — هل تريد التصفية حسب الحي أو الأجواء؟`
                  : `Tu as déjà vu les **${poolInfo.ids.length}** résultats de la recherche précédente — tu veux affiner par quartier, ambiance, ou n'afficher que les lieux ouverts maintenant ?`;
              emitDelta(reply);
              finalText = reply + emitTrailingMarkers();
              toolsCalledLog.push({ name: "show_more", args: { exhausted: true }, ok: true });
              endText();
              await logTurn({ finalText, streamCompleted: true });
              return;
            }
          }
          // No pool available — fall through to normal flow.
        }

        // Deterministic: HOURS RANKING — "quel est le premier à ouvrir / dernier à fermer ?"
        // Operates only on the previous turn's results; no LLM, no fallback if no priors.
        {
          const rankMode: "opens_first" | "closes_last" | null =
            isOpensFirstIntent(userMessage) ? "opens_first"
            : isClosesLastIntent(userMessage) ? "closes_last"
            : null;
          if (rankMode) {
            const priorIds = extractPriorKnownBusinessIds(inMessages, host.id);
            let answer: string | null = null;
            if (priorIds.length) {
              answer = await buildHoursRanking(admin, priorIds, rankMode, language);
            }
            if (!answer) {
              answer = rankMode === "opens_first"
                ? (language === "en" ? `I don't have a previous list to rank by opening time yet. Ask me for a category first (e.g. "cafés in Guéliz") and I'll tell you which one opens the earliest.`
                  : language === "ar" ? `ليست لديّ قائمة سابقة لأرتّبها حسب وقت الفتح. اطلب فئة أولًا وسأخبرك أيّها يفتح أبكر.`
                  : `Je n'ai pas encore de liste précédente à classer par heure d'ouverture. Demande-moi d'abord une catégorie (ex. « les cafés à Guéliz ») et je te dirai lequel ouvre le plus tôt.`)
                : (language === "en" ? `I don't have a previous list to rank by closing time yet. Ask me for a category first (e.g. "rooftops in Guéliz") and I'll tell you which one closes the latest.`
                  : language === "ar" ? `ليست لديّ قائمة سابقة لأرتّبها حسب وقت الإغلاق. اطلب فئة أولًا وسأخبرك أيّها يغلق متأخرًا.`
                  : `Je n'ai pas encore de liste précédente à classer par heure de fermeture. Demande-moi d'abord une catégorie (ex. « les rooftops à Guéliz ») et je te dirai lequel ferme le plus tard.`);
            }
            emitDelta(answer);
            toolsCalledLog.push({ name: "hours_ranking", args: { mode: rankMode, count: priorIds.length }, ok: true });
            endText();
            await logTurn({ finalText: answer, streamCompleted: true });
            return;
          }
        }

        // Deterministic: DISTANCE LIST — "quelles sont les distances depuis X ?"
        {
          if (isDistanceListIntent(userMessage)) {
            const priorIds = extractPriorKnownBusinessIds(inMessages, host.id);
            if (priorIds.length) {
              const answer = await buildDistanceList(admin, host, priorIds, language);
              if (answer) {
                emitDelta(answer);
                toolsCalledLog.push({ name: "distance_list", args: { count: priorIds.length }, ok: true });
                endText();
                await logTurn({ finalText: answer, streamCompleted: true });
                return;
              }
            }
          }
        }

        // Deterministic: DISTANCE RANKING — "le plus proche / le plus loin"
        {
          const mode = isDistanceRankingIntent(userMessage);
          if (mode) {
            const priorIds = extractPriorKnownBusinessIds(inMessages, host.id);
            if (priorIds.length) {
              const answer = await buildDistanceRanking(admin, host, priorIds, mode, language);
              if (answer) {
                emitDelta(answer);
                toolsCalledLog.push({ name: "distance_ranking", args: { mode, count: priorIds.length }, ok: true });
                endText();
                await logTurn({ finalText: answer, streamCompleted: true });
                return;
              }
            }
          }
        }

        // Deterministic: RATING RANKING — "le mieux noté / le plus d'avis"
        {
          const mode = isRatingRankingIntent(userMessage);
          if (mode) {
            const priorIds = extractPriorKnownBusinessIds(inMessages, host.id);
            if (priorIds.length) {
              const answer = await buildRatingRanking(admin, priorIds, mode, language);
              if (answer) {
                emitDelta(answer);
                toolsCalledLog.push({ name: "rating_ranking", args: { mode, count: priorIds.length }, ok: true });
                endText();
                await logTurn({ finalText: answer, streamCompleted: true });
                return;
              }
            }
          }
        }

        // Deterministic: OPEN-NOW / OPEN-DURING-SLOT filter on prior results.
        {
          const filterIntent = parseOpenFilterIntent(userMessage);
          if (filterIntent) {
            const priorIds = extractPriorKnownBusinessIds(inMessages, host.id);
            if (priorIds.length) {
              const answer = await buildOpenFilter(admin, priorIds, filterIntent, language);
              if (answer) {
                emitDelta(answer);
                toolsCalledLog.push({ name: "open_filter", args: { intent: filterIntent, count: priorIds.length }, ok: true });
                endText();
                await logTurn({ finalText: answer, streamCompleted: true });
                return;
              }
            }
          }
        }

        // Deterministic: ORDINAL PICK — "le premier / le 2ème / les 3 premiers / le dernier"
        {
          const prior = extractPriorOrderedBusinesses(inMessages, host.id);
          if (prior.length) {
            const idx = parseOrdinalIntent(userMessage, prior.length);
            if (idx && idx.length) {
              const answer = buildOrdinalPick(prior, idx, language);
              emitDelta(answer);
              toolsCalledLog.push({ name: "ordinal_pick", args: { indices: idx }, ok: true });
              endText();
              await logTurn({ finalText: answer, streamCompleted: true });
              return;
            }
          }
        }

        // Deterministic: COUNT — "combien ?"
        if (isCountIntent(userMessage)) {
          const prior = extractPriorOrderedBusinesses(inMessages, host.id);
          if (prior.length) {
            const answer = buildCountAnswer(prior.length, language);
            emitDelta(answer);
            toolsCalledLog.push({ name: "count_priors", args: { count: prior.length }, ok: true });
            endText();
            await logTurn({ finalText: answer, streamCompleted: true });
            return;
          }
        }

        // Deterministic: DESCRIBE PRIORS — "détaille / décris / types de cuisine / dis m'en plus…"
        if (isDescribeIntent(userMessage)) {
          const priorIds = extractPriorKnownBusinessIds(inMessages, host.id);
          if (priorIds.length) {
            const facet = parseDescribeFacet(userMessage);
            const answer = await buildDescribePriors(admin, priorIds, facet, language, host);
            if (answer) {
              emitDelta(answer);
              toolsCalledLog.push({ name: "describe_priors", args: { facet, count: priorIds.length }, ok: true });
              endText();
              await logTurn({ finalText: answer, streamCompleted: true });
              return;
            }
          }
        }

        // Deterministic: ENGAGEMENT / CERTIFICATION / COMMODITÉ FILTER on priors.
        // Ex: "livraison glovo", "vegan", "wifi", "clef verte", "b-corp",
        //     "commerce équitable", "accessible pmr", "paiement cash"…
        {
          const priorIdsForEng = extractPriorKnownBusinessIds(inMessages, host.id);
          if (priorIdsForEng.length) {
            const { data: engRows } = await admin
              .from("businesses")
              .select("id, name, slug, city, neighborhood, address, main_category, categories, latitude, longitude, logo_url, images, hook_fr, hook_en, hook_ar, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, computed_rating, total_review_count, engagements")
              .in("id", priorIdsForEng);
            const rows = Array.isArray(engRows) ? engRows : [];
            const matched = matchEngagementsFromPriors(userMessage, rows);
            if (matched.length) {
              const matchedNorm = new Set(matched.map((m) => normalize(m)));
              const filtered = rows.filter((r: any) =>
                (r.engagements || []).some((e: string) => matchedNorm.has(normalize(stripEngPrefix(e))))
              );
              if (filtered.length) {
                const priorOrder = new Map(priorIdsForEng.map((id, i) => [id, i]));
                filtered.sort((a: any, b: any) => (priorOrder.get(a.id) ?? 999) - (priorOrder.get(b.id) ?? 999));
                const shown = filtered.slice(0, 10);
                const badges = matched.slice(0, 4).map((m) => `\`${m}\``).join(" · ");
                const hookFor = (b: any) =>
                  language === "en" ? (b.hook_en || b.hook_fr) :
                  language === "ar" ? (b.hook_ar || b.hook_fr) : b.hook_fr;
                const intro =
                  language === "en"
                    ? `Filtering previous picks on ${badges}:`
                    : language === "ar"
                      ? `تصفية النتائج السابقة حسب ${badges}:`
                      : `Je filtre les résultats précédents sur ${badges} :`;
                const lines = shown.map((b: any, i: number) => {
                  const hk = String(hookFor(b) || "").trim();
                  const own = (b.engagements || [])
                    .map((e: string) => stripEngPrefix(e))
                    .filter((raw: string) => matchedNorm.has(normalize(raw)));
                  const tagLine = own.length ? ` — ${own.map((t: string) => `\`${t}\``).join(" · ")}` : "";
                  return `${i + 1}. **${b.name}**${tagLine}${hk ? `\n${hk}` : ""}`;
                });
                const closing = language === "en"
                  ? `\n\nWant me to narrow further, or broaden to the full city?`
                  : language === "ar"
                    ? `\n\nهل تريد التصفية أكثر أو التوسيع على المدينة كاملة؟`
                    : `\n\nTu veux affiner encore, ou réélargir à toute la ville ?`;
                const answer = `${intro}\n\n${lines.join("\n\n")}${closing}${toMapMarker(shown)}`;
                emitDelta(answer);
                toolsCalledLog.push({ name: "engagement_filter_priors", args: { matched, count: filtered.length }, ok: true });
                endText();
                await logTurn({ finalText: answer, streamCompleted: true });
                return;
              }
            }
          }
        }
        // Deterministic: CITY-WIDE ENGAGEMENT / COMMODITÉ / CERTIFICATION SEARCH.
        // Ex: "tous les commerçants de la ville qui ont la livraison glovo"
        if (isCityEngagementSearchIntent(userMessage)) {
          try {
            const answer = await buildCityEngagementSearch(admin, host, userMessage, language);
            if (answer) {
              emitDelta(answer.text);
              finalText = answer.text + answer.markers;
              toolsCalledLog.push({ name: "city_engagement_search", args: { city: host.city || "Marrakech" }, ok: true });
              endText();
              await logTurn({ finalText, streamCompleted: true });
              return;
            }
          } catch (e) {
            console.error("[embed-ai-chat] city_engagement_search_error", e);
          }
        }

        // Short refinement like "à Guéliz", "dans hivernage", "en Palmeraie"
        // (with typo tolerance via neighborhoods.keywords / aliases DB).
        // Two behaviors:
        //  (A) Same neighborhood as host or matches a prior → filter priors.
        //  (B) Different neighborhood + root suggestion scope available →
        //      SCOPE BROADEN: drop proximity, rerun subcats/badges in that quartier.
        {
          const nq = normalize(userMessage);
          const words = nq.split(/\s+/).filter(Boolean);
          const looksLikeRefinement = words.length <= 6 || /\b(quartier|dans|a|en|sur|au|aux|vers|cote|coté|neighborhood|district|in|at|near)\b/.test(nq);

          if (looksLikeRefinement) {
            const detected = await detectNeighborhoodInText(admin, host.city, userMessage);
            if (detected) {
              const matchedHood = detected.name;
              const nn = normalize(matchedHood);
              const priorIdsForHood = extractPriorKnownBusinessIds(inMessages, host.id);

              // Try prior-filter first (behavior A).
              let filteredHood: any[] = [];
              let rowsHood: any[] = [];
              if (priorIdsForHood.length >= 2) {
                const { data: priorRowsHood } = await admin
                  .from("businesses")
                  .select("id, name, slug, city, neighborhood, latitude, longitude, main_category, categories, address, hook_fr, hook_en, hook_ar, logo_url, images, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, computed_rating, engagements")
                  .in("id", priorIdsForHood);
                rowsHood = Array.isArray(priorRowsHood) ? priorRowsHood : [];
                filteredHood = rowsHood.filter((r: any) => normalize(r.neighborhood) === nn);
              }

              const hostHoodN = normalize(host.neighborhood || "");
              const isDifferentFromHost = hostHoodN && nn !== hostHoodN;
              const hasRootScope = !!(deterministicSubcategoryNames?.length || deterministicBadgeIds?.length);

              // (B) SCOPE BROADEN: different neighborhood + root suggestion scope,
              // OR prior filter yielded nothing but we can rerun the root scope.
              if (hasRootScope && (isDifferentFromHost || filteredHood.length === 0)) {
                const forcedArgs: any = {
                  query: matchedHood,
                  city: host.city || "Marrakech",
                  neighborhood: matchedHood,
                  limit: 12,
                };
                if (deterministicSubcategoryNames) forcedArgs._subcategoryNames = deterministicSubcategoryNames;
                if (deterministicBadgeIds) forcedArgs._badgeIds = deterministicBadgeIds;
                // Explicitly: no proximity anchor → we widen the scope.
                const forcedResult = await runTool("search_businesses", forcedArgs);
                rememberSearchResult("search_businesses", forcedArgs, forcedResult);
                if (Array.isArray(forcedResult?.results) && forcedResult.results.length) {
                  const finalTextLocal = buildImmersiveBusinessAnswer(forcedResult, host, userMessage, language);
                  emitDelta(finalTextLocal);
                  const trailing = emitTrailingMarkers();
                  toolsCalledLog.push({ name: "neighborhood_scope_broaden", args: { neighborhood: matchedHood, count: forcedResult.results.length, alias: detected.matchedAlias }, ok: true });
                  endText();
                  await logTurn({ finalText: finalTextLocal + trailing, streamCompleted: true });
                  return;
                }
                // Broaden ran but found nothing → emit an explicit no-result
                // message and STOP. Do not fall through: falling through would
                // keep the previous map/markers, giving the impression the
                // assistant is "stuck" on the old results.
                lastMapPayload = null;
                const noneMsg =
                  language === "en"
                    ? `I couldn't find matches in **${matchedHood}** for this request. Want to try another neighborhood, or broaden across ${host.city || "Marrakech"}?`
                    : language === "ar"
                      ? `لم أجد نتائج في **${matchedHood}** لهذا الطلب. هل تريد تجربة حي آخر أو التوسيع على ${host.city || "مراكش"}؟`
                      : `Je n'ai pas trouvé de résultats à **${matchedHood}** pour cette demande. Tu veux essayer un autre quartier ou élargir sur ${host.city || "Marrakech"} ?`;
                emitDelta(noneMsg);
                const trailingNone = emitTrailingMarkers();
                toolsCalledLog.push({ name: "neighborhood_scope_broaden", args: { neighborhood: matchedHood, count: 0, alias: detected.matchedAlias }, ok: true });
                endText();
                await logTurn({ finalText: noneMsg + trailingNone, streamCompleted: true });
                return;
              }

              // (A) PRIOR FILTER on the matched neighborhood.
              if (filteredHood.length) {
                const priorOrder = new Map(priorIdsForHood.map((id, i) => [id, i]));
                filteredHood.sort((a: any, b: any) => (priorOrder.get(a.id) ?? 999) - (priorOrder.get(b.id) ?? 999));
                const shown = filteredHood.slice(0, 10);
                const hookFor = (b: any) =>
                  language === "en" ? (b.hook_en || b.hook_fr) :
                  language === "ar" ? (b.hook_ar || b.hook_fr) : b.hook_fr;
                const intro =
                  language === "en"
                    ? `Here are the previous picks located in **${matchedHood}**:`
                    : language === "ar"
                      ? `إليك العناوين السابقة الموجودة في **${matchedHood}**:`
                      : `Voici les adresses des résultats précédents situées à **${matchedHood}** :`;
                const lines = shown.map((b: any) => {
                  const hk = String(hookFor(b) || "").trim();
                  return hk ? `- **${b.name}** — ${hk}` : `- **${b.name}**`;
                });
                const disclosure = buildDisclosureFromCounts(shown.length, filteredHood.length, host.city || "Marrakech");
                const closing =
                  language === "en"
                    ? `\n\nWant me to narrow further by vibe or moment of the day, or widen back to the full city?`
                    : language === "ar"
                      ? `\n\nهل تريد التصفية أكثر حسب الأجواء أو التوقيت، أو توسيع النطاق للمدينة كاملة؟`
                      : `\n\nTu veux affiner par ambiance / moment de la journée, ou réélargir à toute la ville ?`;
                const answer = `${intro}\n\n${lines.join("\n")}\n\n${disclosure}${closing}`;
                const mapBusinesses = shown.map((b: any) => ({
                  id: b.id, name: b.name, slug: b.slug, city: b.city, neighborhood: b.neighborhood,
                  address: b.address, main_category: b.main_category, categories: b.categories,
                  latitude: b.latitude, longitude: b.longitude,
                  logo_url: b.logo_url ?? null,
                  images: Array.isArray(b.images) ? b.images : [],
                  hook_fr: b.hook_fr, hook_en: b.hook_en, hook_ar: b.hook_ar,
                  google_rating: b.google_rating ?? null,
                  google_review_count: b.google_review_count ?? null,
                  tripadvisor_rating: b.tripadvisor_rating ?? null,
                  tripadvisor_review_count: b.tripadvisor_review_count ?? null,
                  engagements: Array.isArray(b.engagements) ? b.engagements : [],
                }));
                lastMapPayload = { title: `${matchedHood}`, businesses: mapBusinesses };
                emitDelta(answer);
                const trailing = emitTrailingMarkers();
                toolsCalledLog.push({ name: "neighborhood_filter_priors", args: { neighborhood: matchedHood, count: filteredHood.length, alias: detected.matchedAlias }, ok: true });
                endText();
                await logTurn({ finalText: answer + trailing, streamCompleted: true });
                return;
              }
            }
          }
        }



        // Deterministic: HOURS — read opening_hours directly from DB, gated by show_opening_hours.



        if (isHoursIntent(userMessage)) {
          // 1) If the previous assistant turn returned a list of results (KNOWN_BUSINESSES marker),
          //    the follow-up "Consulter les horaires" refers to those results — not to the host.
          const priorIds = extractPriorKnownBusinessIds(inMessages, host.id);
          if (priorIds.length) {
            const answer = await buildHoursForBusinesses(admin, priorIds, language);
            if (answer) {
              emitDelta(answer);
              toolsCalledLog.push({ name: "hours_lookup", args: { scope: "previous_results", count: priorIds.length }, ok: true });
              endText();
              await logTurn({ finalText: answer, streamCompleted: true });
              return;
            }
          }
          // 2) Fallback: hours of the host business.
          const answer = buildHoursAnswer(host, language);
          if (answer) {
            emitDelta(answer);
            toolsCalledLog.push({ name: "hours_lookup", args: { scope: "host", show: !!host.show_opening_hours }, ok: true });
            endText();
            await logTurn({ finalText: answer, streamCompleted: true });
            return;
          }
        }

        // Deterministic: TWO-ENTITY PROXIMITY (curated only) — the active
        // suggestion must carry proximity_a_* AND proximity_b_* mappings.
        // Free-text "A à côté d'un B" is intentionally NOT handled here;
        // it falls through to search_businesses via the LLM.
        {
          let built: Awaited<ReturnType<typeof buildTwoEntityProximityCurated>> | null = null;
          const strict = parseInlineRadiusKm(userMessage) != null;
          if (curatedProximity) {
            const intent: TwoEntityIntent = {
              aTerms: [suggestionLabel || "A"],
              bTerm: suggestionLabel || "B",
              radiusKm: parseInlineRadiusKm(userMessage) ?? 1,
            };
            built = await buildTwoEntityProximityCurated(admin, host, intent, language, strict, curatedProximity);
          }

          if (built) {
            const forcedResult = {
              results: built.results,
              total_found: built.results.length,
              city: host.city || "Marrakech",
              proximity_active: true,
              radius_km_used: built.radiusUsed,
              radius_expanded: built.radiusExpanded,
              disclosure_note: null,
            };
            rememberSearchResult("search_businesses", {
              _twoEntity: true,
              aTerms: built.aTerms,
              bTerm: built.bTerm,
              radius_km: built.radiusUsed,
            }, forcedResult);
            emitDelta(built.text);
            const trailing = emitTrailingMarkers();
            toolsCalledLog.push({ name: "two_entity_proximity", args: { aTerms: built.aTerms, bTerm: built.bTerm, radius_km: built.radiusUsed, count: built.results.length, curated: !!curatedProximity }, ok: true });
            endText();
            await logTurn({ finalText: built.text + trailing, streamCompleted: true });
            return;
          }
        }


        // Deterministic: POI-only nearby
        if (followupMode === "poi_nearby") {
          const radiusKm = followupRadiusKm ?? 1;
          const answer = await buildPoiNearby(admin, host, language, radiusKm);
          if (answer) {
            emitDelta(answer);
            toolsCalledLog.push({ name: "poi_nearby", args: { lat: host.latitude, lng: host.longitude, radius_km: radiusKm, source: "followup" }, ok: true });
            endText();
            await logTurn({ finalText: answer, streamCompleted: true });
            return;
          }
        }

        // Deterministic: nearby overview
        // Skip when the suggestion carries a deterministic filter (badge/subcategory)
        // — those must route through search_businesses with an immersive intro + carousel.
        const forcedNearby = followupRadiusKm != null;
        const hasDeterministicFilter = !!(deterministicBadgeIds?.length || deterministicSubcategoryNames?.length);
        if ((forcedNearby || isNearbyOverviewIntent(userMessage, host.name)) && !hasDeterministicFilter) {
          // If the thread already has prior results, treat "à proximité de {host}" as a
          // FILTER on those priors, sorted closest → farthest — not a fresh nearby search.
          const priorIdsForProximity = extractPriorKnownBusinessIds(inMessages, host.id);
          if (priorIdsForProximity.length >= 2) {
            const answer = await buildDistanceList(admin, host, priorIdsForProximity, language);
            if (answer) {
              emitDelta(answer);
              const trailing = emitTrailingMarkers();
              toolsCalledLog.push({ name: "proximity_filter_priors", args: { count: priorIdsForProximity.length }, ok: true });
              endText();
              await logTurn({ finalText: answer + trailing, streamCompleted: true });
              return;
            }
          }
          const radiusKm = followupRadiusKm ?? 1;
          const overview = await buildNearbyOverview(admin, host, hostCategoryNames, language, radiusKm);
          if (overview) {
            emitDelta(overview);
            toolsCalledLog.push({ name: "nearby_overview", args: { lat: host.latitude, lng: host.longitude, radius_km: radiusKm, source: forcedNearby ? "followup" : "intent" }, ok: true });
            endText();
            await logTurn({ finalText: overview, streamCompleted: true });
            return;
          }
        }


        // Deterministic: DESTINATIONS — the active suggestion has linked destinations.
        // We list them as clickable cards with immersive text and distance from the host.
        if (suggestionDestinationIds.length > 0) {
          try {
            const { data: destsRaw } = await admin
              .from("destinations")
              .select("id, name_fr, name_en, name_ar, hook_fr, hook_en, hook_ar, description_fr, description_en, description_ar, image_url, images, latitude, longitude")
              .in("id", suggestionDestinationIds);
            const hostLat = Number(host.latitude);
            const hostLng = Number(host.longitude);
            const hasHostCoords = Number.isFinite(hostLat) && Number.isFinite(hostLng);
            const toRad = (v: number) => (v * Math.PI) / 180;
            const kmBetween = (aLat: number, aLng: number, bLat: number, bLng: number) => {
              const R = 6371;
              const dLat = toRad(bLat - aLat);
              const dLng = toRad(bLng - aLng);
              const s =
                Math.sin(dLat / 2) ** 2 +
                Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
              return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
            };
            const pick = <T,>(fr: T, en: T, ar: T): T =>
              language === "en" ? (en ?? fr) : language === "ar" ? (ar ?? fr) : fr;
            const stripHtml = (s: any) =>
              String(s ?? "")
                .replace(/<br\s*\/?>/gi, " ")
                .replace(/<\/(p|div|li|h[1-6])>/gi, " ")
                .replace(/<[^>]+>/g, " ")
                .replace(/&nbsp;/gi, " ")
                .replace(/&amp;/gi, "&")
                .replace(/&(lt|gt|quot|#39);/gi, (_m, e) => ({ lt: "<", gt: ">", quot: '"', "#39": "'" } as any)[e])
                .replace(/\s+/g, " ")
                .trim();
            const dests = (destsRaw || []).map((d: any) => {
              const name = pick(d.name_fr, d.name_en, d.name_ar) || d.name_fr;
              const hook = stripHtml(pick(d.hook_fr, d.hook_en, d.hook_ar) || d.hook_fr) || null;
              const description = stripHtml(pick(d.description_fr, d.description_en, d.description_ar) || d.description_fr) || null;
              const image =
                d.image_url ||
                (Array.isArray(d.images) && d.images.length > 0 ? d.images[0] : null);
              let distKm: number | null = null;
              if (hasHostCoords && Number.isFinite(Number(d.latitude)) && Number.isFinite(Number(d.longitude))) {
                distKm = kmBetween(hostLat, hostLng, Number(d.latitude), Number(d.longitude));
              }
              return {
                id: d.id,
                name,
                hook,
                description,
                image,
                latitude: d.latitude,
                longitude: d.longitude,
                distKm,
              };
            });
            // Sort by distance if available, else keep suggestion order
            if (hasHostCoords) {
              dests.sort((a, b) => (a.distKm ?? Infinity) - (b.distKm ?? Infinity));
            } else {
              const order = new Map(suggestionDestinationIds.map((id, i) => [id, i]));
              dests.sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999));
            }

            const fmtDist = (km: number | null) => {
              if (km == null) return null;
              return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
            };

            const hostName = host.name || "";
            const intro =
              language === "en"
                ? `Here are ${dests.length} day-trip destinations you can reach from **${hostName}** — sorted by distance, closest first. Each name is clickable: tap it to open an immersive page with photos, context, and the excursion providers we've curated on the spot.`
                : language === "ar"
                ? `إليك ${dests.length} وجهة لرحلة يومية انطلاقاً من **${hostName}** — مرتبة حسب المسافة، الأقرب أولاً. كل اسم قابل للنقر: اضغط عليه لفتح صفحة غامرة بالصور والسياق ومزودي الرحلات الذين اخترناهم على الأرض.`
                : `Voici ${dests.length} destinations d'excursion à la journée au départ de **${hostName}** — classées par distance, la plus proche d'abord. Chaque nom est cliquable : ouvre une fiche immersive avec photos, contexte et les prestataires que nous avons sélectionnés sur place.`;

            const lines: string[] = [intro, ""];
            for (const d of dests.slice(0, 10)) {
              const dist = fmtDist(d.distKm);
              const raw = (d.hook || d.description || "").toString().trim();
              // Longer immersive teaser: up to ~450 chars, cut on last sentence boundary.
              let teaser = raw.slice(0, 480);
              if (raw.length > 480) {
                const lastDot = Math.max(teaser.lastIndexOf(". "), teaser.lastIndexOf("… "), teaser.lastIndexOf("! "), teaser.lastIndexOf("? "));
                if (lastDot > 180) teaser = teaser.slice(0, lastDot + 1);
                else teaser = teaser.replace(/[,;:\s]+$/, "") + "…";
              }
              const distTag = dist
                ? language === "en"
                  ? ` — ${dist} away`
                  : language === "ar"
                  ? ` — على بعد ${dist}`
                  : ` — à ${dist}`
                : "";
              lines.push(`**${d.name}**${distTag}${teaser ? ` — ${teaser}` : ""}`);
              lines.push("");
            }
            const closing =
              language === "en"
                ? `Tap any bolded name above to open its immersive page, or ask me for excursion providers linked to a specific spot.`
                : language === "ar"
                ? `اضغط على أي اسم بارز أعلاه لفتح صفحته الغامرة، أو اسألني عن مزودي الرحلات لموقع محدد.`
                : `Clique sur un nom en gras ci-dessus pour ouvrir la fiche immersive, ou demande-moi les prestataires d'excursions liés à un lieu précis.`;
            lines.push(closing);

            const answer = lines.join("\n");
            emitDelta(answer);

            // Emit DESTINATION_CARDS marker for the UI carousel
            const cardsPayload = {
              title: suggestionLabel || null,
              destinations: dests.slice(0, 20).map((d) => ({
                id: d.id,
                name: d.name,
                hook: d.hook,
                image: d.image,
                latitude: d.latitude,
                longitude: d.longitude,
                distKm: d.distKm,
              })),
            };
            const safe = JSON.stringify(cardsPayload).replace(/-->/g, "--&gt;");
            const marker = `\n\n<!--DESTINATION_CARDS:${safe}-->`;
            emitDelta(marker);

            toolsCalledLog.push({ name: "destinations_list", args: { count: dests.length }, ok: true });
            endText();
            await logTurn({ finalText: answer + marker, streamCompleted: true });
            return;
          } catch (e) {
            console.error("[embed-ai-chat] destinations_route_error", e);
            // fall through to other routes
          }
        }

        // Deterministic: DIRECT VIEWER (suggestion mode = 'direct_viewer').
        // Show only the pinned business_ids in the defined order — no search, no LLM.
        if (suggestionMode === "direct_viewer") {
          try {
            const ids = suggestionPinnedIds.length ? suggestionPinnedIds : [];
            if (!ids.length) {
              const empty = language === "en"
                ? `No businesses were pinned for this suggestion.`
                : language === "ar"
                  ? `لم يتم تثبيت أي منشآت لهذا الاقتراح.`
                  : `Aucun établissement n'a été ciblé pour cette suggestion.`;
              emitDelta(empty);
              endText();
              await logTurn({ finalText: empty, streamCompleted: true });
              return;
            }
            const { data: rows } = await admin
              .from("businesses")
              .select("id, name, slug, city, neighborhood, address, main_category, categories, latitude, longitude, logo_url, images, hook_fr, hook_en, hook_ar, description, description_en, description_ar, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, computed_rating, total_review_count, engagements, is_featured")
              .in("id", ids)
              .eq("is_active", true);
            const ordered = ids
              .map((id) => (rows || []).find((b: any) => b.id === id))
              .filter(Boolean) as any[];
            if (!ordered.length) {
              const empty = language === "en"
                ? `The pinned businesses are no longer available.`
                : language === "ar"
                  ? `المنشآت المثبتة لم تعد متاحة.`
                  : `Les établissements ciblés ne sont plus disponibles.`;
              emitDelta(empty);
              endText();
              await logTurn({ finalText: empty, streamCompleted: true });
              return;
            }
            const wrapped = { results: ordered, city: host.city || "Marrakech", total_found: ordered.length };
            rememberSearchResult("search_businesses", { _direct_viewer: true, ids }, wrapped);
            const answer = buildImmersiveBusinessAnswer(wrapped, host, userMessage, language);
            emitDelta(answer);
            const trailing = emitTrailingMarkers();
            toolsCalledLog.push({ name: "direct_viewer", args: { count: ordered.length }, ok: true });
            endText();
            await logTurn({ finalText: answer + trailing, streamCompleted: true });
            return;
          } catch (e) {
            console.error("[embed-ai-chat] direct_viewer_error", e);
          }
        }

        // NOTE: 'structure_front' mode intentionally falls through to the normal
        // pipeline (nearby overview / search_businesses via the classifier) — no
        // forced citywide bypass here.


        // Deterministic: events search (suggestion mode = 'events')

        if (suggestionMode === "events") {
          // Compute a "this weekend" window: from today → next Sunday (+7 max)
          const today = new Date();
          const dow = today.getDay(); // 0=Sun ... 6=Sat
          const daysUntilSun = (7 - dow) % 7 || 7;
          const from = today.toISOString().slice(0, 10);
          const to = new Date(today.getTime() + daysUntilSun * 86400000).toISOString().slice(0, 10);
          const forcedArgs: any = { city: host.city || "Marrakech", from_date: from, to_date: to, limit: 10 };
          const forcedResult = await runTool("search_events", forcedArgs);
          rememberSearchResult("search_events", forcedArgs, forcedResult);
          if (Array.isArray((forcedResult as any)?.results) && (forcedResult as any).results.length) {
            lastEventsPayload = { title: null, city: (forcedResult as any).city || null, events: (forcedResult as any).results };
          }
          const events = Array.isArray((forcedResult as any)?.results) ? (forcedResult as any).results : [];
          const answer = buildEventsWeekendAnswer(events, host, host.city || "Marrakech", from, to, language);
          emitDelta(answer);
          const trailing = emitTrailingMarkers();
          toolsCalledLog.push({ name: "events_weekend", args: { city: host.city, from, to, count: events.length }, ok: true });
          endText();
          await logTurn({ finalText: answer + trailing, streamCompleted: true });
          return;
        }

        if (deterministicSubcategoryNames || deterministicBadgeIds) {
          const forcedArgs: any = { query: userMessage, city: host.city || "Marrakech", limit: 12 };
          if (deterministicSubcategoryNames) forcedArgs._subcategoryNames = deterministicSubcategoryNames;
          if (deterministicBadgeIds) forcedArgs._badgeIds = deterministicBadgeIds;
          if (isProximityIntent(userMessage) && Number.isFinite(Number(host.latitude)) && Number.isFinite(Number(host.longitude))) {
            const inlineR = parseInlineRadiusKm(userMessage);
            forcedArgs._anchorLat = Number(host.latitude);
            forcedArgs._anchorLng = Number(host.longitude);
            forcedArgs._radiusKm = inlineR ?? followupRadiusKm ?? 1;
            if (inlineR != null) forcedArgs._strictRadius = true;
          }
          const forcedResult = await runTool("search_businesses", forcedArgs);
          rememberSearchResult("search_businesses", forcedArgs, forcedResult);
          const pinnedNames = suggestionPinnedIds
            .map((id) => forcedResult?.results?.find((b: any) => b?.id === id)?.name)
            .filter(Boolean);
          const routeDesc = [
            deterministicSubcategoryNames ? `sous-catégories ${deterministicSubcategoryNames.join(", ")}` : null,
            deterministicBadgeIds ? `${deterministicBadgeIds.length} badge(s)` : null,
          ].filter(Boolean).join(" + ");
          if (Array.isArray(forcedResult?.results) && forcedResult.results.length) {
            finalText = buildImmersiveBusinessAnswer(forcedResult, host, userMessage, language);
            emitDelta(finalText);
            finalText += emitTrailingMarkers();
            endText();
            await logTurn({ finalText, streamCompleted: true });
            return;
          }
          {
            const city = host.city || "Marrakech";
            const empty = language === "ar"
              ? `📍 لم أعثر على نتائج في ${city} لهذا البحث — أخبرني إن كنت تريد أن أعيد الصياغة أو أوسّع النطاق.`
              : language === "en"
              ? `📍 No results found in ${city} for this search — tell me if you want me to rephrase or widen the area.`
              : `📍 Aucun résultat trouvé à ${city} pour cette recherche — dis-moi si tu veux que je reformule ou que j'élargisse autour de ${city}.`;
            finalText = empty;
            emitDelta(finalText);
            finalText += emitTrailingMarkers();
            endText();
            await logTurn({ finalText, streamCompleted: true });
            return;
          }
        } else if (shouldForceDirectorySearch(userMessage)) {
          const forcedArgs: any = { query: userMessage, city: host.city || "Marrakech", limit: 12 };
          if (isProximityIntent(userMessage) && Number.isFinite(Number(host.latitude)) && Number.isFinite(Number(host.longitude))) {
            const inlineR = parseInlineRadiusKm(userMessage);
            forcedArgs._anchorLat = Number(host.latitude);
            forcedArgs._anchorLng = Number(host.longitude);
            forcedArgs._radiusKm = inlineR ?? followupRadiusKm ?? 1;
            if (inlineR != null) forcedArgs._strictRadius = true;
          }
          const forcedResult = await runTool("search_businesses", forcedArgs);
          rememberSearchResult("search_businesses", forcedArgs, forcedResult);
          const pinnedNames = suggestionPinnedIds
            .map((id) => forcedResult?.results?.find((b: any) => b?.id === id)?.name)
            .filter(Boolean);
          if (Array.isArray(forcedResult?.results) && forcedResult.results.length) {
            finalText = buildImmersiveBusinessAnswer(forcedResult, host, userMessage, language);
            emitDelta(finalText);
            finalText += emitTrailingMarkers();
            endText();
            await logTurn({ finalText, streamCompleted: true });
            return;
          }
          {
            const city = host.city || "Marrakech";
            const empty = language === "ar"
              ? `📍 لم أعثر على نتائج في ${city} لهذا البحث — أخبرني إن كنت تريد أن أعيد الصياغة أو أوسّع النطاق.`
              : language === "en"
              ? `📍 No results found in ${city} for this search — tell me if you want me to rephrase or widen the area.`
              : `📍 Aucun résultat trouvé à ${city} pour cette recherche — dis-moi si tu veux que je reformule ou que j'élargisse autour de ${city}.`;
            finalText = empty;
            emitDelta(finalText);
            finalText += emitTrailingMarkers();
            endText();
            await logTurn({ finalText, streamCompleted: true });
            return;
          }
        }

        // When results are already forced deterministically (events / badge / subcategory /
        // directory search), skip the tool loop entirely and stream directly. The tool
        // loop otherwise gave the LLM room to skip the immersive intro and only echo the
        // disclosure_note.
        const hasForcedResults =
          !!(deterministicSubcategoryNames || deterministicBadgeIds) ||
          shouldForceDirectorySearch(userMessage);

        if (hasForcedResults) {
          try {
            const gateway = createLovableAiGatewayProvider(LOVABLE_API_KEY);
            llmUsed = true;
            const model = gateway(MODEL);
            const systemText = convo
              .filter((m) => m.role === "system")
              .map((m) => String(m.content || ""))
              .join("\n\n---\n\n");
            const result = streamText({
              model,
              system: systemText,
              messages: convertToModelMessages(
                convo
                  .filter((m) => m.role === "user" || m.role === "assistant")
                  .map((m) => ({
                    role: m.role as any,
                    parts: [{ type: "text", text: String(m.content || "") }],
                  })) as any,
              ),
              ...(IS_GPT5
                ? { providerOptions: { lovable: { reasoningEffort: "none" } } }
                : { temperature: 0.4 }),
            });
            for await (const delta of result.textStream) {
              finalText += delta;
              emitDelta(delta);
            }
          } catch (streamErr) {
            hadError = true;
            errorMsg = String(streamErr).slice(0, 500);
            console.error("[embed-ai-chat] forced_stream_error", streamErr);
            if (!finalText) {
              const fallback = language === "en"
                ? "I found the matching One World Morocco results, but I couldn't format the full answer this time. Please try again in a moment."
                : language === "ar"
                  ? "وجدت النتائج المطابقة في One World Morocco، لكن لم أتمكن من صياغة الإجابة الكاملة الآن. يرجى المحاولة بعد قليل."
                  : "J'ai trouvé les résultats correspondants One World Morocco, mais je n'ai pas pu formuler la réponse complète cette fois-ci. Réessaie dans un instant.";
              finalText = fallback;
              emitDelta(fallback);
            }
          }

          if (lastDisclosureNote) {
            const hasDisclosure = /\bsur\s+\d+\s+trouv/i.test(finalText) || finalText.includes(lastDisclosureNote);
            if (!hasDisclosure) {
              const injection = `\n\n${lastDisclosureNote}`;
              emitDelta(injection);
              finalText += injection;
            }
          }

          finalText += emitTrailingMarkers();
          endText();
          await logTurn({ finalText, streamCompleted: !hadError });
          return;
        }

        // Tool loop (up to MAX_ROUNDS). Non-stream rounds via direct gateway fetch
        // (keeps the existing tool_calls JSON contract). Final round streamed via AI SDK.
        const effectiveRounds = MAX_ROUNDS;
        for (let round = 0; round < effectiveRounds; round++) {
          const isLast = round === effectiveRounds - 1;
          const resp = await fetch(GATEWAY, {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify(normalizeGatewayBodyForModel({
              model: MODEL,
              messages: convo,
              tools: isLast ? undefined : TOOLS,
              tool_choice: isLast ? undefined : "auto",
              temperature: 0.7,
              stream: false,
            })),
          });
          if (!resp.ok) {
            const errTxt = await resp.text().catch(() => "");
            hadError = true;
            errorMsg = `gateway_${resp.status}: ${errTxt.slice(0, 200)}`;
            emitDelta(`\n\n_Erreur passerelle (${resp.status})._`);
            endText();
            await logTurn({ finalText: "", streamCompleted: false });
            return;
          }
          const json = await resp.json();
          const choice = json?.choices?.[0];
          const msg = choice?.message || {};
          const toolCalls: any[] = Array.isArray(msg.tool_calls) ? msg.tool_calls : [];

          if (toolCalls.length && !isLast) {
            convo.push({ role: "assistant", content: msg.content || "", tool_calls: toolCalls });
            let searchBusinessesResult: any = null;
            for (const tc of toolCalls) {
              const fname = tc.function?.name;
              let fargs: any = {};
              try { fargs = JSON.parse(tc.function?.arguments || "{}"); } catch { /* */ }
              const result = await runTool(fname, fargs);
              rememberSearchResult(fname, fargs, result);
              if (fname === "search_businesses" && Array.isArray((result as any)?.results) && (result as any).results.length) {
                searchBusinessesResult = result;
              }
              if (fname === "show_on_map" && (result as any)?.ok && Array.isArray((result as any).businesses)) {
                const incoming = (result as any).businesses as any[];
                // Do NOT shrink an existing carousel: if search_businesses already
                // returned e.g. 10 results and the LLM only cites 2 via show_on_map,
                // keep the full list so miniatures match the disclosure ("10 sur 30").
                const existingCount = Array.isArray(lastMapPayload?.businesses) ? lastMapPayload.businesses.length : 0;
                if (incoming.length >= existingCount) {
                  lastMapPayload = { title: (result as any).title || null, businesses: incoming };
                } else if (lastMapPayload) {
                  // Preserve prior list, just update the title if the LLM provided one.
                  lastMapPayload = { title: (result as any).title || lastMapPayload.title || null, businesses: lastMapPayload.businesses };
                }
                for (const b of incoming) {
                  if (b?.id && b?.name) knownBusinesses.push({ id: b.id, slug: b.slug || null, name: b.name });
                }
              }
              if (fname === "search_events" && Array.isArray((result as any)?.results) && (result as any).results.length) {
                lastEventsPayload = { title: null, city: (result as any).city || null, events: (result as any).results };
              }
              convo.push({
                role: "tool",
                tool_call_id: tc.id,
                content: JSON.stringify(result).slice(0, 12000),
              });
            }

            // Short-circuit: once search_businesses returned real results, the LLM
            // often echoes only the laconic disclosure_note in the next round
            // (e.g. "Je te présente 10 adresses sur 19 trouvées à Marrakech")
            // instead of the immersive listing. Deterministically build the full
            // answer — immersive intro + one paragraph per result (bold clickable
            // name) + disclosure + closing question — matching the forced-directory
            // path. Populate lastMapPayload so miniatures match the listing.
            if (searchBusinessesResult) {
              const rows: any[] = Array.isArray(searchBusinessesResult.results) ? searchBusinessesResult.results : [];
              if (rows.length) {
                lastDisclosureNote = String(searchBusinessesResult.disclosure_note || lastDisclosureNote || "");
                if (!lastMapPayload || (Array.isArray(lastMapPayload?.businesses) && lastMapPayload.businesses.length < rows.length)) {
                  lastMapPayload = { title: null, businesses: rows };
                }
                for (const b of rows) {
                  if (b?.id && b?.name) knownBusinesses.push({ id: b.id, slug: b.slug || null, name: b.name });
                }
                const answer = buildImmersiveBusinessAnswer(searchBusinessesResult, host, userMessage, language);
                finalText = answer;
                emitDelta(answer);
                finalText += emitTrailingMarkers();
                endText();
                await logTurn({ finalText, streamCompleted: true });
                return;
              }
            }
            continue;
          }

          // Final round → stream via AI SDK
          try {
            const gateway = createLovableAiGatewayProvider(LOVABLE_API_KEY);
            llmUsed = true;
            const model = gateway(MODEL);
            // IMPORTANT: pass system messages via the `system` option, not inside `messages`.
            // The AI SDK does not reliably forward system messages nested in `messages`,
            // which caused the LLM to skip the immersive intro / paragraph format and
            // echo only the disclosure_note.
            const systemText = convo
              .filter((m) => m.role === "system")
              .map((m) => String(m.content || ""))
              .join("\n\n---\n\n");
            const result = streamText({
              model,
              system: systemText,
              messages: convertToModelMessages(
                convo
                  .filter((m) => m.role === "user" || m.role === "assistant")
                  .map((m) => ({
                    role: m.role as any,
                    parts: [{ type: "text", text: String(m.content || "") }],
                  })) as any,
              ),
              ...(IS_GPT5
                ? { providerOptions: { lovable: { reasoningEffort: "none" } } }
                : { temperature: hasForcedResults ? 0.4 : 0.7 }),

            });
            for await (const delta of result.textStream) {
              finalText += delta;
              emitDelta(delta);
            }
          } catch (streamErr) {
            const fallback = String(msg.content || "");
            if (fallback) { emitDelta(fallback); finalText = fallback; }
            console.error("[embed-ai-chat] stream_error", streamErr);
          }

          // Inject disclosure if missing
          if (lastDisclosureNote) {
            const hasDisclosure = /\bsur\s+\d+\s+trouv/i.test(finalText) || finalText.includes(lastDisclosureNote);
            if (!hasDisclosure) {
              const injection = `\n\n${lastDisclosureNote}`;
              emitDelta(injection);
              finalText += injection;
            }
          }

          finalText += emitTrailingMarkers();
          endText();
          await logTurn({ finalText, streamCompleted: true });
          return;
        }

        endText();
        await logTurn({ finalText: "", streamCompleted: false });
      },
      onError: (err) => {
        console.error("[embed-ai-chat] stream_execute_error", err);
        return String((err as Error)?.message || err);
      },
    });

    return createUIMessageStreamResponse({ stream, headers: corsHeaders });
  } catch (e) {
    console.error("[embed-ai-chat] fatal", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

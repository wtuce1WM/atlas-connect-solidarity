import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { resolveWithAdmin, resolutionMetric } from "../_shared/taxonomy-resolver.ts";

// Global accent-stripping helper — used everywhere for consistent normalization
const stripAccentsGlobal = (s: string): string => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// Detect superlative keywords that indicate the user wants results sorted by rating
function detectSuperlative(query: string): boolean {
  const superlatives = [
    "meilleur", "meilleurs", "meilleure", "meilleures",
    "top", "best", "le plus note", "les plus notes",
    "le mieux note", "les mieux notes",
    "le plus recommande", "les plus recommandes",
    "le plus populaire", "les plus populaires",
  ];
  const lower = stripAccentsGlobal(query.toLowerCase());
  return superlatives.some(s => lower.includes(s));
}

// Sources prises en compte pour la note pondérée et le total d'avis
const RATING_SOURCES: Array<{ rating: keyof Business; count: keyof Business }> = [
  { rating: "google_rating", count: "google_review_count" },
  { rating: "tripadvisor_rating", count: "tripadvisor_review_count" },
  { rating: "restaurant_guru_rating", count: "restaurant_guru_review_count" },
  { rating: "getyourguide_rating", count: "getyourguide_review_count" },
  { rating: "viator_rating", count: "viator_review_count" },
  { rating: "avis_verifies_rating", count: "avis_verifies_review_count" },
  { rating: "trustpilot_rating", count: "trustpilot_review_count" },
  { rating: "tourradar_rating", count: "tourradar_review_count" },
];

// Seuil minimum d'avis cumulés pour être pris en compte dans le tri par note
const MIN_REVIEWS_FOR_RATING_SORT = 10;

/**
 * Note pondérée par le nombre d'avis, normalisée sur /20.
 * Renvoie -1 si l'établissement a moins de MIN_REVIEWS_FOR_RATING_SORT avis cumulés
 * (afin qu'il soit relégué en fin de tri par note).
 */
function getBestRating(b: Business): number {
  let totalCount = 0;
  let weightedSum = 0;
  for (const { rating, count } of RATING_SOURCES) {
    const r = (b[rating] as number | null | undefined) ?? 0;
    const c = (b[count] as number | null | undefined) ?? 0;
    if (r > 0 && c > 0) {
      weightedSum += (r / 5) * 20 * c;
      totalCount += c;
    }
  }
  if (totalCount < MIN_REVIEWS_FOR_RATING_SORT) return -1;
  return weightedSum / totalCount;
}

// Rerank metadata stored for logging
let lastRerankMeta: { latencyMs: number; before: string[]; after: string[]; movements: { name: string; diff: number }[] } | null = null;

// LLM re-ranking: reorder candidates by semantic relevance to the query
async function llmRerank(query: string, candidates: Business[]): Promise<Business[]> {
  if (candidates.length <= 1) return candidates;

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return candidates;

  const top = candidates.slice(0, 20);

  const candidateList = top.map((b, i) => ({
    rank: i,
    name: b.name,
    city: b.city ?? "",
    main_category: b.main_category ?? "",
    categories: (b.categories ?? []).join(", "),
    services: (b.services ?? []).slice(0, 8).join(", "),
  }));

  const prompt = `Tu es un moteur de classement pour un annuaire d'entreprises au Maroc.
Requête : "${query}"
Classe ces établissements du plus pertinent au moins pertinent.
Critères de pertinence (par ordre d'importance) :
1. Correspondance directe avec le TYPE d'établissement recherché
2. Services spécifiques qui matchent la requête
3. Localisation (ville/quartier mentionné dans la requête)
4. Catégorie principale correspondante

${candidateList.map(c => `[${c.rank}] ${c.name} | ${c.city} | ${c.main_category} | cat: ${c.categories} | services: ${c.services}`).join("\n")}

Réponds UNIQUEMENT avec les indices entre crochets dans l'ordre, ex: [2],[0],[4],[1],[3]`;

  try {
    const startMs = Date.now();
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300,
        temperature: 0,
      }),
    });

    const latencyMs = Date.now() - startMs;

    if (!response.ok) {
      console.warn(`LLM rerank HTTP error: ${response.status} (${latencyMs}ms)`);
      return candidates;
    }

    const data = await response.json();
    const content: string = data.choices?.[0]?.message?.content ?? "";
    const matches = [...content.matchAll(/\[(\d+)\]/g)];
    const orderedIndices = matches.map(m => parseInt(m[1])).filter(i => i >= 0 && i < top.length);
    if (orderedIndices.length === 0) {
      console.warn(`LLM rerank: no valid indices parsed from: "${content}" (${latencyMs}ms)`);
      return candidates;
    }

    const rerankedTop = orderedIndices.map(i => top[i]);
    const missingFromTop = top.filter((_, i) => !orderedIndices.includes(i));
    const remainder = candidates.slice(20);

    // Detailed before/after log
    const beforeNames = top.map((b, i) => `${i + 1}. ${b.name}`).join(" | ");
    const afterList = [...rerankedTop, ...missingFromTop];
    const afterNames = afterList.map((b, i) => `${i + 1}. ${b.name}`).join(" | ");
    const movementDetails = orderedIndices.map((origIdx, newIdx) => {
      const diff = origIdx - newIdx;
      if (diff === 0) return null;
      return { name: top[origIdx].name, diff };
    }).filter(Boolean) as { name: string; diff: number }[];
    const movements = movementDetails.map(m => `"${m.name}" ${m.diff > 0 ? `↑${m.diff}` : `↓${Math.abs(m.diff)}`}`);

    // Store metadata for logging
    lastRerankMeta = {
      latencyMs,
      before: top.map(b => b.name),
      after: afterList.map(b => b.name),
      movements: movementDetails,
    };

    console.log(`\n🔄 LLM RERANK for "${query}" (${latencyMs}ms, ${orderedIndices.length}/${top.length} ranked)`);
    console.log(`📋 BEFORE: ${beforeNames}`);
    console.log(`📋 AFTER:  ${afterNames}`);
    if (movements.length > 0) {
      console.log(`📊 MOVES:  ${movements.join(" | ")}`);
    } else {
      console.log(`📊 MOVES:  (aucun changement)`);
    }

    return [...rerankedTop, ...missingFromTop, ...remainder];
  } catch (err) {
    console.warn("LLM rerank failed:", err);
    return candidates;
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SearchParams {
  query?: string;
  city?: string;
  region?: string;
  category?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  limit?: number;
  offset?: number;
  pageSize?: number;
}

interface Business {
  id: string;
  name: string;
  description: string | null;
  categories: string[];
  services: string[];
  city: string;
  region: string;
  latitude: number | null;
  longitude: number | null;
  wtuce_status: "verified" | "pending";
  priority_score: number;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  logo_url: string | null;
  distance_km: number | null;
  google_rating: number | null;
  tripadvisor_rating: number | null;
  restaurant_guru_rating: number | null;
  trustpilot_rating: number | null;
  getyourguide_rating: number | null;
  viator_rating: number | null;
  avis_verifies_rating: number | null;
  tourradar_rating: number | null;
  google_review_count: number | null;
  tripadvisor_review_count: number | null;
  restaurant_guru_review_count: number | null;
  trustpilot_review_count: number | null;
  getyourguide_review_count: number | null;
  viator_review_count: number | null;
  avis_verifies_review_count: number | null;
  tourradar_review_count: number | null;
  computed_rating: number | null;
  total_review_count: number | null;
  main_category: string | null;
  engagements?: string[] | null;
  keywords?: string[] | null;
}

interface SearchResult {
  businesses: Business[];
  searchLevel: string;
  message: string;
  totalResults: number;
  totalCount?: number;
  detectedSubcategory?: string | null;
  detectedCity?: string | null;
  detectedNeighborhood?: string | null;
  detectedCategory?: string | null;
  detectedService?: string | null;
  intentSubcategoryConflict?: boolean;
  searchMode?: string | null;
  bundleTimeSlots?: string[];
  disambiguationType?: "needs_category" | "needs_city" | null;
  synonymUsed?: boolean;
  preciseMatch?: boolean;
  exactNameMatchIsolation?: boolean;
}

// Synonyms and noise words are now loaded from DB (search_synonyms, search_noise_words)
let synonyms: Record<string, string[]> = {};
let synonymSubcategories: Record<string, string[]> = {}; // key_word → subcategory_names (legacy)
let synonymServices: Record<string, string[]> = {}; // key_word → service_names (legacy)
let synonymFilters: Record<string, { subcategory_name: string | null; required_service: string | null }[]> = {}; // key_word → paired filters
let synonymBadges: Record<string, string> = {}; // key_word → badge_id (for badge-only synonyms)
let synonymEngagements: Record<string, string[]> = {}; // key_word → engagement_filters
let synonymCommodities: Record<string, string[]> = {}; // key_word → commodity_filters (Logistique:X)
let NOISE_ADJECTIVES = new Set<string>();
// Service keyword index: multi-word keywords from services table → service name(s)
// Used for early detection to skip LLM when query matches a service keyword
let serviceKeywordIndex: { keyword: string; contentWords: string[]; serviceName: string }[] = [];
let searchConfigLoadedAt = 0;
const SEARCH_CONFIG_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function loadSearchConfig(supabase: any) {
  if (Date.now() - searchConfigLoadedAt < SEARCH_CONFIG_TTL_MS && Object.keys(synonyms).length > 0) return;
  const { data: synData } = await supabase.from("search_synonyms").select("key_word, key_word_en, key_word_ar, synonyms, synonyms_en, synonyms_ar, subcategory_names, service_names, filters, badge_id, engagement_filters, commodity_filters").eq("is_active", true);
  if (synData) {
    synonyms = {};
    synonymSubcategories = {};
    synonymServices = {};
    synonymFilters = {};
    synonymBadges = {};
    synonymEngagements = {};
    synonymCommodities = {};
    for (const row of synData) {
      // Merge all language variants into a single expansion set keyed by the FR key_word.
      // Also register EN/AR keys as aliases pointing to the same expansion set so EN/AR
      // queries benefit from the rule.
      const merged = new Set<string>();
      for (const s of (row.synonyms || [])) if (s) merged.add(String(s).toLowerCase());
      for (const s of (row.synonyms_en || [])) if (s) merged.add(String(s).toLowerCase());
      for (const s of (row.synonyms_ar || [])) if (s) merged.add(String(s).toLowerCase());
      // Include translated key_words themselves as synonyms of the FR key so any lang matches.
      if (row.key_word_en) merged.add(String(row.key_word_en).toLowerCase());
      if (row.key_word_ar) merged.add(String(row.key_word_ar).toLowerCase());
      const mergedArr = Array.from(merged);
      const keys = [row.key_word, row.key_word_en, row.key_word_ar].filter(Boolean).map((k: string) => String(k).toLowerCase());
      for (const key of keys) {
        synonyms[key] = mergedArr;
        if (row.subcategory_names && row.subcategory_names.length > 0) synonymSubcategories[key] = row.subcategory_names;
        if (row.service_names && row.service_names.length > 0) synonymServices[key] = row.service_names;
        if (row.filters && Array.isArray(row.filters) && row.filters.length > 0) synonymFilters[key] = row.filters;
        if (row.badge_id) synonymBadges[key] = row.badge_id;
        if (row.engagement_filters && row.engagement_filters.length > 0) synonymEngagements[key] = row.engagement_filters;
        if (row.commodity_filters && row.commodity_filters.length > 0) synonymCommodities[key] = row.commodity_filters;
      }
    }
  }
  const [noiseResult, svcKwResult1, svcKwResult2] = await Promise.all([
    supabase.from("search_noise_words").select("word, word_en, word_ar").eq("is_active", true),
    supabase.from("services").select("name_fr, keywords").not("keywords", "eq", "{}").range(0, 999),
    supabase.from("services").select("name_fr, keywords").not("keywords", "eq", "{}").range(1000, 1999),
  ]);
  if (noiseResult.data) {
    // Union FR + EN + AR so stop-words in any language are stripped
    const allNoise: string[] = [];
    for (const r of noiseResult.data as any[]) {
      if (r.word) allNoise.push(r.word);
      if (r.word_en) allNoise.push(r.word_en);
      if (r.word_ar) allNoise.push(r.word_ar);
    }
    NOISE_ADJECTIVES = new Set(allNoise.map(w => w.toLowerCase()));
  }
  // Build service keyword index for early detection
  const allSvcKw = [...(svcKwResult1.data || []), ...(svcKwResult2.data || [])];
  serviceKeywordIndex = [];
  const svcKwStopWords = new Set([
    "de", "du", "des", "le", "la", "les", "un", "une", "à", "au", "aux",
    "en", "pour", "par", "avec", "sans", "sur", "dans", "et", "ou", "d",
  ]);
  for (const svc of allSvcKw) {
    const kws: string[] = svc.keywords || [];
    for (const kw of kws) {
      if (!kw.includes(" ")) continue; // Only multi-word keywords
      const contentWords = kw.toLowerCase().split(/\s+/)
        .map((w: string) => stripAccentsGlobal(w))
        .filter((w: string) => w.length > 1 && !svcKwStopWords.has(w));
      if (contentWords.length >= 2) {
        serviceKeywordIndex.push({ keyword: kw, contentWords, serviceName: svc.name_fr });
      }
    }
  }
  console.log(`Loaded ${serviceKeywordIndex.length} multi-word service keywords for early detection`);
  searchConfigLoadedAt = Date.now();
}

// French stop words used to detect natural language queries
const FRENCH_STOP_WORDS = new Set([
  "je", "tu", "il", "elle", "nous", "vous", "ils", "elles", "on",
  "un", "une", "des", "le", "la", "les", "du", "de", "d",
  "à", "au", "aux", "en", "pour", "par", "avec", "sans", "sur", "dans",
  "qui", "que", "quoi", "où", "comment", "quel", "quelle", "quels", "quelles",
  "est", "sont", "suis", "ai", "a", "ont", "être", "avoir", "faire",
  "cherche", "chercher", "veux", "voudrais", "vouloir", "peux", "pouvoir",
  "trouve", "trouver", "besoin", "faut", "aimer", "aller",
  "me", "te", "se", "ce", "cette", "ces", "mon", "ma", "mes", "son", "sa", "ses",
  "ne", "pas", "plus", "très", "aussi", "bien", "comme", "mais", "ou", "et",
]);

// English stop / intent words used to detect EN natural language queries
const ENGLISH_STOP_WORDS = new Set([
  "i", "you", "he", "she", "we", "they", "it",
  "a", "an", "the", "of", "in", "on", "at", "to", "for", "with", "without",
  "from", "by", "into", "near", "around",
  "is", "are", "am", "was", "were", "be", "been", "being", "do", "does", "did",
  "have", "has", "had", "want", "wants", "need", "needs", "looking", "look",
  "find", "search", "get", "eat", "drink", "buy", "book", "sleep", "stay",
  "where", "what", "which", "who", "how", "when", "why",
  "and", "or", "but", "not", "very", "some", "any", "my", "your", "our",
  "tonight", "today", "tomorrow", "now", "morning", "evening", "afternoon",
  "lunch", "dinner", "breakfast", "brunch", "open",
]);

// Arabic stop / intent words (basic set)
const ARABIC_STOP_WORDS = new Set([
  "في", "من", "إلى", "على", "عن", "مع", "و", "أو", "ال", "هو", "هي",
  "أنا", "أنت", "نحن", "أين", "كيف", "ماذا", "متى", "لماذا",
  "أريد", "أبحث", "ابحث", "أحتاج", "هل", "لي", "لك",
  "أكل", "شرب", "نوم", "فندق", "مطعم",
]);

/**
 * Detect if a query is a natural language sentence (vs. short keywords).
 * FR: 5+ words AND 2+ French stop words.
 * EN/AR: 3+ words AND at least 1 EN/AR stop word (their queries are shorter and need
 * translation via LLM before matching the FR-indexed search vector).
 */
function isNaturalLanguageQuery(query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  if (words.length < 3) return false;
  const enCount = words.filter(w => ENGLISH_STOP_WORDS.has(w)).length;
  const arCount = words.filter(w => ARABIC_STOP_WORDS.has(w)).length;
  if ((enCount + arCount) >= 1) return true;
  if (words.length < 5) return false;
  const stopCount = words.filter(w => FRENCH_STOP_WORDS.has(w)).length;
  return stopCount >= 2;
}

/**
 * Call the voice-search-intent function internally to extract keywords from a natural language query.
 */
async function extractSearchIntent(transcript: string): Promise<string> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const response = await fetch(`${supabaseUrl}/functions/v1/voice-search-intent`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ transcript }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data.query?.trim() || transcript;
  } catch (err) {
    console.warn("Intent extraction failed, using raw query:", err);
    return transcript;
  }
}

// City detection is now dynamic from DB (loaded at search time)
// detectCityInQuery is replaced by detectCityInQueryDynamic below

async function detectCityInQueryDynamic(query: string, supabase: any): Promise<{ cityName: string; matchedTerm: string } | null> {
  const lower = query.toLowerCase();
  const lowerStripped = stripAccentsGlobal(lower);
  const { data: cities } = await supabase
    .from("cities")
    .select("name_fr, name_en, name_ar, keywords")
    .eq("is_active", true);
  
  if (!cities) return null;
  
  // Sort by name length DESC so longer names match first (e.g. "El Jadida" before "Fès")
  const sorted = [...cities].sort((a: any, b: any) => (b.name_fr?.length || 0) - (a.name_fr?.length || 0));
  
  for (const city of sorted) {
    // Check main names (with accent normalization)
    for (const name of [city.name_fr, city.name_en, city.name_ar].filter(Boolean)) {
      const nameLower = name.toLowerCase();
      if (lower.includes(nameLower) || lowerStripped.includes(stripAccentsGlobal(nameLower))) return { cityName: city.name_fr, matchedTerm: name };
    }
    // Check keywords (typos, aliases) with accent normalization
    if (city.keywords && Array.isArray(city.keywords)) {
      for (const kw of city.keywords) {
        const kwLower = kw.toLowerCase();
        if (lower.includes(kwLower) || lowerStripped.includes(stripAccentsGlobal(kwLower))) return { cityName: city.name_fr, matchedTerm: kw };
      }
    }
  }
  return null;
}

// detectCityInQuery is no longer used — replaced by detectCityInQueryDynamic

// Neighborhood data loaded from DB (name + keywords/aliases)
interface NeighborhoodEntry { name: string; keywords: string[]; city_name: string | null }
let loadedNeighborhoods: NeighborhoodEntry[] = [];

async function loadNeighborhoods(supabase: any): Promise<NeighborhoodEntry[]> {
  if (loadedNeighborhoods.length > 0) return loadedNeighborhoods;
  const { data } = await supabase
    .from("neighborhoods")
    .select("name, name_en, name_ar, keywords, keywords_en, keywords_ar, cities!inner(name_fr)");
  if (data) {
    loadedNeighborhoods = data.map((n: any) => {
      const kw = [
        ...(n.keywords || []),
        ...(n.keywords_en || []),
        ...(n.keywords_ar || []),
        n.name_en,
        n.name_ar,
      ].filter((v: any) => typeof v === "string" && v.trim().length > 0);
      return { name: n.name, keywords: kw, city_name: n.cities?.name_fr || null };
    });
  }
  return loadedNeighborhoods;
}

// Get the city associated with a neighborhood (returns null if ambiguous = exists in multiple cities)
function getNeighborhoodCity(neighborhood: string, neighborhoods: NeighborhoodEntry[]): string | null {
  const lower = neighborhood.toLowerCase();
  const stripped = stripAccentsGlobal(lower);
  const matchingCities = new Set<string>();
  for (const n of neighborhoods) {
    const matches = n.name.toLowerCase() === lower || stripAccentsGlobal(n.name.toLowerCase()) === stripped ||
      n.keywords.some(kw => kw.toLowerCase() === lower || stripAccentsGlobal(kw.toLowerCase()) === stripped);
    if (matches && n.city_name) {
      matchingCities.add(n.city_name);
    }
  }
  if (matchingCities.size === 1) return [...matchingCities][0];
  if (matchingCities.size > 1) {
    console.log(`Neighborhood "${neighborhood}" is ambiguous — found in ${matchingCities.size} cities: ${[...matchingCities].join(", ")}. Not deriving a single city.`);
  }
  return null;
}

// Build all known names + aliases for detection
function getAllNeighborhoodNames(neighborhoods: NeighborhoodEntry[]): string[] {
  const all: string[] = [];
  for (const n of neighborhoods) {
    all.push(n.name);
    all.push(...n.keywords);
  }
  return all;
}

// Find the canonical neighborhood name from a detected alias
function resolveNeighborhoodName(detected: string, neighborhoods: NeighborhoodEntry[]): string {
  const detectedLower = detected.toLowerCase();
  const detectedStripped = stripAccentsGlobal(detectedLower);
  for (const n of neighborhoods) {
    if (n.name.toLowerCase() === detectedLower || stripAccentsGlobal(n.name.toLowerCase()) === detectedStripped) return n.name;
    for (const kw of n.keywords) {
      if (kw.toLowerCase() === detectedLower || stripAccentsGlobal(kw.toLowerCase()) === detectedStripped) return n.name;
    }
  }
  return detected;
}

// Get all variants (name + keywords) for a neighborhood, for SQL OR filtering
function getNeighborhoodVariants(name: string, neighborhoods: NeighborhoodEntry[]): string[] {
  const entry = neighborhoods.find(n => n.name.toLowerCase() === name.toLowerCase());
  if (!entry) return [name];
  return [entry.name, ...entry.keywords];
}

async function detectNeighborhoodInQuery(query: string, supabase: any): Promise<string | null> {
  const neighborhoods = await loadNeighborhoods(supabase);
  const allNames = getAllNeighborhoodNames(neighborhoods);
  const lower = query.toLowerCase();
  const lowerStripped = stripAccentsGlobal(lower);
  const words = lower.split(/\s+/);
  const wordsStripped = lowerStripped.split(/\s+/);
  const sorted = [...allNames].sort((a, b) => b.length - a.length);
  for (const n of sorted) {
    const nLower = n.toLowerCase();
    const nStripped = stripAccentsGlobal(nLower);
    if (nLower.includes(" ")) {
      if (lower.includes(nLower) || lowerStripped.includes(nStripped)) return resolveNeighborhoodName(n, neighborhoods);
    } else {
      if (words.includes(nLower) || wordsStripped.includes(nStripped)) return resolveNeighborhoodName(n, neighborhoods);
    }
  }
  return null;
}

// Post-filter businesses by neighborhood, using dynamic variants from DB
function filterByNeighborhood(businesses: any[], neighborhood: string, keepNameMatches = false, neighborhoods: NeighborhoodEntry[] = []): any[] {
  const variants = getNeighborhoodVariants(neighborhood, neighborhoods).map(v => v.toLowerCase());
  // Always include accent-stripped versions
  const allVariants = [...new Set([...variants, ...variants.map(v => stripAccentsGlobal(v))])];
  const nStripped = stripAccentsGlobal(neighborhood.toLowerCase());
  
  return businesses.filter((b: any) => {
    const bNeighborhood = (b.neighborhood || "").toLowerCase();
    if (allVariants.some(v => bNeighborhood === v || bNeighborhood.includes(v))) return true;
    if (bNeighborhood.includes("toute la ville")) return true;
    if (keepNameMatches) {
      const bName = (b.name || "").toLowerCase();
      const bNameStripped = bName.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (allVariants.some(v => bName.includes(v)) || bNameStripped.includes(nStripped)) return true;
    }
    return false;
  });
}

// Build SQL OR clause for neighborhood variants
function buildNeighborhoodOrClause(neighborhood: string, neighborhoods: NeighborhoodEntry[]): string {
  const variants = getNeighborhoodVariants(neighborhood, neighborhoods);
  return variants.map(n => `neighborhood.ilike.${n}`).join(",");
}

// Sanitize a term for to_tsquery: remove apostrophes and special chars
function sanitizeTerm(term: string): string {
  return term.replace(/['']/g, "").replace(/[^a-zA-Z0-9àâäéèêëïîôùûüÿçœæÀÂÄÉÈÊËÏÎÔÙÛÜŸÇŒÆ]/g, "");
}

function normalizeMatchingText(value: string): string {
  return stripAccentsGlobal(value.toLowerCase())
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeForMatching(value: string): string[] {
  const normalized = normalizeMatchingText(value);
  if (!normalized) return [];
  const baseTokens = normalized.split(" ").filter(Boolean);
  const expanded = new Set<string>(baseTokens);

  for (const token of baseTokens) {
    if (token.length > 3 && token.endsWith("s")) {
      expanded.add(token.slice(0, -1));
    }
    if (token.length > 4 && token.endsWith("es")) {
      expanded.add(token.slice(0, -2));
    }
  }

  return [...expanded];
}

function tagsMatchCandidate(candidate: string, tags: string[]): boolean {
  const candidateNorm = normalizeMatchingText(candidate);
  const candidateTokensAll = new Set(tokenizeForMatching(candidate));
  // Build content-only token set (exclude stop words and very short words)
  const candidateContentTokensSet = new Set(
    [...candidateTokensAll].filter(t => t.length > 1 && !FRENCH_STOP_WORDS.has(t))
  );
  const candidateContentTokensList = candidateNorm.split(" ").filter(w => w.length > 1 && !FRENCH_STOP_WORDS.has(w));
  const isMultiWordCandidate = candidateContentTokensList.length >= 2;
  // For multi-word candidates, require at least 2 content tokens to match
  const minTokenMatches = isMultiWordCandidate ? Math.max(2, Math.ceil(candidateContentTokensList.length * 0.5)) : 1;

  return tags.some((tag) => {
    const tagNorm = normalizeMatchingText(tag);
    if (!tagNorm) return false;

    // Exact match
    if (tagNorm === candidateNorm) return true;
    // Multi-word: check if one fully contains the other as a word sequence
    if (candidateNorm.includes(" ") && tagNorm.includes(candidateNorm)) return true;
    if (tagNorm.includes(" ") && candidateNorm.includes(tagNorm)) return true;

    // Token matching: count how many DISTINCT original candidate content words
    // have at least one expanded token matching in the tag.
    // This prevents plural variants (e.g. "cours"/"cour") from inflating the match count.
    const tagTokenSet = new Set(tokenizeForMatching(tag).filter(t => t.length > 1 && !FRENCH_STOP_WORDS.has(t)));
    let distinctMatches = 0;
    for (const origWord of candidateContentTokensList) {
      const wordExpansions = tokenizeForMatching(origWord).filter(t => t.length > 1 && !FRENCH_STOP_WORDS.has(t));
      if (wordExpansions.some(exp => tagTokenSet.has(exp))) {
        distinctMatches++;
      }
    }
    return distinctMatches >= minTokenMatches;
  });
}

function collectBusinessTags(business: any): string[] {
  return [
    ...((business.services || []) as string[]),
    ...((business.categories || []) as string[]),
    ...((business.keywords || []) as string[]),
  ].filter(Boolean);
}

// NOISE_ADJECTIVES is now loaded from DB via loadSearchConfig()

function expandQuery(query: string): string {
  // Split on whitespace AND hyphens so "Restaurant-galerie" → ["restaurant", "galerie"]
  // Filter out French stop words AND noise adjectives to stay consistent with the search_vector trigger
  // which also strips these words (e.g. "sur" in "Vue sur mer") — prevents tsquery/tsvector mismatch
  const FTS_STOP_WORDS = new Set(["le", "la", "les", "un", "une", "des", "du", "de", "d", "l", "au", "aux", "en", "sur", "dans", "pour", "par", "avec", "sans", "plus", "entre", "vers", "chez"]);
  const words = query.toLowerCase().split(/[\s\-]+/).filter(w => w.length > 0 && !NOISE_ADJECTIVES.has(w) && !FTS_STOP_WORDS.has(w));

  const groups = words.map(word => {
    const alternatives: string[] = [word];

    // Auto-generate singular/plural variants for every word (simple French stemming)
    // This ensures "caviar" matches "caviars" in search_vector (which uses 'simple' config, no stemming)
    if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) {
      alternatives.push(word.slice(0, -1)); // caviars → caviar
    }
    if (word.length > 2 && !word.endsWith("s")) {
      alternatives.push(word + "s"); // caviar → caviars
    }

    // If word contains "/" keep it as-is (e.g. "maison/villa") for tsquery
    // Also add the individual parts so they can match separately
    if (word.includes("/")) {
      const parts = word.split("/").filter(p => p.length > 0);
      alternatives.push(...parts);
    }

    for (const [key, values] of Object.entries(synonyms)) {
      const sanitizedWord = stripAccentsGlobal(sanitizeTerm(word));
      if (stripAccentsGlobal(sanitizeTerm(key)) === sanitizedWord || values.some(v => stripAccentsGlobal(sanitizeTerm(v.toLowerCase())) === sanitizedWord)) {
        alternatives.push(key, ...values);
        values.forEach(v => {
          const sv = sanitizeTerm(v);
          if (!sv.endsWith("s")) alternatives.push(sv + "s");
        });
        const sk = sanitizeTerm(key);
        if (!sk.endsWith("s")) alternatives.push(sk + "s");
      }
    }

    // For each alternative, also add accent-stripped variant so "française" matches "francaise" in search_vector
    const withAccentVariants = new Set<string>();
    for (const a of alternatives) {
      withAccentVariants.add(a);
      const stripped = stripAccentsGlobal(a);
      if (stripped !== a) withAccentVariants.add(stripped);
    }

    // For alternatives containing "/", keep slash as-is for tsquery matching
    // Always strip accents since search_vector now stores unaccented text (via unaccent() in trigger)
    const sanitized = [...withAccentVariants].map(a => {
      const base = a.includes("/")
        ? a.replace(/['']/g, "").replace(/[^a-zA-Z0-9àâäéèêëïîôùûüÿçœæÀÂÄÉÈÊËÏÎÔÙÛÜŸÇŒÆ/]/g, "")
        : sanitizeTerm(a);
      return stripAccentsGlobal(base);
    }).filter(t => t.length > 1);
    if (sanitized.length === 0) return null; // Skip words that produce no valid terms (e.g. "à")
    return sanitized.length === 1 ? sanitized[0] : `(${sanitized.join(" | ")})`;
  });

  return groups.filter(Boolean).join(" & ");
}

function getSearchLevelMessage(level: string, language: string = "fr"): string {
  const messages: Record<string, Record<string, string>> = {
    fr: {
      exact: "Résultats correspondant à votre recherche",
      fuzzy: "Voici des résultats similaires à votre recherche",
      radius: "Résultats dans un rayon de 30 km",
      region: "Résultats dans votre région",
      recommended: "Entreprises WTUCE recommandées",
    },
    en: {
      exact: "Results matching your search",
      fuzzy: "Here are similar results to your search",
      radius: "Results within 30 km radius",
      region: "Results in your region",
      recommended: "Recommended WTUCE businesses",
    },
    ar: {
      exact: "نتائج مطابقة لبحثك",
      fuzzy: "إليك نتائج مشابهة لبحثك",
      radius: "نتائج في نطاق 30 كم",
      region: "نتائج في منطقتك",
      recommended: "شركات WTUCE الموصى بها",
    },
  };

  return messages[language]?.[level] || messages.fr[level] || "";
}

// In-memory IP rate limiter: max 30 requests per minute per IP.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count += 1;
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Rate limit by client IP to protect expensive cascading search.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "unknown";
  if (!checkRateLimit(ip)) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded. Please try again in a minute." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" } },
    );
  }


  try {
    const _searchStartMs = Date.now();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let {
      query,
      city,
      region,
      category,
      latitude,
      longitude,
      radiusKm = 30,
      limit = 500,
      offset = 0,
      pageSize = 20,
      language = "fr",
      mode,
      spoken,
    skipRerank,
    mainCategory,
    compact,
    subcategoryNames,
    badgeIds,
    neighborhood: neighborhoodParam,
    }: SearchParams & { language?: string; mode?: string; spoken?: string; skipRerank?: boolean; mainCategory?: string; compact?: "ids" | "card" | null; subcategoryNames?: string[]; badgeIds?: string[]; neighborhood?: string } = await req.json();

    // ── Input validation & sanitization ──
    // Strip PostgREST filter special chars and clamp string lengths to prevent
    // filter-string injection (commas, dots, braces, parens, quotes are PostgREST operators).
    const sanitizeFilter = (v: unknown, maxLen = 200): string | undefined => {
      if (typeof v !== "string") return undefined;
      const cleaned = v.replace(/[,(){}"\\]/g, " ").replace(/\s+/g, " ").trim();
      if (!cleaned) return undefined;
      return cleaned.slice(0, maxLen);
    };
    const clampNum = (v: unknown, min: number, max: number, def: number): number => {
      const n = typeof v === "number" && Number.isFinite(v) ? v : def;
      return Math.min(max, Math.max(min, n));
    };
    query = typeof query === "string" ? query.slice(0, 200) : query;
    city = sanitizeFilter(city, 100);
    region = sanitizeFilter(region, 100);
    category = sanitizeFilter(category, 100);
    mainCategory = sanitizeFilter(mainCategory, 100);
    if (typeof latitude === "number" && (latitude < -90 || latitude > 90 || !Number.isFinite(latitude))) latitude = undefined;
    if (typeof longitude === "number" && (longitude < -180 || longitude > 180 || !Number.isFinite(longitude))) longitude = undefined;
    radiusKm = clampNum(radiusKm, 1, 200, 30);
    limit = clampNum(limit, 1, 1000, 500);
    offset = clampNum(offset, 0, 10000, 0);
    pageSize = clampNum(pageSize, 1, 100, 20);
    if (Array.isArray(subcategoryNames)) {
      subcategoryNames = subcategoryNames
        .map((s) => sanitizeFilter(s, 100))
        .filter((s): s is string => !!s)
        .slice(0, 20);
    }
    if (Array.isArray(badgeIds)) {
      badgeIds = badgeIds.filter((b) => typeof b === "string" && /^[0-9a-f-]{36}$/i.test(b)).slice(0, 20);
    }

    // ── BYPASS: front-structure entry + city → deterministic filter (no FTS, no LLM) ──
    if (city && ((Array.isArray(subcategoryNames) && subcategoryNames.length > 0) || (Array.isArray(badgeIds) && badgeIds.length > 0))) {
      const SELECT = "id, name, slug, city, neighborhood, address, phone, whatsapp, main_category, categories, services, keywords, logo_url, images, latitude, longitude, rating, computed_rating, total_review_count, wtuce_status, opening_hours, show_opening_hours, is_open_24h, default_service, engagements, priority_score, hook_fr, hook_en, hook_ar, gamme_id, badge_id, vacation_dates, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count";
      let allowedIds: string[] | null = null;
      if (Array.isArray(badgeIds) && badgeIds.length > 0) {
        const { data: bb, error: bbErr } = await supabase
          .from("business_badges")
          .select("business_id")
          .in("badge_id", badgeIds);
        if (bbErr) throw bbErr;
        allowedIds = Array.from(new Set((bb || []).map((r: any) => r.business_id).filter(Boolean)));
        if (allowedIds.length === 0) {
          return new Response(JSON.stringify({ businesses: [], searchLevel: "exact", message: "", totalResults: 0, totalCount: 0, detectedSubcategory: null, detectedCity: city, detectedNeighborhood: null, detectedCategory: null, detectedService: null, searchMode: "broad", disambiguationType: null }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
      let bypassQuery = supabase
        .from("businesses")
        .select(SELECT)
        .eq("is_active", true)
        .eq("city", city);
      if (Array.isArray(subcategoryNames) && subcategoryNames.length > 0) {
        bypassQuery = bypassQuery.overlaps("categories", subcategoryNames);
      }
      if (allowedIds) {
        bypassQuery = bypassQuery.in("id", allowedIds);
      }
      const { data: allRows, error: bypassErr } = await bypassQuery;
      if (bypassErr) throw bypassErr;
      // Optional strict neighborhood post-filter (used by embed-ai-chat scope-broaden)
      let bypassRows = allRows || [];
      const bypassNeighborhood = sanitizeFilter(neighborhoodParam, 100);
      if (bypassNeighborhood && bypassRows.length > 0) {
        const loadedNeighborhoods = await loadNeighborhoods(supabase);
        bypassRows = filterByNeighborhood(bypassRows, bypassNeighborhood, false, loadedNeighborhoods);
      }
      // Same ranking as text/voice search: verified > priority_score > rating (min 10 reviews) > id
      const sorted = bypassRows.slice().sort((a: any, b: any) => {
        const aV = a.wtuce_status === "verified" ? 0 : 1;
        const bV = b.wtuce_status === "verified" ? 0 : 1;
        if (aV !== bV) return aV - bV;
        const aP = a.priority_score || 0;
        const bP = b.priority_score || 0;
        if (aP !== bP) return bP - aP;
        const aR = (a.total_review_count ?? 0) >= 10 ? (a.computed_rating ?? (a.rating ? Number(a.rating) : -1)) : -1;
        const bR = (b.total_review_count ?? 0) >= 10 ? (b.computed_rating ?? (b.rating ? Number(b.rating) : -1)) : -1;
        if (aR !== bR) return bR - aR;
        return String(a.id).localeCompare(String(b.id));
      });
      const rows = sorted.slice(offset, offset + pageSize);
      return new Response(JSON.stringify({
        businesses: rows,
        searchLevel: "exact",
        message: "",
        totalResults: rows.length,
        totalCount: sorted.length,
        detectedSubcategory: null,
        detectedCity: city,
        detectedNeighborhood: null,
        detectedCategory: null,
        detectedService: null,
        searchMode: "broad",
        disambiguationType: null,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const isAutocomplete = mode === "autocomplete";

    // Load search config from DB (synonyms, noise words)
    await loadSearchConfig(supabase);

    let businesses: Business[] = [];
    let searchLevel = "exact";

    // ── EARLY synonym detection on raw query: if synonym paired filters match, skip expensive LLM call ──
    let earlySynonymHit = false;
    if (query) {
      const rawTexts = [query, spoken].filter(Boolean) as string[];
      for (const [key, filters] of Object.entries(synonymFilters)) {
        if (filters.length === 0) continue;
        const keyLower = key.toLowerCase();
        const synValues = synonyms[key] || [];
        const allTerms = [keyLower, ...synValues.map(v => v.toLowerCase())];
        for (const text of rawTexts) {
          const qLower = text.toLowerCase().replace(/-/g, " ").replace(/\s+/g, " ").trim();
          const qWords = qLower.split(/\s+/);
          const qWordsStripped = qWords.map(w => stripAccentsGlobal(w));
          const matched = allTerms.some(term => {
            const termNorm = term.replace(/-/g, " ").replace(/\s+/g, " ").trim();
            const termStripped = stripAccentsGlobal(termNorm);
            if (termNorm.includes(" ")) {
              return qLower.includes(termNorm) || stripAccentsGlobal(qLower).includes(termStripped);
            }
            // Single-word term: accept plural/singular variants (artisans ↔ artisan)
            const eq = (a: string, b: string) =>
              a === b ||
              (a.endsWith("s") && a.slice(0, -1) === b) ||
              (b.endsWith("s") && b.slice(0, -1) === a);
            return qWords.some(w => eq(w, termNorm)) || qWordsStripped.some(w => eq(w, termStripped));
          });
          if (matched) { earlySynonymHit = true; break; }
        }
        if (earlySynonymHit) break;
      }
      if (earlySynonymHit) {
        console.log(`⚡ Early synonym hit on raw query — skipping LLM intent extraction`);
      }
    }

    // ── EARLY service keyword detection: if query matches a multi-word service keyword, skip LLM ──
    let earlyServiceKeywordHit = false;
    let earlyServiceKeywordServices: string[] = [];
    if (query && !earlySynonymHit && serviceKeywordIndex.length > 0) {
      const rawTexts = [query, spoken].filter(Boolean) as string[];
      for (const text of rawTexts) {
        const qWords = text.toLowerCase().split(/\s+/).map(w => stripAccentsGlobal(w)).filter(w => w.length > 1);
        for (const entry of serviceKeywordIndex) {
          // Check if ALL content words of the keyword are present in the query
          const allPresent = entry.contentWords.every(cw =>
            qWords.some(qw => qw === cw || (qw.endsWith("s") && qw.slice(0, -1) === cw) || (cw.endsWith("s") && cw.slice(0, -1) === qw))
          );
          if (allPresent) {
            earlyServiceKeywordHit = true;
            if (!earlyServiceKeywordServices.includes(entry.serviceName)) {
              earlyServiceKeywordServices.push(entry.serviceName);
            }
          }
        }
        if (earlyServiceKeywordHit) break;
      }
      if (earlyServiceKeywordHit) {
        earlySynonymHit = true; // Reuse the flag to skip LLM
        console.log(`⚡ Early service keyword hit: [${earlyServiceKeywordServices.join(", ")}] — skipping LLM intent extraction`);
      }
    }

    // ── Natural language detection: extract keywords via LLM if needed ──
    let effectiveQuery = query;
    if (query && !earlySynonymHit && isNaturalLanguageQuery(query)) {
      // Check if this query has pre-extracted keywords in popular_searches (FR + EN + AR)
      let cachedKeywords: string | null = null;
      try {
        const q = query.trim();
        const { data: popRow } = await supabase
          .from("popular_searches")
          .select("extracted_keywords")
          .or(`query.ilike.${q},query_en.ilike.${q},query_ar.ilike.${q}`)
          .eq("is_active", true)
          .not("extracted_keywords", "is", null)
          .limit(1)
          .maybeSingle();
        if (popRow?.extracted_keywords) {
          cachedKeywords = popRow.extracted_keywords;
        }
      } catch { /* ignore */ }

      if (cachedKeywords) {
        console.log(`Using cached keywords for "${query}": "${cachedKeywords}"`);
        effectiveQuery = cachedKeywords;
      } else {
        console.log(`Natural language detected: "${query}" → extracting intent...`);
        const extracted = await extractSearchIntent(query);
        console.log(`Intent extracted: "${extracted}"`);
        // If LLM extraction returned the same query (failed), strip stop words manually
        if (extracted === query) {
          effectiveQuery = query.split(/\s+/)
            .filter(w => !FRENCH_STOP_WORDS.has(w.toLowerCase().replace(/['']/g, "")))
            .join(" ");
          console.log(`LLM extraction unchanged, stripped stop words: "${effectiveQuery}"`);
        } else {
          effectiveQuery = extracted;
        }
      }
    }
    // When synonym hit skipped LLM, still strip stop words for effectiveQuery
    if (query && earlySynonymHit && isNaturalLanguageQuery(query)) {
      effectiveQuery = query.split(/\s+/)
        .filter(w => !FRENCH_STOP_WORDS.has(w.toLowerCase().replace(/['']/g, "")))
        .join(" ");
      console.log(`Early synonym path: stripped stop words → "${effectiveQuery}"`);
    }
    
    // Normalize hyphens to spaces: "Restaurant-galerie" → "Restaurant galerie"
    if (effectiveQuery) {
      effectiveQuery = effectiveQuery.replace(/-/g, " ").replace(/\s+/g, " ").trim();
    }

    // Strip French contractions globally: l'aéroport → aéroport, d'art → art, etc.
    if (effectiveQuery) {
      effectiveQuery = effectiveQuery.split(/\s+/).map(w => 
        w.replace(/^[lLdDsSnNjJcCqQ][\u0027\u2019\u2018\u0060]/g, "")
      ).filter(w => w.length > 0).join(" ");
    }

    // Strip country-level noise words: "maroc", "marocain(e)(s)", "morocco", "moroccan"
    // The entire directory is Morocco-specific, so these words are redundant and cause false positives
    // (e.g. "maroc" matching "maroquinerie" via keywords)
    if (effectiveQuery) {
      const COUNTRY_NOISE = /^(maroc|marocain|marocaine|marocains|marocaines|morocco|moroccan)$/i;
      const stripped = effectiveQuery.split(/\s+/).filter(w => !COUNTRY_NOISE.test(stripAccentsGlobal(w))).join(" ").trim();
      if (stripped && stripped !== effectiveQuery) {
        console.log(`Stripped country noise from query: "${stripped}" (was: "${effectiveQuery}")`);
        effectiveQuery = stripped;
      }
    }

    // Detect superlative intent (meilleur, top, best…) → sort by rating
    const isSuperlatif = effectiveQuery ? detectSuperlative(effectiveQuery) : false;

// ── Parallelize independent DB lookups ──
    const [cityDetection, detectedNeighborhoodRaw, webOnlySvcRow, relData, configsData] = await Promise.all([
      // 1. City detection
      effectiveQuery ? detectCityInQueryDynamic(effectiveQuery, supabase) : Promise.resolve(null),
      // 2. Neighborhood detection
      effectiveQuery ? detectNeighborhoodInQuery(effectiveQuery, supabase) : Promise.resolve(null),
      // 3. Web Only service name
      supabase.from("services").select("name_fr").eq("id", "9ad4f9a3-f409-498f-8a1e-6b949407365b").limit(1).single().then((r: any) => r.data),
      // 4. Related subcategories
      supabase.from("subcategory_relations").select("source_subcategory_id, target_subcategory_id, subcategories!subcategory_relations_source_subcategory_id_fkey(name_fr), target:subcategories!subcategory_relations_target_subcategory_id_fkey(name_fr)").eq("is_active", true).then((r: any) => r.data),
      // 5. Search configs
      supabase.from("subcategory_search_config").select("subcategory_id, search_mode, max_results, boost_weight, synonyms, synonyms_en, synonyms_ar, subcategories!inner(name_fr)").then((r: any) => {
        // Union all-language synonyms so EN/AR queries match FR-configured subcategories
        const rows = r.data || [];
        return rows.map((row: any) => ({
          ...row,
          synonyms: [...new Set([...(row.synonyms || []), ...(row.synonyms_en || []), ...(row.synonyms_ar || [])])],
        }));
      }),
    ]);

    let detectedNeighborhood = detectedNeighborhoodRaw;

    const detectedCity = cityDetection?.cityName || null;
    const detectedCityMatchedTerm = cityDetection?.matchedTerm || null;
    let effectiveCity = city || detectedCity || undefined;




    // Strict mode: when the caller explicitly passes `city` (URL param / voice detection),
    // restrict to businesses physically in that city — exclude the national/international leakage.
    let strictCity = !!city;
    let effectiveCityId: string | null = null;

    // Neighborhood handling — MUST run before applyCityFilter so we can override a stale
    // client-side selectedCity (e.g. user on Marrakech searches "Sidi Kaouki" → Essaouira).
    if (detectedNeighborhood) {
      console.log(`Auto-detected neighborhood "${detectedNeighborhood}" from query "${effectiveQuery}"`);
      const neighborhoodCity = getNeighborhoodCity(detectedNeighborhood, await loadNeighborhoods(supabase));
      // RÈGLE UNIQUE DE PÉRIMÈTRE : la ville transmise par l'appelant (ville du
      // business master / ville active) ne peut être remplacée que si l'utilisateur
      // nomme explicitement l'autre ville, ou nomme littéralement le quartier
      // (ex. « Sidi Kaouki »). Un simple alias/mot-clé (« beach » → quartier
      // « Plage » à Essaouira) ne déplace jamais le périmètre.
      const qNorm = stripAccentsGlobal(String(effectiveQuery || "").toLowerCase());
      const neighborhoodNamedInQuery = qNorm.includes(
        stripAccentsGlobal(String(detectedNeighborhood).toLowerCase()),
      );
      if (
        neighborhoodCity && detectedCity &&
        stripAccentsGlobal(detectedCity.toLowerCase()) !== stripAccentsGlobal(neighborhoodCity.toLowerCase())
      ) {
        console.log(`Dropping neighborhood "${detectedNeighborhood}" (${neighborhoodCity}) — query explicitly names city "${detectedCity}"`);
        detectedNeighborhood = null;
      } else if (neighborhoodCity) {
        if (!effectiveCity) {
          effectiveCity = neighborhoodCity;
          console.log(`Derived city "${effectiveCity}" from neighborhood "${detectedNeighborhood}"`);
        } else if (stripAccentsGlobal(effectiveCity.toLowerCase()) !== stripAccentsGlobal(neighborhoodCity.toLowerCase())) {
          if (neighborhoodNamedInQuery) {
            console.log(`Overriding client city "${effectiveCity}" → "${neighborhoodCity}" (quartier "${detectedNeighborhood}" nommé explicitement)`);
            effectiveCity = neighborhoodCity;
            strictCity = false;
          } else {
            console.log(`Dropping neighborhood "${detectedNeighborhood}" (${neighborhoodCity}) — alias hors périmètre de la ville demandée "${effectiveCity}"`);
            detectedNeighborhood = null;
          }
        }
      }
    }



    // Resolve city name → UUID for zone_city_ids filtering (after neighborhood override)
    if (effectiveCity) {
      const { data: cityRow } = await supabase
        .from("cities")
        .select("id")
        .ilike("name_fr", effectiveCity)
        .limit(1)
        .single();
      if (cityRow) {
        effectiveCityId = cityRow.id;
        console.log(`Resolved city "${effectiveCity}" → ID ${effectiveCityId}`);
      }
    }

    // Web Only service name
    let webOnlyServiceName: string | null = null;
    if (webOnlySvcRow) {
      webOnlyServiceName = webOnlySvcRow.name_fr;
      console.log(`Resolved Web Only service ID → "${webOnlyServiceName}"`);
    }

    // Helper: build city OR clause including zone_city_ids coverage + "Web only" + "internationale" businesses
    const applyCityFilter = (builder: any) => {
      if (!effectiveCity) return builder;
      if (strictCity) {
        return builder.ilike("city", effectiveCity);
      }
      const conditions: string[] = [`city.ilike.${effectiveCity}`];
      if (effectiveCityId) {
        // Zone nationale: ville dans zone_city_ids ET is_visible_locale = true
        conditions.push(`and(zone_city_ids.cs.{"${effectiveCityId}"},is_visible_locale.eq.true)`);
      }
      // Include businesses with zone_chalandise = "internationale" ET visible
      conditions.push(`and(zone_chalandise.eq.internationale,is_visible_locale.eq.true)`);
      return builder.or(conditions.join(","));
    };


    // Related subcategories
    let RELATED_SUBCATEGORIES: Record<string, string[]> = {};
    if (relData) {
      for (const row of relData) {
        const srcName = (row as any).subcategories?.name_fr;
        const tgtName = (row as any).target?.name_fr;
        if (srcName && tgtName) {
          if (!RELATED_SUBCATEGORIES[srcName]) RELATED_SUBCATEGORIES[srcName] = [];
          RELATED_SUBCATEGORIES[srcName].push(tgtName);
        }
      }
    }

    // Search configs
    let searchConfigs: Record<string, { search_mode: string; max_results: number | null; boost_weight: number; synonyms: string[] }> = {};
    if (configsData) {
      for (const c of configsData) {
        const name = (c as any).subcategories?.name_fr;
        if (name) {
          searchConfigs[name.toLowerCase()] = {
            search_mode: c.search_mode,
            max_results: c.max_results,
            boost_weight: c.boost_weight,
            synonyms: c.synonyms || [],
          };
        }
      }
      console.log(`Loaded ${Object.keys(searchConfigs).length} search configs`);
    }

    // ── Check for exact business name match (for pinning, but don't skip subcategory detection) ──
    let nameMatchedBusinessIds: string[] = [];
    const keywordPinnedIds = new Set<string>(); // IDs matched via keywords — exempt from relevance filtering
    let nameSearchQueryForDetection = "";
    // Gate élargi à 10 mots : les noms propres longs ("Le Chalet de la Plage - Chez Jeannot")
    // étaient exclus du pinning par nom et se faisaient écraser par la détection de sous-catégorie.
    if (effectiveQuery && effectiveQuery.split(/\s+/).length <= 10) {
      let nameSearchQuery = effectiveQuery;
      if (effectiveCity) {
        const cityWords = effectiveCity.toLowerCase().split(/\s+/);
        nameSearchQuery = effectiveQuery.split(/\s+/).filter(w => 
          !cityWords.includes(w.toLowerCase()) && !cityWords.includes(stripAccentsGlobal(w.toLowerCase()))
        ).join(" ").trim();
      }
      nameSearchQueryForDetection = nameSearchQuery;
      if (nameSearchQuery.length >= 3) {
        let nameMatchBuilder = supabase
          .from("businesses")
          .select("id, name")
          .eq("is_active", true)
          .ilike("name", `%${nameSearchQuery}%`);
        // Filter by city so name matches don't leak results from other cities
        if (effectiveCity) {
          nameMatchBuilder = nameMatchBuilder.ilike("city", effectiveCity);
        }
        const { data: nameMatches } = await nameMatchBuilder.limit(5);
        if (nameMatches && nameMatches.length > 0) {
          const qWords = nameSearchQuery.toLowerCase().split(/\s+/).filter((w: string) => w.length > 1);
          const strongNameMatches = nameMatches.filter((b: any) => {
            const bWords = b.name.toLowerCase().split(/\s+/).filter((w: string) => w.length > 1);
            const matchCount = qWords.filter((qw: string) => bWords.some((bw: string) => {
              const bwStripped = stripAccentsGlobal(bw);
              const qwStripped = stripAccentsGlobal(qw);
              // Whole-word comparison only: "golf" !== "montgolfière"
              return bw === qw || bwStripped === qwStripped;
            })).length;
            return matchCount >= Math.ceil(qWords.length * 0.6);
          });
          if (strongNameMatches.length > 0) {
            nameMatchedBusinessIds = strongNameMatches.map((b: any) => b.id);
            console.log(`Name match found for pinning: query "${nameSearchQuery}" matches [${strongNameMatches.map((b: any) => b.name).join(", ")}]`);
          }
        }

        // ── Keyword-based pinning: find businesses whose keywords[] contain the full query ──
        // This catches businesses like "Salam Boutique" with keyword "artisanat essaouira"
        // when the synonym "artisanat" bypasses FTS and filters by service only
        if (nameSearchQuery.length >= 3) {
          const kwQuery = stripAccentsGlobal(nameSearchQuery.toLowerCase().trim());
          // Search for businesses that have a keyword matching the full query string
          let kwBuilder = supabase
            .from("businesses")
            .select("id, name, keywords")
            .eq("is_active", true)
            .not("keywords", "is", null);
          if (effectiveCity) {
            kwBuilder = applyCityFilter(kwBuilder);
          }
          const { data: kwMatches } = await kwBuilder.limit(500);
          if (kwMatches && kwMatches.length > 0) {
            const kwPinned: string[] = [];
            const kwPinnedNames: string[] = [];
            for (const b of kwMatches) {
              if (nameMatchedBusinessIds.includes(b.id)) continue;
              const bKeywords: string[] = b.keywords || [];
              // Check if any keyword matches the full query as a whole word (not substring)
              // e.g. "velo" must NOT match keyword "velours" — only exact word boundaries
              const kwQueryWords = kwQuery.split(/\s+/).filter(w => w.length > 0);
              const hasMatch = bKeywords.some((kw: string) => {
                const kwNorm = stripAccentsGlobal(kw.toLowerCase().trim());
                if (!kwNorm) return false;
                if (kwNorm === kwQuery) return true;
                // Check if the full query appears as whole word(s) inside the keyword
                // Use word-boundary regex to prevent "velo" matching "velours"
                const queryRegex = new RegExp(`(?:^|\\s)${kwQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|$)`);
                if (queryRegex.test(kwNorm)) return true;
                // Also check if a keyword appears as whole word(s) in the query
                const kwWords = kwNorm.split(/\s+/).filter(w => w.length > 0);
                if (kwWords.length > 0 && kwWords.length <= kwQueryWords.length) {
                  const kwRegex = new RegExp(`(?:^|\\s)${kwNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|$)`);
                  if (kwRegex.test(kwQuery)) return true;
                }
                return false;
              });
              if (hasMatch) {
                kwPinned.push(b.id);
                kwPinnedNames.push(b.name);
              }
            }
            if (kwPinned.length > 0) {
              nameMatchedBusinessIds = [...nameMatchedBusinessIds, ...kwPinned];
              for (const id of kwPinned) keywordPinnedIds.add(id);
              console.log(`Keyword match found for pinning: query "${nameSearchQuery}" matches [${kwPinnedNames.join(", ")}] via keywords`);
            }
          }
        }
      }
    }

    // ── Label detection: match query against label names (e.g. "Relais & Châteaux") ──
    let labelShortcutActivated = false;
    if (effectiveQuery && !isAutocomplete) {
      const qLowerLabel = stripAccentsGlobal(effectiveQuery.toLowerCase().replace(/&/g, "et").replace(/\s+/g, " ").trim());
      const { data: matchedLabels } = await supabase
        .from("labels")
        .select("id, name_fr, name_en, name_ar");
      if (matchedLabels && matchedLabels.length > 0) {
        // Sort labels by name length DESC so longer names match first
        const sortedLabels = [...matchedLabels].sort((a: any, b: any) => 
          (b.name_fr?.length || 0) - (a.name_fr?.length || 0)
        );
        const matchedLabel = sortedLabels.find((l: any) => {
          for (const name of [l.name_fr, l.name_en, l.name_ar].filter(Boolean)) {
            const normalized = stripAccentsGlobal(name.toLowerCase().replace(/&/g, "et").replace(/\s+/g, " ").trim());
            // Exact match OR label name contained in query (e.g. "relais et chateaux essaouira" contains "relais et chateaux")
            if (normalized === qLowerLabel || qLowerLabel.includes(normalized)) return true;
          }
          return false;
        });
        if (matchedLabel) {
          console.log(`🏷️ LABEL match: "${matchedLabel.name_fr}" (id: ${matchedLabel.id})`);
          const { data: labelLinks } = await supabase
            .from("business_labels")
            .select("business_id")
            .eq("label_id", matchedLabel.id);
          if (labelLinks && labelLinks.length > 0) {
            const businessIds = labelLinks.map((l: any) => l.business_id);
            let labelBuilder = supabase
              .from("businesses")
              .select("*")
              .eq("is_active", true)
              .in("id", businessIds);
            if (effectiveCity) labelBuilder = applyCityFilter(labelBuilder);
            labelBuilder = labelBuilder
              .order("wtuce_status", { ascending: true })
              .order("priority_score", { ascending: false })
              .limit(limit);
            const { data: labelBusinesses, error: labelError } = await labelBuilder;
            if (!labelError && labelBusinesses && labelBusinesses.length > 0) {
              businesses = labelBusinesses.map((b: any) => ({
                ...b,
                distance_km: latitude && longitude && b.latitude && b.longitude
                  ? calculateDistance(latitude, longitude, b.latitude, b.longitude) : null,
              }));
              searchLevel = "exact";
              labelShortcutActivated = true;
              console.log(`🏷️ Label shortcut: ${businesses.length} businesses for label "${matchedLabel.name_fr}"`);
            }
          }
        }
      }
    }

    // ── Subcategory detection always runs (no longer skipped by name matches) ──
    let detectedSubcategory: string | null = null;
    let detectedSubcategoryIsReal = false;
    let subcategoryParentCategory: string | null = null;
    let keywordLinkedSubcategories: string[] = []; // additional subcategories found via keyword match
    let keywordLinkedOwnerSubcategory: string | null = null;
    let detectedSubcategoryFromKeyword = false;
    let forcedServiceFromReeval: string | null = null; // service forced by intent-based re-evaluation
    if (effectiveQuery && !labelShortcutActivated) {
      const qLower = effectiveQuery.toLowerCase();
      const qWords = qLower.split(/\s+/);

      // Dynamic lookup: match query words against subcategory names AND keywords from DB
      const { data: subcats } = await supabase
        .from("subcategories")
        .select("name_fr, name_en, name_ar, keywords");
      
      if (subcats) {
        // Sort by name length DESC so longer names match first (e.g. "Night Club" before "Club")
        const sorted = [...subcats].sort((a: any, b: any) => (b.name_fr?.length || 0) - (a.name_fr?.length || 0));
        
        // Helper functions for normalization
        const stripPluralSimple = (w: string): string => {
          if (w.endsWith("aux")) return w.slice(0, -3) + "al";
          if (w.endsWith("eaux")) return w.slice(0, -4) + "eau";
          if (w.endsWith("s")) return w.slice(0, -1);
          return w;
        };
        const stripAccents = (w: string): string => w.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const stripElision = (w: string): string => w.replace(/^[dDlLsSnNmMcCjJ]'|^[qQ]u'/i, "");
        const normalizeWord = (w: string): string => stripAccents(stripPluralSimple(stripElision(w)));
        const GENERIC_KEYWORD_BLOCKLIST = new Set([
          "produit", "produits", "article", "articles", "service", "services",
          "chose", "choses", "truc", "trucs", "objet", "objets", "materiel",
          "achat", "achats", "vente", "ventes", "magasin", "magasins",
          "boutique", "boutiques", "commerce", "commerces",
        ]);
        const isBlockedGenericWord = (w: string) => GENERIC_KEYWORD_BLOCKLIST.has(normalizeWord(w));

        // ── PASS 1: Name matches only (priority over keyword matches) ──
        // Collect ALL matching subcategory names along with the position of the
        // first query word that triggered the match. When several subcategories
        // match (e.g. "hotel avec piscine" matches both "Hôtel" and "Piscine"),
        // we keep the one that appears LEFT-MOST in the query — French syntax
        // puts the main noun before its qualifier, so the left-most word is the
        // user's primary intent (subject), and trailing words act as services.
        const nameMatches: { name: string; position: number; length: number }[] = [];
        for (const sc of sorted) {
          if (!sc.name_fr) continue;
          const aliases: string[] = [sc.name_fr, sc.name_en, sc.name_ar].filter(Boolean);
          let bestPosition = -1;
          let bestLength = 0;
          for (const alias of aliases) {
            const n = alias.toLowerCase();
            if (!n) continue;
            const nWords = n.split(/\s+/).filter((w: string) => w.length > 1);
            const nContentWords = nWords.filter((w: string) => !FRENCH_STOP_WORDS.has(w));
            const nContent = nContentWords.join(" ");
            let matchedWordIdx = -1;
            const singleWordMatch = !n.includes(" ") && qWords.some((qw, idx) => {
              const ok = qw === n || stripPluralSimple(qw) === n || qw === stripPluralSimple(n) ||
                stripAccents(qw) === stripAccents(n) || normalizeWord(qw) === stripAccents(n) || stripAccents(qw) === normalizeWord(n);
              if (ok && matchedWordIdx === -1) matchedWordIdx = idx;
              return ok;
            });
            const multiWordMatch = n.includes(" ") && nContentWords.length > 0 && nContentWords.every((nw: string) =>
              qWords.some(qw => qw === nw || normalizeWord(qw) === normalizeWord(nw))
            );
            const slashParts = n.includes("/") ? n.split("/").map((p: string) => p.trim()).filter((p: string) => p.length > 1) : [];
            const slashMatch = slashParts.length > 1 && slashParts.some((part: string) => {
              const partWords = part.split(/\s+/).filter((w: string) => w.length > 1);
              if (partWords.length === 1) {
                return qWords.some(qw => qw === partWords[0] || normalizeWord(qw) === normalizeWord(partWords[0]));
              }
              return partWords.every((pw: string) => qWords.some(qw => qw === pw || normalizeWord(qw) === normalizeWord(pw)));
            });
            const isMatch = n.includes(" ")
              ? (qLower.includes(n) || (nContent.length > 2 && qLower.includes(nContent)) || multiWordMatch || slashMatch)
              : singleWordMatch;
            if (isMatch) {
              if (matchedWordIdx === -1) {
                const firstContentNw = nContentWords[0] || nWords[0] || n;
                const idx = qWords.findIndex(qw => qw === firstContentNw || normalizeWord(qw) === normalizeWord(firstContentNw));
                matchedWordIdx = idx >= 0 ? idx : qLower.indexOf(n);
              }
              if (bestPosition === -1 || matchedWordIdx < bestPosition) {
                bestPosition = matchedWordIdx;
                bestLength = n.length;
              }
            }
          }
          if (bestPosition !== -1) {
            nameMatches.push({ name: sc.name_fr, position: bestPosition, length: bestLength });
          }
        }
        if (nameMatches.length > 0) {
          // Pick left-most position; tie-break by longer name (more specific)
          nameMatches.sort((a, b) => a.position - b.position || b.length - a.length);
          detectedSubcategory = nameMatches[0].name;
          if (nameMatches.length > 1) {
            console.log(`Auto-detected subcategory "${detectedSubcategory}" (left-most) among [${nameMatches.map(m => m.name).join(", ")}] for query "${effectiveQuery}"`);
          } else {
            console.log(`Auto-detected subcategory "${detectedSubcategory}" from name match in query "${effectiveQuery}"`);
          }
        }

        // ── PASS 2: Keyword matches ──
        // If name match found: collect additional keyword-linked subcategories
        // If no name match: use keyword match as primary detection (skip if ambiguous)
        {
          const keywordMatchedSubcats: string[] = [];
          const multiWordKeywordMatched: Record<string, string> = {}; // subcatName → matched multi-word keyword
          for (const sc of sorted) {
            const n = sc.name_fr?.toLowerCase();
            if (!n) continue;
            // Skip the subcategory already detected by name match
            if (detectedSubcategory && sc.name_fr === detectedSubcategory) continue;
            const kws: string[] = (sc.keywords || []).map((k: string) => k.toLowerCase());
            if (kws.length === 0) continue;
            // Detect multi-word (≥2 content words) keyword matches specifically
            let mwHit: string | null = null;
            for (const k of kws) {
              if (!k.includes(" ")) continue;
              const kwContentWords = k.split(/\s+/).filter((w: string) => w.length > 1 && !FRENCH_STOP_WORDS.has(w));
              if (kwContentWords.length < 2) continue;
              const allIn = kwContentWords.every((kw: string) =>
                qWords.some(qw => qw === kw || normalizeWord(qw) === normalizeWord(kw))
              );
              if (allIn || qLower.includes(k)) { mwHit = k; break; }
            }
            if (kws.length > 0 && (
              mwHit ||
              qWords.some((w: string) => !isBlockedGenericWord(w) && (kws.includes(w) || kws.some((k: string) => !k.includes(" ") && normalizeWord(k) === normalizeWord(w)))) ||
              kws.some((k: string) => k.includes(" ") && qLower.includes(k)) ||
              kws.some((k: string) => {
                if (!k.includes(" ")) return false;
                const kwContentWords = k.split(/\s+/).filter((w: string) => w.length > 1 && !FRENCH_STOP_WORDS.has(w));
                if (kwContentWords.length === 0) return false;
                if (kwContentWords.length === 1) {
                  return qWords.some(qw => qw === kwContentWords[0] || normalizeWord(qw) === normalizeWord(kwContentWords[0]));
                }
                return kwContentWords.every((kw: string) =>
                  qWords.some(qw => qw === kw || normalizeWord(qw) === normalizeWord(kw))
                );
              })
            )) {
              keywordMatchedSubcats.push(sc.name_fr);
              if (mwHit) multiWordKeywordMatched[sc.name_fr] = mwHit;
            }
          }
          if (detectedSubcategory) {
            // ── Child-override: if a multi-word keyword matched a subcategory that is
            //    a "related" (child/specialized) of the name-detected parent, override.
            //    e.g. name-match "Piscine" + multi-word "parc aquatique" → Aquaparc.
            const relatedOfDetected = RELATED_SUBCATEGORIES[detectedSubcategory] || [];
            const override = keywordMatchedSubcats.find(sc =>
              multiWordKeywordMatched[sc] && relatedOfDetected.includes(sc)
            );
            if (override) {
              console.log(`Subcategory override: "${detectedSubcategory}" → "${override}" (multi-word keyword "${multiWordKeywordMatched[override]}" matched a related/child subcategory)`);
              detectedSubcategory = override;
              detectedSubcategoryFromKeyword = true;
              keywordLinkedSubcategories = [];
              keywordLinkedOwnerSubcategory = null;
            } else if (keywordMatchedSubcats.length > 0) {
              // Name match already found — store keyword matches as additional linked subcategories
              keywordLinkedSubcategories = keywordMatchedSubcats;
              keywordLinkedOwnerSubcategory = detectedSubcategory;
              console.log(`Keyword-linked subcategories for "${detectedSubcategory}": [${keywordLinkedSubcategories.join(", ")}]`);
            }
          } else {
            // No name match — use keyword match as primary
            if (keywordMatchedSubcats.length === 1) {
              detectedSubcategory = keywordMatchedSubcats[0];
              detectedSubcategoryFromKeyword = true;
              console.log(`Auto-detected subcategory "${keywordMatchedSubcats[0]}" from keyword match in query "${effectiveQuery}"`);
            } else if (keywordMatchedSubcats.length > 1) {
              // Prefer a multi-word keyword match over ambiguous single-word matches
              const mwOnly = keywordMatchedSubcats.filter(sc => multiWordKeywordMatched[sc]);
              if (mwOnly.length === 1) {
                detectedSubcategory = mwOnly[0];
                detectedSubcategoryFromKeyword = true;
                console.log(`Auto-detected subcategory "${mwOnly[0]}" from multi-word keyword "${multiWordKeywordMatched[mwOnly[0]]}" (disambiguated among ${keywordMatchedSubcats.length})`);
              } else {
                console.log(`Keyword matched ${keywordMatchedSubcats.length} subcategories [${keywordMatchedSubcats.join(", ")}] — skipping subcategory lock, will use broader search`);
              }
            }
          }
        }


        if (detectedSubcategory) {
          detectedSubcategoryIsReal = subcats.some(
            (sc: any) => sc.name_fr?.toLowerCase() === detectedSubcategory!.toLowerCase()
          );
          // Resolve parent category for enrichment filtering
          const { data: parentCatData } = await supabase
            .from("subcategories")
            .select("categories!inner(name_fr)")
            .eq("name_fr", detectedSubcategory)
            .limit(1)
            .single();
          if (parentCatData) {
            subcategoryParentCategory = (parentCatData as any).categories?.name_fr || null;
            console.log(`Subcategory "${detectedSubcategory}" parent category: "${subcategoryParentCategory}"`);
          }
        }
      }
    }
    // ── Apply search config: inject synonyms into query expansion if configured ──
    let subcategorySearchConfig: { search_mode: string; max_results: number | null; boost_weight: number; synonyms: string[] } | null = null;
    if (detectedSubcategory) {
      subcategorySearchConfig = searchConfigs[detectedSubcategory.toLowerCase()] || null;
      // Fallback: if no config for this subcategory, check if it also exists as a SERVICE
      // and inherit config from the service's parent subcategory (e.g. "Tapis" service → parent "Décoration" → strict)
      // IMPORTANT: Only inherit if the detected term is NOT itself a real subcategory name.
      // A subcategory identity takes priority over a service identity → defaults to broad.
      if (!subcategorySearchConfig) {
        if (!detectedSubcategoryIsReal) {
          // Only inherit from service parent if NOT a real subcategory
          const { data: svcAsService } = await supabase
            .from("services")
            .select("subcategory_id, subcategories!inner(name_fr)")
            .eq("name_fr", detectedSubcategory);
          if (svcAsService && svcAsService.length > 0) {
            for (const sp of svcAsService) {
              const parentName = (sp as any).subcategories?.name_fr;
              if (parentName) {
                const parentConfig = searchConfigs[parentName.toLowerCase()] || null;
                if (parentConfig) {
                  subcategorySearchConfig = parentConfig;
                  console.log(`Inherited search config from service "${detectedSubcategory}" parent subcategory "${parentName}": mode=${parentConfig.search_mode}`);
                  break;
                }
              }
            }
          }
        } else {
          console.log(`"${detectedSubcategory}" is a real subcategory — skipping service inheritance, defaulting to broad`);
        }
      }
      if (subcategorySearchConfig) {
        console.log(`Search config for "${detectedSubcategory}": mode=${subcategorySearchConfig.search_mode}, max=${subcategorySearchConfig.max_results}, boost=${subcategorySearchConfig.boost_weight}, synonyms=[${subcategorySearchConfig.synonyms.join(", ")}]`);
        // Inject configured synonyms into the global synonym map for expandQuery
        if (subcategorySearchConfig.synonyms.length > 0) {
          const subcatKey = detectedSubcategory.toLowerCase().replace(/\s+/g, "");
          if (!synonyms[subcatKey]) {
            synonyms[subcatKey] = [...subcategorySearchConfig.synonyms];
          } else {
            synonyms[subcatKey] = [...new Set([...synonyms[subcatKey], ...subcategorySearchConfig.synonyms])];
          }
          console.log(`Injected ${subcategorySearchConfig.synonyms.length} config synonyms for "${detectedSubcategory}"`);
        }
      }
    }
    // Also check search configs for subcategory detection via synonyms
    // (if query contains a configured synonym, detect the corresponding subcategory)
    if (!detectedSubcategory && effectiveQuery) {
      const qLower = effectiveQuery.toLowerCase();
      const qLowerStripped = stripAccentsGlobal(qLower);
      const qWords = qLower.split(/\s+/);
      const qWordsStripped = qLowerStripped.split(/\s+/);
      for (const [subcatName, config] of Object.entries(searchConfigs)) {
        if (config.synonyms.length === 0) continue;
        const matched = config.synonyms.some(syn => {
          const synLower = syn.toLowerCase();
          const synStripped = stripAccentsGlobal(synLower);
          return synLower.includes(" ") 
            ? (qLower.includes(synLower) || qLowerStripped.includes(synStripped)) 
            : (qWords.includes(synLower) || qWordsStripped.includes(synStripped));
        });
        if (matched) {
          // Find the original-case subcategory name
          const { data: subcatRow } = await supabase.from("subcategories").select("name_fr").ilike("name_fr", subcatName).limit(1).single();
          if (subcatRow) {
            detectedSubcategory = subcatRow.name_fr;
            detectedSubcategoryFromKeyword = true;
            subcategorySearchConfig = config;
            console.log(`Auto-detected subcategory "${detectedSubcategory}" from config synonym match in query "${effectiveQuery}"`);
          }
          break;
        }
      }
    }
    // ── Pre-fetch services for synonym disambiguation (multi-word service check) ──
    const { data: allServicesForSynCheck } = await supabase.from("services").select("name_fr");
    // Helper: check if synonym key is part of a more specific multi-word service matching the query
    const synonymKeyMatchesMultiWordService = (key: string): boolean => {
      const qLowerFull = (effectiveQuery ?? "").toLowerCase().replace(/-/g, " ").replace(/\s+/g, " ").trim();
      const qWordsFull = qLowerFull.split(/\s+/).filter(w => w.length > 1 && !FRENCH_STOP_WORDS.has(w));
      if (qWordsFull.length < 2 || !allServicesForSynCheck) return false;
      const normSyn = (w: string): string => stripAccentsGlobal(w.toLowerCase().replace(/-/g, " ").replace(/\s+/g, " ").trim());
      const stripPlSyn = (w: string): string => { if (w.endsWith("aux")) return w.slice(0, -3) + "al"; if (w.endsWith("s")) return w.slice(0, -1); return w; };
      const normWordSyn = (w: string): string => stripAccentsGlobal(stripPlSyn(w));
      return allServicesForSynCheck.some((svc: any) => {
        const svcCW = normSyn(svc.name_fr).split(/\s+/).filter((w: string) => w.length > 1 && !FRENCH_STOP_WORDS.has(w));
        if (svcCW.length < 2) return false;
        const keyNorm = normSyn(key);
        const keyInSvc = svcCW.some((sw: string) => normWordSyn(sw) === normWordSyn(keyNorm));
        if (!keyInSvc) return false;
        return svcCW.every((sw: string) => qWordsFull.some(qw => normWordSyn(qw) === normWordSyn(sw)));
      });
    };
    // ── Synonym-linked subcategories: when a query word matches a synonym entry with subcategory_names ──
    // Check ALL query variants (effectiveQuery, original query, spoken) to catch natural language synonyms
    let synonymLinkedSubcategories: string[] = [];
    {
      const textsToCheck = [effectiveQuery, query, spoken].filter(Boolean) as string[];
      for (const [key, subcatNames] of Object.entries(synonymSubcategories)) {
        if (subcatNames.length === 0) continue;
        const keyLower = key.toLowerCase();
        const synValues = synonyms[key] || [];
        const allTerms = [keyLower, ...synValues.map(v => v.toLowerCase())];
        let matched = false;
        for (const text of textsToCheck) {
          const qLower = text.toLowerCase();
          const qWords = qLower.split(/\s+/);
          const qWordsStripped = qWords.map(w => stripAccentsGlobal(w));
          matched = allTerms.some(term => {
            const termStripped = stripAccentsGlobal(term);
            if (term.includes(" ")) {
              return qLower.includes(term) || stripAccentsGlobal(qLower).includes(termStripped);
            }
            const eq = (a: string, b: string) =>
              a === b ||
              (a.endsWith("s") && a.slice(0, -1) === b) ||
              (b.endsWith("s") && b.slice(0, -1) === a);
            return qWords.some(w => eq(w, term)) || qWordsStripped.some(w => eq(w, termStripped));
          });
          if (matched) break;
        }
        if (matched) {
          if (synonymKeyMatchesMultiWordService(key)) {
            console.log(`⏭️ Synonym "${key}" subcategory link skipped: query matches a more specific multi-word service`);
            continue;
          }
          synonymLinkedSubcategories = [...new Set([...synonymLinkedSubcategories, ...subcatNames])];
          console.log(`Synonym "${key}" matched → linked subcategories: [${subcatNames.join(", ")}]`);
        }
      }
    }
    // ── Synonym-linked services: when a query word matches a synonym entry with service_names ──
    // Check ALL query variants (effectiveQuery, original query, spoken) to catch natural language synonyms
    let synonymLinkedServices: string[] = [];
    {
      const textsToCheck = [effectiveQuery, query, spoken].filter(Boolean) as string[];
      for (const [key, svcNames] of Object.entries(synonymServices)) {
        if (svcNames.length === 0) continue;
        const keyLower = key.toLowerCase();
        const synValues = synonyms[key] || [];
        const allTerms = [keyLower, ...synValues.map(v => v.toLowerCase())];
        let matched = false;
        for (const text of textsToCheck) {
          const qLower = text.toLowerCase();
          const qWords = qLower.split(/\s+/);
          const qWordsStripped = qWords.map(w => stripAccentsGlobal(w));
          matched = allTerms.some(term => {
            const termStripped = stripAccentsGlobal(term);
            return term.includes(" ")
              ? (qLower.includes(term) || stripAccentsGlobal(qLower).includes(termStripped))
              : (qWords.includes(term) || qWordsStripped.includes(termStripped));
          });
          if (matched) break;
        }
        if (matched) {
          if (synonymKeyMatchesMultiWordService(key)) {
            console.log(`⏭️ Synonym "${key}" service link skipped: query matches a more specific multi-word service`);
            continue;
          }
          synonymLinkedServices = [...new Set([...synonymLinkedServices, ...svcNames])];
          console.log(`Synonym "${key}" matched → linked services: [${svcNames.join(", ")}]`);
        }
      }
    }
    // ── Synonym paired filters: when a query word matches a synonym entry with filters[] ──
    let matchedSynonymFilters: { subcategory_name: string | null; required_service: string | null }[] = [];
    const matchedSynonymFilterKeys: string[] = [];
    {
      const textsToCheck = [effectiveQuery, query, spoken].filter(Boolean) as string[];
      for (const [key, filters] of Object.entries(synonymFilters)) {
        if (filters.length === 0) continue;
        const keyLower = key.toLowerCase();
        const synValues = synonyms[key] || [];
        const allTerms = [keyLower, ...synValues.map(v => v.toLowerCase())];
        let matched = false;
        for (const text of textsToCheck) {
          const qLower = text.toLowerCase().replace(/-/g, " ").replace(/\s+/g, " ").trim();
          const qWords = qLower.split(/\s+/);
          const qWordsStripped = qWords.map(w => stripAccentsGlobal(w));
          matched = allTerms.some(term => {
            // Normalize hyphens in synonym terms too so "restaurant-spectacle" matches "restaurant spectacle"
            const termNorm = term.replace(/-/g, " ").replace(/\s+/g, " ").trim();
            const termStripped = stripAccentsGlobal(termNorm);
            if (termNorm.includes(" ")) {
              return qLower.includes(termNorm) || stripAccentsGlobal(qLower).includes(termStripped);
            }
            const eq = (a: string, b: string) =>
              a === b ||
              (a.endsWith("s") && a.slice(0, -1) === b) ||
              (b.endsWith("s") && b.slice(0, -1) === a);
            return qWords.some(w => eq(w, termNorm)) || qWordsStripped.some(w => eq(w, termStripped));
          });
          if (matched) break;
        }
        if (matched) {
          if (synonymKeyMatchesMultiWordService(key)) {
            console.log(`⏭️ Synonym "${key}" paired filters skipped: query matches a more specific multi-word service`);
            continue;
          }
          matchedSynonymFilters = [...matchedSynonymFilters, ...filters];
          matchedSynonymFilterKeys.push(key);
          console.log(`Synonym "${key}" matched → paired filters: ${JSON.stringify(filters)}`);
        }
      }
    }
    // ── Synonym badge: capture badge_id from synonyms (works alone OR with paired filters) ──
    let matchedSynonymBadgeId: string | null = null;
    let matchedSynonymBadgeKey: string | null = null;
    {
      const textsToCheck = [effectiveQuery, query, spoken].filter(Boolean) as string[];
      for (const [key, badgeId] of Object.entries(synonymBadges)) {
        const keyLower = key.toLowerCase();
        const synValues = synonyms[key] || [];
        const allTerms = [keyLower, ...synValues.map(v => v.toLowerCase())];
        let matched = false;
        for (const text of textsToCheck) {
          const qLower = text.toLowerCase().replace(/-/g, " ").replace(/\s+/g, " ").trim();
          const qWords = qLower.split(/\s+/);
          const qWordsStripped = qWords.map(w => stripAccentsGlobal(w));
          matched = allTerms.some(term => {
            const termNorm = term.replace(/-/g, " ").replace(/\s+/g, " ").trim();
            const termStripped = stripAccentsGlobal(termNorm);
            return termNorm.includes(" ")
              ? (qLower.includes(termNorm) || stripAccentsGlobal(qLower).includes(termStripped))
              : (qWords.includes(termNorm) || qWordsStripped.includes(termStripped));
          });
          if (matched) break;
        }
        if (matched) {
          matchedSynonymBadgeId = badgeId;
          matchedSynonymBadgeKey = key;
          console.log(`Synonym "${key}" matched → badge_id: ${badgeId}`);
          break;
        }
      }
    }
    //    feed them into synonymLinkedServices so the service shortcut handles them efficiently ──
    {
      const { data: bundleData } = await supabase
        .from("search_bundles")
        .select("keyword, required_service, time_slots")
        .eq("is_active", true);
      console.log(`Early bundle check: ${bundleData?.length ?? 0} active entries loaded`);
      if (bundleData && bundleData.length > 0 && effectiveQuery) {
        const textsToCheck = [effectiveQuery, query, spoken].filter(Boolean) as string[];
        const allText = textsToCheck.map(t => stripAccentsGlobal(t.toLowerCase())).join(" ");
        const allWords = new Set(allText.split(/\s+/));
        // Build synonym-expanded word set
        const expandedWords = new Set(allWords);
        for (const [synKey, synValues] of Object.entries(synonyms)) {
          const normalizedKey = stripAccentsGlobal(synKey.toLowerCase());
          const normalizedValues = synValues.map(sv => stripAccentsGlobal(sv.toLowerCase()));
          for (const sv of normalizedValues) {
            const svWords = sv.split(/\s+/);
            if (svWords.every(w => allWords.has(w))) {
              for (const w of normalizedKey.split(/\s+/)) expandedWords.add(w);
            }
          }
          if (normalizedKey.split(/\s+/).every(w => allWords.has(w))) {
            for (const sv of normalizedValues) {
              for (const w of sv.split(/\s+/)) expandedWords.add(w);
            }
          }
        }
        // Simple French plural stemmer
        const stemFr = (w: string): string => {
          if (w.length <= 3) return w;
          if (w.endsWith("eaux")) return w.slice(0, -1);
          if (w.endsWith("aux")) return w.slice(0, -2) + "l";
          if (w.endsWith("s") || w.endsWith("x")) return w.slice(0, -1);
          return w;
        };
        const stemSet = (words: Iterable<string>): Set<string> => {
          const s = new Set<string>();
          for (const w of words) { s.add(w); s.add(stemFr(w)); }
          return s;
        };
        const stemmedExpandedWords = stemSet(expandedWords);
        
        const uniqueKeywords = [...new Set(bundleData.map((b: any) => stripAccentsGlobal(b.keyword.toLowerCase())))];
        let matchedBundleKeyword = uniqueKeywords.find(kw => allWords.has(kw) || allText.includes(kw));
        if (!matchedBundleKeyword) {
          matchedBundleKeyword = uniqueKeywords.find(kw => {
            const kwWords = kw.split(/\s+/).filter(w => w.length > 1);
            return kwWords.length > 0 && kwWords.every(w => expandedWords.has(w));
          });
        }
        if (!matchedBundleKeyword) {
          matchedBundleKeyword = uniqueKeywords.find(kw => {
            const kwWords = kw.split(/\s+/).filter(w => w.length > 1);
            return kwWords.length > 0 && kwWords.every(w => stemmedExpandedWords.has(w) || stemmedExpandedWords.has(stemFr(w)));
          });
        }
        if (matchedBundleKeyword) {
          const entries = bundleData.filter((b: any) => stripAccentsGlobal(b.keyword.toLowerCase()) === matchedBundleKeyword);
          const bundleServices = entries
            .filter((e: any) => e.required_service)
            .map((e: any) => e.required_service as string);
          if (bundleServices.length > 0) {
            synonymLinkedServices = [...new Set([...synonymLinkedServices, ...bundleServices])];
            console.log(`⚡ Bundle "${matchedBundleKeyword}" services fed into shortcut: [${bundleServices.join(", ")}]`);
          }
        }
      }
    }
    // Auto-detect category from intent words when no explicit category is provided
    // Load intent word → category mappings from DB (supports multiple categories per word)
    let INTENT_TO_CATEGORY: Record<string, string> = {}; // flat lookup for noise filtering (first cat)
    let INTENT_TO_CATEGORIES: Record<string, string[]> = {}; // multi-category lookup
    let INTENT_MERGE_FLAGS: Record<string, boolean> = {};
    {
      const { data: intentWords } = await supabase
        .from("search_intent_words")
        .select("word, word_en, word_ar, category_name, merge_on_conflict")
        .eq("is_active", true);
      if (intentWords) {
        for (const iw of intentWords) {
          const variants = [iw.word, (iw as any).word_en, (iw as any).word_ar]
            .filter((w: any): w is string => typeof w === "string" && w.trim().length > 0)
            .map((w: string) => w.toLowerCase().trim());
          for (const wLower of variants) {
            if (!INTENT_TO_CATEGORY[wLower]) INTENT_TO_CATEGORY[wLower] = iw.category_name;
            if (!INTENT_TO_CATEGORIES[wLower]) INTENT_TO_CATEGORIES[wLower] = [];
            if (!INTENT_TO_CATEGORIES[wLower].includes(iw.category_name)) {
              INTENT_TO_CATEGORIES[wLower].push(iw.category_name);
            }
            INTENT_MERGE_FLAGS[wLower] = iw.merge_on_conflict;
          }
        }
        console.log(`Loaded ${intentWords.length} intent word mappings (FR/EN/AR variants)`);
      }
    }

    let intentCategories: string[] = [];
    let intentMergeOnConflict = true;
    // Always check intent words — even when a category is provided (e.g. from LLM voice intent)
    // Intent words from the DB should override the LLM-derived category
    {
      const queriesToCheck = [effectiveQuery, query, spoken].filter(Boolean) as string[];
      for (const q of queriesToCheck) {
        const qLower = q.toLowerCase();
        const qWords = qLower.split(/\s+/);
        // Check multi-word intent phrases first (e.g. "faire livrer")
        for (const intentPhrase of Object.keys(INTENT_TO_CATEGORIES)) {
          if (intentPhrase.includes(" ") && qLower.includes(intentPhrase)) {
            intentCategories = INTENT_TO_CATEGORIES[intentPhrase];
            intentMergeOnConflict = INTENT_MERGE_FLAGS[intentPhrase] ?? true;
            console.log(`Intent phrase "${intentPhrase}" → categories [${intentCategories.join(", ")}] (merge=${intentMergeOnConflict})`);
            break;
          }
        }
        if (intentCategories.length > 0) break;
        // Then check single words
        for (const w of qWords) {
          const wStripped = stripAccentsGlobal(w);
          const match = INTENT_TO_CATEGORIES[w] || INTENT_TO_CATEGORIES[wStripped];
          if (match) {
            intentCategories = match;
            intentMergeOnConflict = INTENT_MERGE_FLAGS[w] ?? INTENT_MERGE_FLAGS[wStripped] ?? true;
            console.log(`Intent word "${w}" → categories [${intentCategories.join(", ")}] (merge=${intentMergeOnConflict})`);
            break;
          }
        }
        if (intentCategories.length > 0) break;
      }
    }
    // Fallback: if no intent word matched, check whether the query directly names a main category
    // (e.g. "restauration", "hôtellerie", "tourisme", "santé"…)
    let queryIsMainCategory = false;
    if (intentCategories.length === 0) {
      const { data: mainCats } = await supabase
        .from("categories")
        .select("name_fr, name_en, name_ar");
      if (mainCats && mainCats.length > 0) {
        const queriesToCheck = [effectiveQuery, query, spoken].filter(Boolean) as string[];
        const catLookup: { norm: string; name: string }[] = [];
        for (const c of mainCats) {
          for (const n of [c.name_fr, c.name_en, c.name_ar].filter(Boolean) as string[]) {
            catLookup.push({ norm: stripAccentsGlobal(n.toLowerCase().trim()), name: c.name_fr });
          }
        }
        outer: for (const q of queriesToCheck) {
          const qNorm = stripAccentsGlobal(q.toLowerCase().trim());
          const qWords = new Set(qNorm.split(/\s+/).filter(Boolean));
          for (const { norm, name } of catLookup) {
            if (qNorm === norm || qWords.has(norm)) {
              intentCategories = [name];
              intentMergeOnConflict = true;
              queryIsMainCategory = true;
              console.log(`Main-category match "${norm}" → category "${name}"`);
              break outer;
            }
          }
        }
      }
    }
    // Backward compat: single intentCategory for conflict detection and response
    const intentCategory: string | null = intentCategories.length > 0 ? intentCategories[0] : null;
    // Build effective categories array for filtering
    const effectiveCategories: string[] = intentCategories.length > 0 ? intentCategories : (category ? [category] : []);
    const effectiveCategory: string | undefined = effectiveCategories[0] || undefined;
    if (intentCategory && category && intentCategory !== category) {
      console.log(`Intent category "${intentCategory}" overrides URL category "${category}"`);
    }

    // ── Guard: clear LLM-injected subcategory when intent maps to parent category ──
    // If the LLM rewrote the query and introduced a subcategory name that wasn't in the
    // original user query, and an intent word was detected, clear the subcategory lock
    // so ALL subcategories of the intent category are returned.
    // Example: user says "dormir face au coucher de soleil à essaouira"
    //   → LLM extracts "hôtel mer vue Essaouira" (injecting "hôtel")
    //   → "Hôtel" subcategory auto-detected, but user never said "hôtel"
    //   → clear lock so Riads, Maisons d'hôtes etc. also appear
    if (detectedSubcategory && intentCategory && effectiveQuery !== query && !detectedSubcategoryFromKeyword) {
      const originalLower = (query ?? "").toLowerCase();
      const subcatLower = detectedSubcategory.toLowerCase();
      const subcatWords = subcatLower.split(/[\s/]+/).filter((w: string) => w.length > 2);
      const originalWords = originalLower.split(/\s+/);
      const subcatInOriginal = subcatWords.some((sw: string) =>
        originalWords.some((ow: string) => ow === sw || stripAccentsGlobal(ow) === stripAccentsGlobal(sw))
      );
      if (!subcatInOriginal) {
        console.log(`Clearing LLM-injected subcategory "${detectedSubcategory}" — not present in original query "${query}"`);
        detectedSubcategory = null;
        detectedSubcategoryIsReal = false;
        subcategoryParentCategory = null;
      }
    } else if (detectedSubcategory && intentCategory && effectiveQuery !== query && detectedSubcategoryFromKeyword) {
      console.log(`Keeping keyword-detected subcategory "${detectedSubcategory}" from rewritten query "${effectiveQuery}"`);
    }

    // ── Detect category-subcategory conflict ──
    // When the effective category (from intent OR explicit URL param) conflicts with detected subcategory's parent,
    // try to find a better subcategory under the target category, or merge results from both
    let intentSubcategoryConflict = false;
    let conflictSubcategoryParentCategory: string | null = null;
    const categoryForConflictCheck = intentCategory || category || null;
    const allIntentCats = intentCategories.length > 0 ? intentCategories : (category ? [category] : []);
    // Guard: if synonym paired filters are active and they cover the detected subcategory,
    // do NOT let intent words override it (e.g. "dîner spectacle" → synonym covers "Spectacles",
    // but intent "diner" would switch to "Restaurant" — we must keep "Spectacles").
    const synonymCoversDetectedSubcat = detectedSubcategory && matchedSynonymFilters.length > 0 && (() => {
      const normSub = stripAccentsGlobal(detectedSubcategory!.toLowerCase().replace(/-/g, " ").replace(/\s+/g, " ").trim());
      return matchedSynonymFilters.some(f => f.subcategory_name && stripAccentsGlobal(f.subcategory_name.toLowerCase().replace(/-/g, " ").replace(/\s+/g, " ").trim()) === normSub);
    })();
    if (synonymCoversDetectedSubcat) {
      console.log(`🛡️ Synonym paired filters cover detected subcategory "${detectedSubcategory}" — skipping intent-based re-evaluation`);
    }
    if (categoryForConflictCheck && detectedSubcategory && !synonymCoversDetectedSubcat) {
      const { data: subcatWithCat } = await supabase
        .from("subcategories")
        .select("name_fr, categories!inner(name_fr)")
        .eq("name_fr", detectedSubcategory)
        .limit(1)
        .single();
      if (subcatWithCat) {
        const parentCatName = (subcatWithCat as any).categories?.name_fr;
        // Check if subcategory's parent matches the intent categories
        const parentInIntentCats = parentCatName && allIntentCats.includes(parentCatName);
        // When multiple intent categories exist and subcategory matches ONE of them,
        // check if other intent categories have a related subcategory to merge
        // e.g. "acheter poisson" → intent=[Commerce, Agriculture], detected="Poisson" (Agriculture)
        // → also find "Poissonnerie" (Commerce) and merge
        const otherIntentCats = parentInIntentCats && allIntentCats.length > 1
          ? allIntentCats.filter(c => c !== parentCatName)
          : [];
        if (parentCatName && (!parentInIntentCats || otherIntentCats.length > 0)) {
          // Before declaring a conflict, check if there's a better subcategory under the target category
          // e.g. "poisson" + category=Commerce → detected="Poisson" (Agriculture)
          // → prefer "Poissonnerie" (Commerce) which has "poisson" in its keywords
          const qLower = (effectiveQuery || "").toLowerCase();
          const qWords = qLower.split(/\s+/).filter((w: string) => w.length > 1 && !FRENCH_STOP_WORDS.has(w));
          const normalizeWordRe = (w: string): string => stripAccentsGlobal(w.toLowerCase().replace(/s$/, ""));
          // Search under the non-matching categories (or all if none match)
          const catsToSearch = otherIntentCats.length > 0 ? otherIntentCats : [categoryForConflictCheck!];
          let betterSubcat: string | null = null;
          let bestScore = 0;
          for (const catToSearch of catsToSearch) {
            const { data: targetSubcats } = await supabase
              .from("subcategories")
              .select("name_fr, keywords, categories!inner(name_fr)")
              .eq("categories.name_fr", catToSearch);
            if (targetSubcats) {
              for (const sc of targetSubcats) {
                const scName = (sc.name_fr || "").toLowerCase();
                const scKws: string[] = ((sc as any).keywords || []).map((k: string) => k.toLowerCase());
                const scNameWords = scName.split(/\s+/).filter((w: string) => w.length > 1);
                const nameMatch = qWords.some((qw: string) => scNameWords.some((nw: string) => normalizeWordRe(qw) === normalizeWordRe(nw)));
                const kwMatch = qWords.some(qw => scKws.some(k => {
                  if (k.includes(" ")) {
                    const kWords = k.split(/\s+/).filter((w: string) => w.length > 1 && !FRENCH_STOP_WORDS.has(w));
                    return kWords.length > 0 && kWords.every(kw => qWords.some(qw2 => normalizeWordRe(qw2) === normalizeWordRe(kw)));
                  }
                  return normalizeWordRe(k) === normalizeWordRe(qw);
                }));
                if (nameMatch || kwMatch) {
                  const score = (nameMatch ? 2 : 0) + (kwMatch ? 1 : 0);
                  if (score > bestScore) {
                    bestScore = score;
                    betterSubcat = sc.name_fr;
                  }
                }
              }
            }
            // If no subcategory matched, check if a SERVICE under the target category matches
            if (!betterSubcat) {
              const { data: targetServices } = await supabase
                .from("services")
                .select("name_fr, keywords, subcategories!inner(name_fr, categories!inner(name_fr))")
                .eq("is_active", true)
                .eq("subcategories.categories.name_fr", catToSearch);
              if (targetServices) {
                for (const svc of targetServices) {
                  const svcName = (svc.name_fr || "").toLowerCase();
                  const svcNameNorm = normalizeWordRe(svcName);
                  const svcKws: string[] = ((svc as any).keywords || []).map((k: string) => k.toLowerCase());
                  const nameHit = qWords.some(qw => normalizeWordRe(qw) === svcNameNorm);
                  const kwHit = qWords.some(qw => svcKws.some(k => {
                    if (k.includes(" ")) {
                      const kWords = k.split(/\s+/).filter((w: string) => w.length > 1 && !FRENCH_STOP_WORDS.has(w));
                      return kWords.length > 0 && kWords.every(kw => qWords.some(qw2 => normalizeWordRe(qw2) === normalizeWordRe(kw)));
                    }
                    return normalizeWordRe(k) === normalizeWordRe(qw);
                  }));
                  if (nameHit || kwHit) {
                    betterSubcat = (svc as any).subcategories?.name_fr;
                    console.log(`Category-subcategory re-evaluation via SERVICE: "${svc.name_fr}" (match=${nameHit ? "name" : "keyword"}) found under "${betterSubcat}" (${catToSearch})`);
                    // Force the chosen service as a required filter downstream
                    if (!forcedServiceFromReeval) forcedServiceFromReeval = svc.name_fr;
                    break;
                  }
                }
              }
            }
          }
          if (betterSubcat && !parentInIntentCats) {
            // Full conflict resolved: switch to better subcategory
            console.log(`Category-subcategory re-evaluation: switching from "${detectedSubcategory}" (${parentCatName}) to "${betterSubcat}" (${catsToSearch.join(", ")}) — better match for category`);
            detectedSubcategory = betterSubcat;
            // Update parent category to the new target so downstream disambiguation works correctly
            // (e.g. service validation can find the right "Décoration" when multiple exist)
            subcategoryParentCategory = catsToSearch[0];
            // Reset keyword-linked subcategories: they were collected for the PREVIOUS detected
            // subcategory (e.g. "Piscine" → [Beach club, Hôtel]) and would otherwise be merged
            // into the new one, leaking unrelated subcategories (e.g. Beach club into Hôtel results).
            keywordLinkedSubcategories = [];
            keywordLinkedOwnerSubcategory = null;
          } else if (betterSubcat && parentInIntentCats) {
            // Multi-intent: detected subcategory is valid for one intent, but there's also a match in another
            // Trigger merge so both subcategories appear in results
            intentSubcategoryConflict = true;
            conflictSubcategoryParentCategory = parentCatName;
            console.log(`Multi-intent merge: "${detectedSubcategory}" (${parentCatName}) + "${betterSubcat}" (${catsToSearch.join(", ")}) — will merge results from both`);
          } else if (!parentInIntentCats && intentCategory && intentMergeOnConflict) {
            intentSubcategoryConflict = true;
            conflictSubcategoryParentCategory = parentCatName;
            console.log(`Intent-subcategory conflict: intent="${intentCategory}" vs subcategory "${detectedSubcategory}" parent="${parentCatName}" → will merge results`);
          } else if (!parentInIntentCats && category) {
            console.log(`Explicit category "${category}" conflicts with detected subcategory "${detectedSubcategory}" (${parentCatName}) — dropping subcategory`);
            detectedSubcategory = null;
          }
        }
      }
    }

    // ── SERVICE SHORTCUT: when synonym has paired filters OR legacy service_names, skip FTS chain ──
    // Paired filters (new): each row = subcategory + optional service (like bundles)
    // Legacy: flat service_names[] + subcategory_names[] arrays
    let serviceShortcutActivated = false;
    let synonymsScopedOut = false;
    if (matchedSynonymBadgeId && matchedSynonymFilters.length === 0) {
      // ── BADGE-ONLY synonym: fetch businesses via business_badges join ──
      // ── INTERSECT with detected subcategory (if any) so specific subcats like
      //    "Aquaparc" aren't drowned by a generic badge like "famille".
      const badgeIntersectSubcat = detectedSubcategory || null;
      console.log(`⚡ Synonym badge-only PRIORITY: badge_id=${matchedSynonymBadgeId}${badgeIntersectSubcat ? ` ∩ subcat="${badgeIntersectSubcat}"` : ""} — skipping FTS`);
      const { data: bbData } = await supabase
        .from("business_badges")
        .select("business_id")
        .eq("badge_id", matchedSynonymBadgeId);
      if (bbData && bbData.length > 0) {
        const badgeBizIds = bbData.map((bb: any) => bb.business_id);
        let builder = supabase.from("businesses").select("*")
          .eq("is_active", true)
          .in("id", badgeBizIds);
        if (badgeIntersectSubcat) {
          builder = builder.contains("categories", [badgeIntersectSubcat]);
        }
        // Note: badge is already a strong constraint (curated list of businesses).
        // Skip city/neighborhood filters when the synonym key itself matches the city/neighborhood name
        // (e.g. "agafay" → badge Agafay, businesses live in city="Agafay" but no neighborhood set).
        const synKeyNorm = matchedSynonymBadgeKey ? stripAccentsGlobal(matchedSynonymBadgeKey.toLowerCase()).trim() : "";
        const cityMatchesSynKey = effectiveCity && synKeyNorm && stripAccentsGlobal(effectiveCity.toLowerCase()).trim() === synKeyNorm;
        const neighMatchesSynKey = detectedNeighborhood && synKeyNorm && stripAccentsGlobal(detectedNeighborhood.toLowerCase()).trim() === synKeyNorm;
        if (effectiveCity && !cityMatchesSynKey) builder = applyCityFilter(builder);
        if (detectedNeighborhood && !neighMatchesSynKey) {
          builder = builder.or(buildNeighborhoodOrClause(detectedNeighborhood, loadedNeighborhoods));
        }
        builder = builder
          .order("wtuce_status", { ascending: true })
          .order("google_rating", { ascending: false, nullsFirst: false })
          .order("priority_score", { ascending: false })
          .limit(limit);
        const { data, error } = await builder;
        if (!error && data && data.length > 0) {
          businesses = data.map((b: any) => ({
            ...b,
            distance_km: latitude && longitude && b.latitude && b.longitude
              ? calculateDistance(latitude, longitude, b.latitude, b.longitude) : null,
          }));
          searchLevel = "exact";
          serviceShortcutActivated = true;
          console.log(`⚡ Synonym badge-only complete: ${businesses.length} results — skipping FTS chain`);
          // Apply engagement/commodity post-filter for badge-only synonyms
          if (matchedSynonymBadgeKey) {
            const reqEng = synonymEngagements[matchedSynonymBadgeKey] || [];
            const reqCom = synonymCommodities[matchedSynonymBadgeKey] || [];
            if (reqEng.length > 0 || reqCom.length > 0) {
              const before = businesses.length;
              businesses = businesses.filter(b => {
                const bizEngs: string[] = b.engagements || [];
                // Engagements use AND logic (all must match)
                for (const eng of reqEng) { if (!bizEngs.includes(eng)) return false; }
                // Commodities use OR logic (at least one must match)
                if (reqCom.length > 0 && !reqCom.some(com => bizEngs.includes(`Logistique:${com}`))) return false;
                return true;
              });
              console.log(`⚡ Badge-only eng/com filter: ${before} → ${businesses.length}`);
            }
          }
        }
      }
    } else if (matchedSynonymFilters.length > 0) {
      // ── NEW: Paired filters mode ──
      console.log(`⚡ Synonym paired filters PRIORITY: ${matchedSynonymFilters.length} filter(s) — skipping FTS`);
      const existingIds = new Set<string>();
      // If a subcategory was explicitly detected in the query, check if any paired filter covers it.
      // If NOT, the detected subcategory is more specific than the synonym — skip paired filters entirely
      // and fall through to FTS/subcategory-based search (e.g. "location moto" → "Location motos" not in synonym "location" filters).
      const normalizeSubcat = (v: string) => stripAccentsGlobal(v.toLowerCase().replace(/-/g, " ").replace(/\s+/g, " ").trim());
      const detectedSubNorm = detectedSubcategory ? normalizeSubcat(detectedSubcategory) : null;
      const pairedFilterCoversDetected = detectedSubNorm
        ? matchedSynonymFilters.some(f => f.subcategory_name && normalizeSubcat(f.subcategory_name) === detectedSubNorm)
        : true; // no detected subcategory → let paired filters run normally
      let shouldRunPairedFilters = !detectedSubcategory || pairedFilterCoversDetected;

      if (detectedSubcategory && !pairedFilterCoversDetected) {
        const onlyServiceSynonymFilters = matchedSynonymFilters.every(f => !f.subcategory_name && !!f.required_service);
        if (onlyServiceSynonymFilters) {
          console.log(`🔓 Service-only synonym filters override detected place subcategory "${detectedSubcategory}"`);
          detectedSubcategory = null;
          shouldRunPairedFilters = true;
        } else {
          console.log(`🔀 Detected subcategory "${detectedSubcategory}" NOT in synonym paired filters — skipping synonym shortcut, falling through to subcategory search`);
          // Don't run paired filters — let the engine proceed to FTS/subcategory logic below
        }
      }

      if (shouldRunPairedFilters) {
      if (detectedSubcategory) {
        console.log(`🔓 Synonym filters present (${matchedSynonymFilters.length}) — covers detected subcategory "${detectedSubcategory}"`);
      }
      const scopedSynonymFilters = matchedSynonymFilters;
      for (const filter of scopedSynonymFilters) {
        let builder = supabase.from("businesses").select("*").eq("is_active", true);
        // Apply subcategory filter
        if (filter.subcategory_name) {
          builder = builder.contains("categories", [filter.subcategory_name]);
        }
        // Apply service filter
        if (filter.required_service) {
          builder = builder.filter("services", "cs", `{"${filter.required_service}"}`);
        }
        if (effectiveCity) builder = applyCityFilter(builder);
        if (detectedNeighborhood) {
          builder = builder.or(buildNeighborhoodOrClause(detectedNeighborhood, loadedNeighborhoods));
        }
        builder = builder
          .order("wtuce_status", { ascending: true })
          .order("google_rating", { ascending: false, nullsFirst: false })
          .order("priority_score", { ascending: false })
          .limit(limit);
        const { data, error } = await builder;
        if (!error && data && data.length > 0) {
          const newResults = data
            .filter((b: any) => !existingIds.has(b.id))
            .map((b: any) => ({
              ...b,
              distance_km: latitude && longitude && b.latitude && b.longitude
                ? calculateDistance(latitude, longitude, b.latitude, b.longitude) : null,
            }));
          for (const b of newResults) existingIds.add(b.id);
          businesses = [...businesses, ...newResults];
          console.log(`⚡ Filter [${filter.subcategory_name || "*"} + ${filter.required_service || "—"}]: +${newResults.length} (total: ${businesses.length})`);
        }
      }
      if (businesses.length > 0) {
        searchLevel = "exact";
        serviceShortcutActivated = true;

        // ── KEYWORD PINNING INJECTION: merge businesses matched via keywords ──
        // When synonym paired filters are active, keyword-pinned businesses must also
        // satisfy at least one paired filter (subcategory + service) to avoid false positives
        // like Decathlon appearing for "louer un vélo" when it's not a rental business.
        if (keywordPinnedIds.size > 0) {
          const existingIds = new Set(businesses.map(b => b.id));
          const missingKwIds = [...keywordPinnedIds].filter(id => !existingIds.has(id));
          if (missingKwIds.length > 0) {
            const { data: kwBiz } = await supabase
              .from("businesses").select("*")
              .in("id", missingKwIds).eq("is_active", true);
            if (kwBiz && kwBiz.length > 0) {
              // Filter keyword-pinned businesses against synonym paired filters
              const filtered = kwBiz.filter((b: any) => {
                return matchedSynonymFilters.some(f => {
                  const subcatOk = !f.subcategory_name || (b.categories && b.categories.includes(f.subcategory_name));
                  const svcOk = !f.required_service || (b.services && b.services.includes(f.required_service));
                  return subcatOk && svcOk;
                });
              });
              if (filtered.length > 0) {
                const mapped = filtered.map((b: any) => ({ ...b, distance_km: null }));
                businesses = [...mapped, ...businesses];
                console.log(`⚡ Keyword-pinned injection: +${mapped.length} [${mapped.map((b: any) => b.name).join(", ")}]`);
              }
              if (filtered.length < kwBiz.length) {
                const excluded = kwBiz.filter((b: any) => !filtered.includes(b));
                console.log(`⚡ Keyword-pinned excluded by synonym filter: [${excluded.map((b: any) => b.name).join(", ")}]`);
              }
            }
          }
        }

        console.log(`⚡ Synonym filters complete: ${businesses.length} results — skipping FTS chain`);

        // ── BADGE MERGE: if the synonym also has a badge_id, merge badge-matched businesses ──
        // Only include badge-matched businesses that also have at least one required_service
        // from the paired filters (prevents e.g. Leone Discoteca with "Live Show" badge but without the service)
        if (matchedSynonymBadgeId) {
          const requiredServicesFromFilters = matchedSynonymFilters
            .map(f => f.required_service)
            .filter(Boolean) as string[];
          const existingBadgeIds = new Set(businesses.map(b => b.id));
          const { data: bbData } = await supabase
            .from("business_badges")
            .select("business_id")
            .eq("badge_id", matchedSynonymBadgeId);
          if (bbData && bbData.length > 0) {
            const missingBadgeBizIds = bbData.map((bb: any) => bb.business_id).filter((id: string) => !existingBadgeIds.has(id));
            if (missingBadgeBizIds.length > 0) {
              let badgeBuilder = supabase.from("businesses").select("*")
                .eq("is_active", true)
                .in("id", missingBadgeBizIds);
              if (effectiveCity) badgeBuilder = applyCityFilter(badgeBuilder);
              const { data: badgeBiz, error: badgeErr } = await badgeBuilder;
              if (!badgeErr && badgeBiz && badgeBiz.length > 0) {
                // Post-filter: if paired filters specify required services, badge-merged businesses
                // must also have at least one of those services
                const filtered = requiredServicesFromFilters.length > 0
                  ? badgeBiz.filter((b: any) => {
                      const bizServices: string[] = (b.services || []);
                      return requiredServicesFromFilters.some(rs => bizServices.includes(rs));
                    })
                  : badgeBiz;
                const mapped = filtered.map((b: any) => ({
                  ...b,
                  distance_km: latitude && longitude && b.latitude && b.longitude
                    ? calculateDistance(latitude, longitude, b.latitude, b.longitude) : null,
                }));
                businesses = [...businesses, ...mapped];
                if (filtered.length < badgeBiz.length) {
                  console.log(`⚡ Badge merge (${matchedSynonymBadgeId}): ${badgeBiz.length} badge matches → ${filtered.length} after service filter [${requiredServicesFromFilters.join(", ")}] (total: ${businesses.length})`);
                } else {
                  console.log(`⚡ Badge merge (${matchedSynonymBadgeId}): +${mapped.length} businesses (total: ${businesses.length})`);
                }
              }
            }
          }
        }

        // ── ENGAGEMENT/COMMODITY MERGE + FILTER ──
        {
          const allMatchedKeys = [...matchedSynonymFilterKeys];
          if (matchedSynonymBadgeKey && !allMatchedKeys.includes(matchedSynonymBadgeKey)) allMatchedKeys.push(matchedSynonymBadgeKey);
          const requiredEngagements: string[] = [];
          const requiredCommodities: string[] = [];
          for (const k of allMatchedKeys) {
            if (synonymEngagements[k]) requiredEngagements.push(...synonymEngagements[k]);
            if (synonymCommodities[k]) requiredCommodities.push(...synonymCommodities[k]);
          }
          if (requiredEngagements.length > 0 || requiredCommodities.length > 0) {
            // First, MERGE additional businesses that match the commodity/engagement filters
            // but were not found by the service-based paired filters
            const existingIdsForMerge = new Set(businesses.map(b => b.id));
            const commodityConditions = requiredCommodities.map(com => `Logistique:${com}`);
            const allEngConditions = [...requiredEngagements, ...commodityConditions];
            if (allEngConditions.length > 0) {
              // Fetch businesses that have ANY of the required engagement/commodity tags
              for (const engTag of allEngConditions) {
                let engBuilder = supabase.from("businesses").select("*")
                  .eq("is_active", true)
                  .contains("engagements", [engTag]);
                if (effectiveCity) engBuilder = applyCityFilter(engBuilder);
                if (detectedNeighborhood) {
                  engBuilder = engBuilder.or(buildNeighborhoodOrClause(detectedNeighborhood, loadedNeighborhoods));
                }
                engBuilder = engBuilder.order("wtuce_status", { ascending: true })
                  .order("google_rating", { ascending: false, nullsFirst: false })
                  .limit(limit);
                const { data: engData } = await engBuilder;
                if (engData) {
                  const newResults = engData
                    .filter((b: any) => !existingIdsForMerge.has(b.id))
                    .map((b: any) => ({
                      ...b,
                      distance_km: latitude && longitude && b.latitude && b.longitude
                        ? calculateDistance(latitude, longitude, b.latitude, b.longitude) : null,
                    }));
                  for (const b of newResults) existingIdsForMerge.add(b.id);
                  businesses = [...businesses, ...newResults];
                  if (newResults.length > 0) {
                    console.log(`⚡ Engagement/commodity merge ("${engTag}"): +${newResults.length} (total: ${businesses.length})`);
                  }
                }
              }
            }

            // Then, POST-FILTER: keep only businesses that match engagements AND/OR commodities
            const before = businesses.length;
            businesses = businesses.filter(b => {
              const bizEngs: string[] = b.engagements || [];
              // Engagements use AND logic (all must match)
              for (const eng of requiredEngagements) {
                if (!bizEngs.includes(eng)) return false;
              }
              // Commodities use OR logic (at least one must match)
              if (requiredCommodities.length > 0 && !requiredCommodities.some(com => bizEngs.includes(`Logistique:${com}`))) return false;
              return true;
            });
            console.log(`⚡ Engagement/commodity filter: ${before} → ${businesses.length} (eng: [${requiredEngagements.join(",")}], com: [${requiredCommodities.join(",")}])`);
          }
        }
        
        // ── POST-FILTER: intersect additional services detected in remaining query words ──
        if (businesses.length > 1 && effectiveQuery) {
          const pairedConsumedWords = new Set<string>();
          const addConsumed = (text: string) => {
            for (const w of text.toLowerCase().split(/[\s-]+/)) {
              pairedConsumedWords.add(w);
              pairedConsumedWords.add(stripAccentsGlobal(w));
            }
          };
          for (const f of matchedSynonymFilters) {
            if (f.subcategory_name) addConsumed(f.subcategory_name);
            if (f.required_service) addConsumed(f.required_service);
          }
          // Also consume synonym key words AND synonym value words that triggered the match
          // Track synonym key words separately for multi-word service detection
          const synonymKeyConsumedWords = new Set<string>();
          for (const key of matchedSynonymFilterKeys) {
            addConsumed(key);
            for (const w of key.toLowerCase().split(/[\s-]+/)) {
              synonymKeyConsumedWords.add(w);
              synonymKeyConsumedWords.add(stripAccentsGlobal(w));
            }
            const synVals = synonyms[key] || [];
            for (const sv of synVals) addConsumed(sv);
          }
          console.log(`🔑 Paired consumed words: [${[...pairedConsumedWords].join(", ")}] (keys: [${matchedSynonymFilterKeys.join(", ")}])`);
          // Also exclude detected city/neighborhood/subcategory words from remaining
          if (effectiveCity) { for (const w of effectiveCity.toLowerCase().split(/[\s-]+/)) { pairedConsumedWords.add(w); pairedConsumedWords.add(stripAccentsGlobal(w)); } }
          if (detectedNeighborhood) { for (const w of detectedNeighborhood.toLowerCase().split(/[\s-]+/)) { pairedConsumedWords.add(w); pairedConsumedWords.add(stripAccentsGlobal(w)); } }
          if (detectedSubcategory) { for (const w of detectedSubcategory.toLowerCase().split(/[\s-]+/)) { pairedConsumedWords.add(w); pairedConsumedWords.add(stripAccentsGlobal(w)); } }
          const pairedRemainingWords = effectiveQuery.toLowerCase().split(/\s+/)
            .filter(w => w.length > 1 && !FRENCH_STOP_WORDS.has(w) && !NOISE_ADJECTIVES.has(w) && !pairedConsumedWords.has(w) && !pairedConsumedWords.has(stripAccentsGlobal(w)));
          if (pairedRemainingWords.length > 0) {
            console.log(`🔍 Paired post-filter: remaining words [${pairedRemainingWords.join(", ")}]`);
            const stripPlR = (w: string): string => { if (w.endsWith("aux")) return w.slice(0, -3) + "al"; if (w.endsWith("s")) return w.slice(0, -1); return w; };
            const normR = (w: string): string => stripAccentsGlobal(stripPlR(w));
            const { data: allSvcs } = await supabase.from("services").select("name_fr");
            if (allSvcs) {
              const extraServices: string[] = [];
              for (const svc of allSvcs) {
                const svcNorm = stripAccentsGlobal(svc.name_fr.toLowerCase().replace(/-/g, " "));
                const svcCW = svcNorm.split(/\s+/).filter((w: string) => w.length > 1 && !FRENCH_STOP_WORDS.has(w));
                if (svcCW.length === 0) continue;
                // Check if ALL content words are in remaining words (original logic)
                const allInRemaining = svcCW.every((sw: string) => pairedRemainingWords.some(rw => normR(rw) === sw || normR(rw) === stripPlR(sw)));
                if (allInRemaining) {
                  extraServices.push(svc.name_fr);
                  continue;
                }
                // NEW: For multi-word services, check if words span remaining + synonym key words,
                // with at least one word in remaining. This catches "Plats à tajine" when
                // "tajine" was consumed by the synonym but "plats" remains.
                // Only use synonym KEY words (not all consumed words) to avoid false positives
                // like "Plats cuisinés" matching because "cuisine" is a consumed service name word.
                if (svcCW.length >= 2) {
                  const hasAtLeastOneRemaining = svcCW.some((sw: string) => pairedRemainingWords.some(rw => normR(rw) === sw || normR(rw) === stripPlR(sw)));
                  const allInRemainingOrSynonymKey = svcCW.every((sw: string) => {
                    const inRemaining = pairedRemainingWords.some(rw => normR(rw) === sw || normR(rw) === stripPlR(sw));
                    const inSynonymKey = synonymKeyConsumedWords.has(sw) || synonymKeyConsumedWords.has(stripPlR(sw));
                    return inRemaining || inSynonymKey;
                  });
                  if (hasAtLeastOneRemaining && allInRemainingOrSynonymKey) {
                    extraServices.push(svc.name_fr);
                    console.log(`🔍 Multi-word service "${svc.name_fr}" spans remaining+synonym key words`);
                  }
                }
              }
              // Separate services found via remaining-only vs remaining+synonym-key
              // remaining-only services use AND (original logic), synonym-spanning use OR filter
              const remainingOnlyServices: string[] = [];
              const synonymSpanningServices: string[] = [];
              for (const svc of extraServices) {
                const svcNorm = stripAccentsGlobal(svc.toLowerCase().replace(/-/g, " "));
                const svcCW = svcNorm.split(/\s+/).filter((w: string) => w.length > 1 && !FRENCH_STOP_WORDS.has(w));
                const allInRemaining = svcCW.every((sw: string) => pairedRemainingWords.some(rw => normR(rw) === sw || normR(rw) === stripPlR(sw)));
                if (allInRemaining) remainingOnlyServices.push(svc);
                else synonymSpanningServices.push(svc);
              }
              const uniqueRemainingOnly = [...new Map(remainingOnlyServices.map(n => [stripAccentsGlobal(n.toLowerCase().replace(/-/g, " ")), n])).values()];
              const uniqueSynonymSpanning = [...new Map(synonymSpanningServices.map(n => [stripAccentsGlobal(n.toLowerCase().replace(/-/g, " ")), n])).values()];
              
              if (uniqueRemainingOnly.length > 0 || uniqueSynonymSpanning.length > 0) {
                const bc = businesses.length;
                const filtered = businesses.filter((b: any) => {
                  const bSvcs = ((b.services || []) as string[]).map((s: string) => stripAccentsGlobal(s.toLowerCase().replace(/-/g, " ")));
                  // Remaining-only services: require ALL (AND)
                  const remainingOk = uniqueRemainingOnly.every(req => bSvcs.some(bs => bs === stripAccentsGlobal(req.toLowerCase().replace(/-/g, " "))));
                  // Synonym-spanning services: require ANY (OR) — they're more specific alternatives
                  const synonymOk = uniqueSynonymSpanning.length === 0 || uniqueSynonymSpanning.some(req => bSvcs.some(bs => bs === stripAccentsGlobal(req.toLowerCase().replace(/-/g, " "))));
                  return remainingOk && synonymOk;
                });
                // Safety net: if post-filter drops ALL results, keep original synonym results
                // This prevents cases like "location villa" where "location" matches a service
                // but none of the villa businesses have that service
                if (filtered.length > 0) {
                  businesses = filtered;
                  console.log(`🔍 Paired post-filter: remaining-AND [${uniqueRemainingOnly.join(", ")}], synonym-OR [${uniqueSynonymSpanning.join(", ")}] → ${bc} → ${businesses.length}`);
                } else {
                  console.log(`🔍 Paired post-filter would drop ALL results (remaining-AND [${uniqueRemainingOnly.join(", ")}]) → keeping ${bc} original results`);
                }
              }
            }
          }
        }
      }
      } // end else (paired filters cover detected subcategory)
    } else if (synonymLinkedServices.length > 0) {
      // ── LEGACY: flat arrays mode (backward compat for entries without filters) ──
      const hasSubcatScope = synonymLinkedSubcategories.length > 0;
      console.log(`⚡ Service shortcut PRIORITY (legacy): fetching businesses with services [${synonymLinkedServices.join(", ")}]${hasSubcatScope ? ` scoped to subcategories [${synonymLinkedSubcategories.join(", ")}]` : ""} — skipping FTS`);
      const existingIds = new Set<string>();
      for (const svcName of synonymLinkedServices) {
        let svcBuilder = supabase.from("businesses").select("*").eq("is_active", true)
          .filter("services", "cs", `{"${svcName}"}`);
        if (hasSubcatScope) {
          svcBuilder = svcBuilder.overlaps("categories", synonymLinkedSubcategories);
        }
        if (effectiveCity) svcBuilder = applyCityFilter(svcBuilder);
        if (detectedNeighborhood) {
          svcBuilder = svcBuilder.or(buildNeighborhoodOrClause(detectedNeighborhood, loadedNeighborhoods));
        }
        svcBuilder = svcBuilder
          .order("wtuce_status", { ascending: true })
          .order("google_rating", { ascending: false, nullsFirst: false })
          .order("priority_score", { ascending: false })
          .limit(limit);
        const { data: svcData, error: svcError } = await svcBuilder;
        if (!svcError && svcData && svcData.length > 0) {
          const newResults = svcData
            .filter((b: any) => !existingIds.has(b.id))
            .map((b: any) => ({
              ...b,
              distance_km: latitude && longitude && b.latitude && b.longitude
                ? calculateDistance(latitude, longitude, b.latitude, b.longitude) : null,
            }));
          for (const b of newResults) existingIds.add(b.id);
          businesses = [...businesses, ...newResults];
          console.log(`⚡ Service shortcut "${svcName}": +${newResults.length} results (total: ${businesses.length})`);
        }
      }
      if (businesses.length > 0) {
        searchLevel = "exact";
        serviceShortcutActivated = true;
        console.log(`⚡ Service shortcut complete: ${businesses.length} results — skipping FTS chain`);
      }

      // ── POST-FILTER: intersect additional services detected in query ──
      // e.g. "tapis sur mesure" → synonym matched "tapis" (service "Tapis"),
      // but "sur mesure" also matches service "Sur-mesure" / "Sur mesure" → require BOTH
      if (serviceShortcutActivated && businesses.length > 1 && effectiveQuery) {
        // Find query words NOT consumed by the synonym match
        const synKeyLower = Object.keys(synonyms).find(k => {
          const kLower = k.toLowerCase();
          const synVals = synonyms[k] || [];
          const allTerms = [kLower, ...synVals.map(v => v.toLowerCase())];
          const qLower = effectiveQuery.toLowerCase();
          const qWords = qLower.split(/\s+/);
          return allTerms.some(t => t.includes(" ") ? qLower.includes(t) : qWords.includes(t));
        });
        const consumedWords = new Set<string>();
        if (synKeyLower) {
          for (const w of synKeyLower.toLowerCase().split(/[\s-]+/)) consumedWords.add(w);
          for (const sv of (synonyms[synKeyLower] || [])) {
            for (const w of sv.toLowerCase().split(/[\s-]+/)) consumedWords.add(w);
          }
        }
        // Also consume the service names themselves
        for (const sn of synonymLinkedServices) {
          for (const w of sn.toLowerCase().split(/[\s-]+/)) consumedWords.add(w);
        }
        const remainingWords = effectiveQuery.toLowerCase().split(/\s+/)
          .filter(w => w.length > 1 && !FRENCH_STOP_WORDS.has(w) && !NOISE_ADJECTIVES.has(w) && !consumedWords.has(w));
        
        if (remainingWords.length > 0) {
          console.log(`🔍 Post-filter: remaining query words after shortcut: [${remainingWords.join(", ")}]`);
          // Check if remaining words match any service name in the DB
          const stripPlRemainder = (w: string): string => {
            if (w.endsWith("aux")) return w.slice(0, -3) + "al";
            if (w.endsWith("s")) return w.slice(0, -1);
            return w;
          };
          const normRemaining = (w: string): string => stripAccentsGlobal(stripPlRemainder(w));
          
          // Fetch all services to check against remaining words
          const { data: allServices } = await supabase.from("services").select("name_fr");
          if (allServices) {
            const additionalServices: string[] = [];
            for (const svc of allServices) {
              const svcNameLower = svc.name_fr.toLowerCase();
              const svcNameNorm = stripAccentsGlobal(svcNameLower.replace(/-/g, " "));
              const svcContentWords = svcNameNorm.split(/\s+/).filter((w: string) => w.length > 1 && !FRENCH_STOP_WORDS.has(w));
              if (svcContentWords.length === 0) continue;
              // Check if ALL content words of this service name appear in remainingWords
              const allMatched = svcContentWords.every((sw: string) =>
                remainingWords.some(rw => normRemaining(rw) === sw || normRemaining(rw) === stripPlRemainder(sw))
              );
              if (allMatched) {
                additionalServices.push(svc.name_fr);
              }
            }
            // Deduplicate by normalized name (e.g. "Sur-mesure" and "Sur mesure")
            const uniqueAdditional = [...new Map(additionalServices.map(n => [stripAccentsGlobal(n.toLowerCase().replace(/-/g, " ")), n])).values()];
            if (uniqueAdditional.length > 0) {
              const beforeCount = businesses.length;
              businesses = businesses.filter((b: any) => {
                const bServices = ((b.services || []) as string[]).map((s: string) => stripAccentsGlobal(s.toLowerCase().replace(/-/g, " ")));
                return uniqueAdditional.every(req => {
                  const reqNorm = stripAccentsGlobal(req.toLowerCase().replace(/-/g, " "));
                  return bServices.some(bs => bs === reqNorm);
                });
              });
              console.log(`🔍 Post-filter: required additional services [${uniqueAdditional.join(", ")}] → ${beforeCount} → ${businesses.length} results`);
            }
          }
        }
      }

      // Legacy: merge subcategories
      if (synonymLinkedSubcategories.length > 0) {
        const existingIds2 = new Set(businesses.map(b => b.id));
        for (const synSubcat of synonymLinkedSubcategories) {
          let synBuilder = supabase.from("businesses").select("*").eq("is_active", true)
            .contains("categories", [synSubcat]);
          if (effectiveCity) synBuilder = applyCityFilter(synBuilder);
          if (detectedNeighborhood) {
            synBuilder = synBuilder.or(buildNeighborhoodOrClause(detectedNeighborhood, loadedNeighborhoods));
          }
          synBuilder = synBuilder
            .order("wtuce_status", { ascending: true })
            .order("google_rating", { ascending: false, nullsFirst: false })
            .order("priority_score", { ascending: false })
            .limit(limit);
          const { data: synData, error: synError } = await synBuilder;
          if (!synError && synData && synData.length > 0) {
            const newResults = synData
              .filter((b: any) => !existingIds2.has(b.id))
              .map((b: any) => ({
                ...b,
                distance_km: latitude && longitude && b.latitude && b.longitude
                  ? calculateDistance(latitude, longitude, b.latitude, b.longitude) : null,
              }));
            for (const b of newResults) existingIds2.add(b.id);
            businesses = [...businesses, ...newResults];
            console.log(`⚡ Synonym subcategory merge "${synSubcat}": +${newResults.length} results (total: ${businesses.length})`);
          }
        }
        if (businesses.length > 0) {
          serviceShortcutActivated = true;
        }
      }
    }

    // Flag hoisted outside block scope so it's accessible at response construction
    let serviceWasDetected = false;

    // ── Pre-detect matching service(s) from query keywords ──
    // Hoisted outside the if-block so they're accessible later (subcategory filtering, search config, response)
    let detectedService: string | null = null;
    let detectedServices: string[] = [];
    let allCandidateServiceNames: string[] = [];
    let allMatchedServiceNames: string[] = [];
    let originalDetectedService: string | null = null;
    let serviceMatchWordsForInjection: string[] = [];
    let serviceMatchWordsOuter: string[] = [];

    if (!serviceShortcutActivated && !labelShortcutActivated) {
    let keywordMatchedSubcategories: string[] = []; // Subcategories of services matched via keywords
    let serviceKeywordsLookup: Map<string, string[]> = new Map(); // service name → keywords
    
    if (effectiveQuery || query || spoken) {
      // Strip French contractions: l'aéroport → aéroport, d'art → art, etc.
      const stripContractions = (w: string): string => w.replace(/^[lLdDsSnNjJcCqQ][\u0027\u2019\u2018\u0060]/g, "");
      const serviceSourceText = [effectiveQuery, query, spoken].filter(Boolean).join(" ");
      const queryWords = serviceSourceText.toLowerCase().split(/\s+/)
        .map(w => stripContractions(w))
        .filter(w => w.length > 1 && !NOISE_ADJECTIVES.has(w));
      const cityLower = effectiveCity?.toLowerCase();
      const neighborhoodLower = detectedNeighborhood?.toLowerCase();
      // When a subcategory was detected, exclude those keywords from service matching
      // to prevent "restaurant" from being treated as a service filter
      // When a subcategory was detected, exclude its name words from service matching
      const subcatNameWords = detectedSubcategory
        ? detectedSubcategory.toLowerCase().split(/[\s/]+/).filter(w => w.length > 1)
        : [];
      // Also exclude intent words (manger, acheter, dormir...) and time-related words from service matching
      const TIME_NOISE = new Set(["soir", "matin", "midi", "nuit", "après-midi", "apres-midi", "aujourd'hui", "demain", "semaine", "weekend"]);
      // Personal context words that should not trigger service matching (e.g. "femme" → service "Femme")
      const PERSONAL_CONTEXT_NOISE = new Set([
        "femme", "mari", "homme", "ami", "amie", "copain", "copine", "mère", "mere", "père", "pere",
        "fils", "fille", "frère", "frere", "soeur", "sœur", "famille", "enfant", "enfants", "bébé", "bebe",
        "offrir", "cadeau", "anniversaire", "mariage",
        // Conversational noise: question forms that carry no search meaning
        "sais-tu", "sais", "savez", "peux", "pouvez", "pourriez", "voudrais", "voudriez", "vouloir",
        "stp", "svp",
      ]);
      const COUNTRY_NOISE_RE = /^(maroc|marocain|marocaine|marocains|marocaines|morocco|moroccan)$/i;
      const serviceMatchWords = [...new Set(queryWords.filter(w => 
        !FRENCH_STOP_WORDS.has(w) && w !== cityLower && w !== neighborhoodLower 
        && !subcatNameWords.includes(w) && !INTENT_TO_CATEGORY[w] && !TIME_NOISE.has(w) && !PERSONAL_CONTEXT_NOISE.has(w)
        && !COUNTRY_NOISE_RE.test(stripAccentsGlobal(w))
      ))];

      serviceMatchWordsOuter = [...serviceMatchWords]; // Store for cleanRemainder later
      if (serviceMatchWords.length > 0) {
        // Search by name OR keywords array (include singular/plural variants)
        const stripPluralForName = (w: string): string => {
          if (w.endsWith("aux")) return w.slice(0, -3) + "al";
          if (w.endsWith("eaux")) return w.slice(0, -4) + "eau";
          if (w.endsWith("s")) return w.slice(0, -1);
          return w;
        };
        // Include subcategory words in name search so multi-word service names
        // that contain the subcategory name (e.g. "Excursions Vélo") can be matched
        const allQueryWordsForNameSearch = [...new Set([...serviceMatchWords, ...subcatNameWords])];
        const nameSearchTerms = [...new Set(allQueryWordsForNameSearch.flatMap(w => {
          const stripped = stripPluralForName(w);
          return stripped !== w ? [w, stripped] : [w];
        }))];
        // For short words (≤4 chars), use word-boundary pattern to avoid "art" matching "Artisanat"
        const NAME_COLS = ["name_fr", "name_en", "name_ar"];
        const nameConditions = nameSearchTerms.flatMap(w => {
          if (w.length <= 4) {
            return NAME_COLS.flatMap(col => [
              `${col}.ilike.% ${w} %`,
              `${col}.ilike.% ${w}`,
              `${col}.ilike.${w} %`,
              `${col}.ilike.${w}`,
              `${col}.ilike.%'${w}%`,
            ]);
          }
          return NAME_COLS.map(col => `${col}.ilike.%${w}%`);
        }).join(",");
        const { data: matchingByName } = await supabase
          .from("services")
          .select("name_fr, name_en, name_ar, keywords, subcategories!inner(name_fr)")
          .or(nameConditions);

        // Load all services (not only those with keywords) so accent-insensitive name matching works reliably
        // Fetch ALL services (paginated to bypass 1000-row cap)
        const { data: matchingByKeywords1 } = await supabase
          .from("services")
          .select("name_fr, keywords, subcategories!inner(name_fr)")
          .range(0, 999);
        const { data: matchingByKeywords2 } = await supabase
          .from("services")
          .select("name_fr, keywords, subcategories!inner(name_fr)")
          .range(1000, 1999);
        const matchingByKeywords = [...(matchingByKeywords1 || []), ...(matchingByKeywords2 || [])];
        // Populate outer-scope keyword lookup for use in areDistinctConcepts check
        for (const svc of matchingByKeywords) {
          if (svc.keywords && svc.keywords.length > 0) {
            serviceKeywordsLookup.set(svc.name_fr, svc.keywords as string[]);
          }
        }

        // Merge: services matched by name + services whose keywords contain a query word
        const stripPlural = (w: string): string => {
          if (w.endsWith("aux")) return w.slice(0, -3) + "al";
          if (w.endsWith("eaux")) return w.slice(0, -4) + "eau";
          if (w.endsWith("s")) return w.slice(0, -1);
          return w;
        };
        // Helper: check if word w appears as a whole word in string k (not as a substring of another word)
        const wordBoundaryMatch = (k: string, w: string): boolean => {
          if (w.length <= 2) return false; // Too short for substring matching
          const regex = new RegExp(`(^|\\s|[''/-])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|\\s|[''/-])`, 'i');
          return regex.test(k);
        };
        // Accent-stripping helper for keyword matching
        const stripAccentsKw = (w: string): string => w.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const normalizeWordKw = (w: string): string => stripAccentsKw(stripPlural(w));
        const keywordMatches = (matchingByKeywords || []).filter(svc => {
          const kws = (svc.keywords || []).map((k: string) => k.toLowerCase());
          return serviceMatchWords.some(w => {
            const wNorm = stripPlural(w);
            return kws.some((k: string) => {
              // Skip multi-word keywords in single-word matching — they are handled separately below
              if (k.includes(" ")) return false;
              const kNorm = stripPlural(k);
              // Exact match (with accent normalization) or whole-word boundary match
              return k === w || w === k || kNorm === wNorm || normalizeWordKw(k) === normalizeWordKw(w) || wordBoundaryMatch(k, w);
            });
          }) ||
          // Multi-word keyword match: if ALL content words of a multi-word keyword appear in the query
          // Multi-word keyword match: use full queryWords (not serviceMatchWords)
          // so subcategory words aren't excluded — e.g. "restaurant italien" matches keyword "restaurant italien"
          kws.some((k: string) => {
            if (!k.includes(" ")) return false;
            const kwContentWords = k.split(/\s+/).filter((w: string) => w.length > 1 && !FRENCH_STOP_WORDS.has(w));
            return kwContentWords.length >= 2 && kwContentWords.every((kw: string) =>
              queryWords.some(qw => qw === kw || normalizeWordKw(qw) === normalizeWordKw(kw))
            );
          });
        });
        // Accent-insensitive fallback on service names to catch inputs like "francaise" vs "française"
        const nameMatchesAccentInsensitive = (matchingByKeywords || []).filter((svc) => {
          const nameTokens = stripAccentsKw(svc.name_fr.toLowerCase())
            .split(/[\s/\-]+/)
            .map((t: string) => normalizeWordKw(t))
            .filter((t: string) => t.length > 1);

          return serviceMatchWords.some((w) => {
            const wNorm = normalizeWordKw(w);
            if (wNorm.length <= 1) return false;
            return nameTokens.some((t) => {
              // Only exact match (accent/plural-insensitive) — no substring matching
              return t === wNorm;
            });
          });
        });

        // ── Post-filter matchingByName: ILIKE is too permissive (e.g. "astronomie" matches "Gastronomie").
        // Keep only services where at least one name token matches a query word exactly (accent/plural-insensitive).
        const validatedByName = (matchingByName || []).filter(svc => {
          const allNames = [svc.name_fr, (svc as any).name_en, (svc as any).name_ar].filter(Boolean) as string[];
          const nameTokens = allNames.flatMap(n =>
            n.toLowerCase().split(/[\s/\-]+/).map((t: string) => normalizeWordKw(t)).filter((t: string) => t.length > 1)
          );
          return nameTokens.some((t: string) => allQueryWordsForNameSearch.some((w: string) => normalizeWordKw(w) === t));
        });

        const allMatched = new Map<string, any>();
        // Normalize key: replace hyphens with spaces for merging variants like "Sur-mesure" / "Sur mesure"
        const normalizeServiceKey = (name: string) => name.toLowerCase().replace(/-/g, " ").replace(/\s+/g, " ").trim();
        for (const s of [...validatedByName, ...keywordMatches, ...nameMatchesAccentInsensitive]) {
          const normKey = normalizeServiceKey(s.name_fr);
          // Extract subcategory name from joined data
          const sSubcat = (s.subcategories as any)?.name_fr || null;
          const existing = allMatched.get(normKey);
          if (existing) {
            const mergedKws = [...new Set([...(existing.keywords || []), ...(s.keywords || [])])];
            // Keep the name with the most keywords (more specific variant)
            const bestName = mergedKws.length > (existing.keywords || []).length ? s.name_fr : existing.name_fr;
            // Merge subcategories list
            const mergedSubcats = [...new Set([...(existing._allSubcategories || []), ...(sSubcat ? [sSubcat] : [])])];
            // Track which subcategories have non-empty keywords
            const kwSubcats = [...new Set([...(existing._keywordSubcategories || []), ...((s.keywords || []).length > 0 && sSubcat ? [sSubcat] : [])])];
            allMatched.set(normKey, { ...existing, name_fr: bestName, keywords: mergedKws, _allSubcategories: mergedSubcats, _keywordSubcategories: kwSubcats });
          } else {
            allMatched.set(normKey, { 
              ...s, 
              _allSubcategories: sSubcat ? [sSubcat] : [],
              _keywordSubcategories: (s.keywords || []).length > 0 && sSubcat ? [sSubcat] : [],
            });
          }
        }
        const matchingServices = Array.from(allMatched.values());

        if (matchingServices && matchingServices.length > 0) {
          // Store ALL candidate service names for OR post-filtering
          allCandidateServiceNames = matchingServices.map((s: any) => s.name_fr);
          allMatchedServiceNames = [...allCandidateServiceNames]; // Preserve full list before narrowing
          // Collect ALL services whose name words are fully present in the query
          const fullyMatchedServices: string[] = [];
          const usedQueryWords = new Set<string>();
          // Track which services consumed query words via keywords (not just name)
          const servicesWithKeywordMatch = new Set<string>();
          
          // First pass: find multi-word services with full match (greedy, longest first)
          const sortedByWordCount = [...matchingServices].sort((a, b) => {
            const aWords = a.name_fr.toLowerCase().split(/\s+/).filter((w: string) => w.length > 1).length;
            const bWords = b.name_fr.toLowerCase().split(/\s+/).filter((w: string) => w.length > 1).length;
            return bWords - aWords; // longest first
          });
          
          for (const svc of sortedByWordCount) {
            const svcAllNames = [svc.name_fr, (svc as any).name_en, (svc as any).name_ar].filter(Boolean) as string[];
            let allSvcWordsMatched = false;
            let matchedContentWords: string[] = [];
            for (const svcName of svcAllNames) {
              const svcContentWords = svcName.toLowerCase().split(/[\s]+/).filter((w: string) => w.length > 1 && !FRENCH_STOP_WORDS.has(w));
              if (svcContentWords.length === 0) continue;
              const ok = svcContentWords.every((w: string) => {
                const candidates = w.includes("-")
                  ? [w, ...w.split("-").filter(p => p.length > 1 && !FRENCH_STOP_WORDS.has(p))]
                  : [w];
                return candidates.some(cand =>
                  allQueryWordsForNameSearch.some(qw => {
                    if (usedQueryWords.has(qw)) return false;
                    return normalizeWordKw(qw) === normalizeWordKw(cand);
                  })
                );
              });
              if (ok) {
                allSvcWordsMatched = true;
                matchedContentWords = svcContentWords;
                break;
              }
            }
            if (allSvcWordsMatched) {
              fullyMatchedServices.push(svc.name_fr);
              // Mark query words as used (only content words, not stop words)
              for (const sw of matchedContentWords) {
                // For hyphenated words, also try matching individual parts
                const candidates = sw.includes("-")
                  ? [sw, ...sw.split("-").filter((p: string) => p.length > 1 && !FRENCH_STOP_WORDS.has(p))]
                  : [sw];
                for (const cand of candidates) {
                  const matchedQw = allQueryWordsForNameSearch.find(qw => !usedQueryWords.has(qw) && normalizeWordKw(qw) === normalizeWordKw(cand));
                  if (matchedQw) usedQueryWords.add(matchedQw);
                }
              }
              // Also mark query words that matched via this service's keywords as used
              // e.g. "artisan" matching keyword "artisan sur-mesure" of service "Sur-mesure"
              const svcKws = (svc.keywords || []).map((k: string) => k.toLowerCase());
              for (const qw of serviceMatchWords) {
                if (usedQueryWords.has(qw)) continue;
                const matched = svcKws.some((k: string) => {
                  // Skip multi-word keywords — single query word shouldn't match "pousse pieds" etc.
                  if (k.includes(" ")) return false;
                  return normalizeWordKw(k) === normalizeWordKw(qw) || wordBoundaryMatch(k, qw);
                });
                if (matched) {
                  usedQueryWords.add(qw);
                  servicesWithKeywordMatch.add(svc.name_fr);
                  // Track subcategories of this keyword-matched service (use merged list)
                  const svcKwSubcats: string[] = svc._keywordSubcategories || [];
                  for (const sc of svcKwSubcats) keywordMatchedSubcategories.push(sc);
                  console.log(`Keyword-consumed word "${qw}" by service "${svc.name_fr}" (subcats: ${svcKwSubcats.join(", ") || "unknown"})`);
                }
              }
            }
          }
          
          // Also find services NOT in fullyMatchedServices but with strong keyword matches
          // (≥2 distinct query words matching their keywords, or a multi-word keyword fully matched)
          // Also include services whose keyword exactly matches a fully-matched service name (alias match)
          const fullyMatchedNamesLower = fullyMatchedServices.map(n => normalizeWordKw(n.toLowerCase()));
          const strongKeywordServices: string[] = [];
          
          for (const svc of matchingServices) {
            if (fullyMatchedServices.includes(svc.name_fr)) continue;
            const svcKws = (svc.keywords || []).map((k: string) => k.toLowerCase());
            if (svcKws.length === 0) continue;
            // Count distinct query words matching keywords (single or multi-word)
            let kwScore = 0;
            for (const w of serviceMatchWords) {
              const matched = svcKws.some((k: string) => {
                return k === w || normalizeWordKw(k) === normalizeWordKw(w) || wordBoundaryMatch(k, w);
              });
              if (matched) kwScore++;
            }
            // Check multi-word keyword full match (e.g. "boite de com" with query words boîte + com)
            // Use full queryWords for multi-word keyword matching BUT filter out country noise words
            const queryWordsNoCountryNoise = queryWords.filter(w => !COUNTRY_NOISE_RE.test(stripAccentsGlobal(w)));
            const hasMultiWordMatch = svcKws.some((k: string) => {
              if (!k.includes(" ")) return false;
              const kwContentWords = k.split(/\s+/).filter((w: string) => w.length > 1 && !FRENCH_STOP_WORDS.has(w));
              return kwContentWords.length >= 2 && kwContentWords.every((kw: string) =>
                queryWordsNoCountryNoise.some(qw => qw === kw || normalizeWordKw(qw) === normalizeWordKw(kw))
              );
            });
            // Alias match: a keyword of this service exactly matches the name of a fully-matched service
            // e.g. "Barber Shop" has keyword "Barbier" which is also a fully-matched service name
            // BUT only if they share the same subcategory — prevents "Artisanat marocain" (keyword "tapis")
            // from being added as alias of service "Tapis" when they belong to different subcategories
            const svcSubcats: string[] = (svc as any)._allSubcategories || [];
            const fullyMatchedSubcats = fullyMatchedServices.flatMap(fmName => {
              const fmSvc = matchingServices.find((s: any) => s.name_fr === fmName);
              return (fmSvc as any)?._allSubcategories || [];
            });
            const hasAliasMatch = svcKws.some((k: string) => fullyMatchedNamesLower.includes(normalizeWordKw(k)))
              && svcSubcats.length > 0 && svcSubcats.some((sc: string) => fullyMatchedSubcats.includes(sc));
            if (kwScore >= 2 || hasMultiWordMatch || hasAliasMatch) {
              strongKeywordServices.push(svc.name_fr);
              console.log(`Strong keyword match: "${svc.name_fr}" (kwScore=${kwScore}, multiWord=${hasMultiWordMatch}, alias=${hasAliasMatch})`);
            }
          }

          if (fullyMatchedServices.length > 0 || strongKeywordServices.length > 0) {
            detectedServices = [...fullyMatchedServices, ...strongKeywordServices];
            detectedService = strongKeywordServices.length > 0 ? strongKeywordServices[0] : fullyMatchedServices[0];
            
            // If some services consumed query words via keywords (e.g. "artisan" → "Sur-mesure"),
            // exclude services that have empty keywords and were only matched by generic name words.
            // This prevents "Sur mesure" (empty kw) from polluting results when "artisan" was the key signal.
            if (servicesWithKeywordMatch.size > 0 || strongKeywordServices.length > 0) {
              const keywordFilteredServices = detectedServices.filter(svcName => {
                // Always keep strong keyword matches
                if (strongKeywordServices.includes(svcName)) return true;
                // Keep if this service had a keyword match
                if (servicesWithKeywordMatch.has(svcName)) return true;
                // Keep if the service name itself directly matches a query word
                // e.g. service "Tapis" should be kept when user searched "tapis"
                const svcNameNorm = normalizeWordKw(svcName.toLowerCase());
                const nameMatchesQuery = serviceMatchWords.some(w => normalizeWordKw(w) === svcNameNorm || wordBoundaryMatch(svcNameNorm, normalizeWordKw(w)));
                if (nameMatchesQuery) return true;
                // Keep if this service has non-empty keywords (even if they didn't match this specific query)
                const svcData = matchingServices.find((s: any) => s.name_fr === svcName);
                const hasKeywords = svcData && svcData.keywords && svcData.keywords.length > 0;
                return hasKeywords;
              });
              if (keywordFilteredServices.length > 0) {
                console.log(`Keyword-filtered services: [${detectedServices.join(", ")}] → [${keywordFilteredServices.join(", ")}]`);
                detectedServices = keywordFilteredServices;
                detectedService = keywordFilteredServices[0];
              }
            }
            
            // Collapse synonym services into a single representative for AND-filter purposes.
            // Two services are synonyms when one's name appears in the other's keywords (normalized).
            // e.g. "Glaces" and "Glacier" (Glacier.keywords includes "glaces") → keep only one in detectedServices.
            // allCandidateServiceNames keeps both so OR matching still works.
            // Capture pre-collapse list so OR-matching keeps every synonym variant as a candidate.
            const preCollapseDetected = [...detectedServices];

            if (detectedServices.length > 1) {
              const norm = (s: string) => normalizeWordKw(stripPlural(s.toLowerCase().trim()));
              const svcMeta = detectedServices.map(name => {
                const data = matchingServices.find((s: any) => s.name_fr === name);
                return {
                  name,
                  normName: norm(name),
                  normKws: ((data?.keywords as string[]) || []).map(norm),
                };
              });
              const parent: Record<string, string> = {};
              const find = (x: string): string => parent[x] === x ? x : (parent[x] = find(parent[x]));
              svcMeta.forEach(m => parent[m.name] = m.name);
              for (let i = 0; i < svcMeta.length; i++) {
                for (let j = i + 1; j < svcMeta.length; j++) {
                  const a = svcMeta[i], b = svcMeta[j];
                  if (a.normKws.includes(b.normName) || b.normKws.includes(a.normName)) {
                    parent[find(a.name)] = find(b.name);
                  }
                }
              }
              const seenGroups = new Set<string>();
              const collapsed: string[] = [];
              for (const m of svcMeta) {
                const g = find(m.name);
                if (!seenGroups.has(g)) { seenGroups.add(g); collapsed.push(m.name); }
              }
              if (collapsed.length < detectedServices.length) {
                console.log(`Collapsed synonym services [${detectedServices.join(", ")}] → [${collapsed.join(", ")}]`);
                detectedServices = collapsed;
                detectedService = collapsed[0];
              }
            }

            // Keep every original detected variant as OR candidate so a business carrying any synonym still matches.
            allCandidateServiceNames = preCollapseDetected;



          } else {
            // Fallback: pick best single service by scoring
            let bestMatch: string | null = null;
            let bestScore = -Infinity;
            let bestMatchCount = 0;
            let bestSvcWordCount = 0;
            
            for (const svc of matchingServices) {
              const svcLower = svc.name_fr.toLowerCase();
              const svcNorm = stripPlural(svcLower.trim());
              const svcWords = svcLower.split(/\s+/).filter((w: string) => w.length > 1);
              // For short words (≤4 chars), require word-boundary match to avoid "art" matching "artisanat"
              const wordMatchesService = (w: string, text: string): boolean => {
                if (w.length <= 4) {
                  const regex = new RegExp(`(^|[\\s''/-])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[\\s''/-])`, 'i');
                  return regex.test(text);
                }
                // Use word-boundary match for longer words too, to prevent "astronomie" matching "gastronomie"
                const regex = new RegExp(`(^|[\\s''/-])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[\\s''/-])`, 'i');
                return regex.test(text);
              };
              const matchCount = serviceMatchWords.filter(w => wordMatchesService(w, svcLower)).length;
              const svcWordCount = svcWords.length;
              const kws = (svc.keywords || []).map((k: string) => k.toLowerCase());
              const kwMatchCount = serviceMatchWords.filter(w => {
                const wNorm = stripPlural(w);
                return kws.some((k: string) => {
                  const kNorm = stripPlural(k);
                  if (k === w || kNorm === wNorm) return true;
                  if (w.length <= 4) return wordBoundaryMatch(k, w);
                  // For longer words, also use word boundary to prevent substring false positives
                  return wordBoundaryMatch(k, w) || wordBoundaryMatch(w, k);
                });
              }).length;
              
              // For multi-word service names, require ≥2 query words to match
              // Exception: if the service name originally contains a contraction (d', l'), 
              // the stripped word is a qualifier — 1 match on the main word is enough
              const originalName = svc.name_fr.toLowerCase();
              const hasContraction = /[dlsn]['']\w/i.test(originalName);
              const minMatchRequired = hasContraction ? 1 : 2;
              if (svcWordCount >= 2 && matchCount < minMatchRequired && kwMatchCount === 0) continue;
              
              const exactNameMatch = serviceMatchWords.some(w => normalizeWordKw(w) === normalizeWordKw(svcLower));
              const exactNameBonus = exactNameMatch ? 200 : 0;
              const unmatchedPenalty = Math.max(0, svcWordCount - matchCount) * 15;
              const score = exactNameBonus + matchCount * 5 + (matchCount > 1 && svcWordCount > 1 ? 20 : 0) + kwMatchCount * 30 - unmatchedPenalty;
              
              if (score > bestScore) {
                bestScore = score;
                bestMatch = svc.name_fr;
                bestMatchCount = matchCount;
                bestSvcWordCount = svcWordCount;
              }
            }
            if (bestMatch) {
              detectedService = bestMatch;
              detectedServices = [bestMatch];
              // Narrow candidates to only the detected service (avoids unrelated services polluting results)
              allCandidateServiceNames = [bestMatch];
            } else {
              // No service met the threshold — skip service detection
              detectedService = null;
              detectedServices = [];
              allCandidateServiceNames = [];
              console.log(`Service detection skipped: no candidate met the ≥2 word threshold for multi-word services`);
            }
          }
          
          originalDetectedService = detectedService;
          // Only inject words that actually matched a detected service name (not all query words)
          if (usedQueryWords.size > 0) {
            serviceMatchWordsForInjection = [...usedQueryWords];
          } else if (detectedService) {
            // Fallback path: extract content words from the detected service name
            const dsSvcContentWords = detectedService.toLowerCase().split(/\s+/).filter((w: string) => w.length > 1 && !FRENCH_STOP_WORDS.has(w));
            serviceMatchWordsForInjection = serviceMatchWords.filter(w => dsSvcContentWords.some((sw: string) => w === sw || stripPlural(w) === stripPlural(sw)));
          } else {
            serviceMatchWordsForInjection = [];
          }
          console.log(`Detected service(s) for SQL filter: [${detectedServices.join(", ")}], all candidates: [${allCandidateServiceNames.join(", ")}] (from: ${serviceMatchWords.join(", ")})`);
          if (detectedService) serviceWasDetected = true;
        }
      }
    }

    // Guardrail: natural-language intent extraction can over-interpret
    // "coucher de soleil / sunset" as "Vue sur mer" by injecting words like
    // "vue" + "mer". Only keep the strict "Vue sur mer" service when the
    // member explicitly mentioned the sea/ocean/coast in their own text.
    if (detectedServices.includes("Vue sur mer")) {
      const rawUserText = [query, spoken]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const explicitSeaView = /\b(mer|ocean|oc[eé]an|atlantique|mediterranee|m[eé]diterran[eé]e|sea|ocean|seaside|seafront|beachfront|bord de mer|front de mer)\b/i.test(rawUserText);
      if (!explicitSeaView) {
        const beforeServices = [...detectedServices];
        detectedServices = detectedServices.filter((s) => s !== "Vue sur mer");
        allCandidateServiceNames = allCandidateServiceNames.filter((s) => s !== "Vue sur mer");
        if (detectedService === "Vue sur mer") detectedService = detectedServices[0] || null;
        if (originalDetectedService === "Vue sur mer") originalDetectedService = detectedService;
        if (!detectedService && detectedServices.length === 0) serviceWasDetected = false;
        console.log(`Removed inferred service "Vue sur mer" because user did not explicitly ask for sea view: [${beforeServices.join(", ")}] → [${detectedServices.join(", ")}]`);
      }
    }

    // Guardrail: a service detected only from words that already belong to the
    // detected subcategory name is a false positive (ex. "beach club" → sous-catégorie
    // "Beach club" + service "Plage"/Beach), and would wrongly exclude results.
    if (detectedSubcategory && detectedServices.length > 0) {
      const subWords = new Set(
        normalizeMatchingText(detectedSubcategory).split(" ").filter(w => w.length > 2)
      );
      const svcRedundant = (svc: string) => {
        const svcWords = normalizeMatchingText(svc).split(" ").filter(w => w.length > 2);
        return svcWords.length > 0 && svcWords.every(w => subWords.has(w));
      };
      const triggeredBySubcategoryWordsOnly =
        serviceMatchWordsForInjection.length > 0 &&
        serviceMatchWordsForInjection.every(w => subWords.has(stripAccentsGlobal(w.toLowerCase())));
      const before = [...detectedServices];
      const kept = detectedServices.filter(s => !(svcRedundant(s) || triggeredBySubcategoryWordsOnly));
      if (kept.length !== before.length) {
        detectedServices = kept;
        allCandidateServiceNames = allCandidateServiceNames.filter(s => kept.includes(s));
        if (detectedService && !kept.includes(detectedService)) detectedService = kept[0] || null;
        if (!detectedService && kept.length === 0) serviceWasDetected = false;
        console.log(`Removed service(s) redundant with subcategory "${detectedSubcategory}": [${before.join(", ")}] → [${kept.join(", ")}]`);
      }
    }


    // ── Inject service forced by intent-based re-evaluation (see ~L1800) ──
    // When intent (e.g. "faire") swapped to a subcategory via a service keyword,
    // ensure that service is enforced as a required filter downstream.
    if (forcedServiceFromReeval && !detectedServices.includes(forcedServiceFromReeval)) {
      detectedServices = [forcedServiceFromReeval, ...detectedServices];
      if (!detectedService) detectedService = forcedServiceFromReeval;
      serviceWasDetected = true;
      console.log(`✅ Injected forced service from re-eval: "${forcedServiceFromReeval}" → detectedServices=[${detectedServices.join(", ")}]`);
    }

    // ── Filter out services that don't belong to the detected subcategory ──
    // e.g. "offrir des fleurs" detects subcategory "Fleuriste" but service "Fleurs comestibles" belongs to "Fruits & Legumes"
    // For neighborhood-driven queries, keep cross-subcategory services (same local intent can span multiple subcategories)
    if (detectedSubcategory && detectedServices.length > 0 && !detectedNeighborhood) {
      // Look up which subcategory the detected subcategory actually is
      // IMPORTANT: when multiple subcategories share the same name (e.g. "Décoration" in Artisanat AND Commerce),
      // disambiguate using the parent category context (subcategoryParentCategory or effectiveCategories)
      let subcatLookupBuilder = supabase
        .from("subcategories")
        .select("id, name_fr, categories!inner(name_fr)")
        .eq("name_fr", detectedSubcategory);
      
      // Disambiguate by parent category if available
      const disambiguationCat = subcategoryParentCategory 
        || (effectiveCategories.length === 1 ? effectiveCategories[0] : null);
      if (disambiguationCat) {
        subcatLookupBuilder = subcatLookupBuilder.eq("categories.name_fr", disambiguationCat);
      }
      
      const { data: detectedSubcatRows } = await subcatLookupBuilder.limit(1);
      const detectedSubcatRow = detectedSubcatRows?.[0] || null;
      
      if (detectedSubcatRow) {
        // Get services that belong to this subcategory
        const { data: subcatServices } = await supabase
          .from("services")
          .select("name_fr")
          .eq("subcategory_id", detectedSubcatRow.id);
        if (subcatServices) {
          const validServiceNames = new Set(subcatServices.map((s: any) => s.name_fr));
          const filteredDetected = detectedServices.filter(s => validServiceNames.has(s));
          if (filteredDetected.length !== detectedServices.length) {
            const removed = detectedServices.filter(s => !validServiceNames.has(s));
            console.log(`Removed services not in subcategory "${detectedSubcategory}" (${(detectedSubcatRow as any).categories?.name_fr || "?"}): [${removed.join(", ")}]`);
            detectedServices = filteredDetected;
            detectedService = filteredDetected.length > 0 ? filteredDetected[0] : null;
            allCandidateServiceNames = filteredDetected;
            originalDetectedService = detectedService;
          }
        }
      }
    }

    // Clear keyword-linked subcategories when the query resolved to a clear
    // subcategory + service pair. Example: "Hôtel + Piscine" must filter hotels
    // by service Piscine, not merge in the subcategory Piscine or Beach club.
    if (detectedSubcategory && detectedServices.length > 0 && keywordLinkedSubcategories.length > 0) {
      console.log(`Cleared keyword-linked subcategories for "${detectedSubcategory}" because services were detected: [${detectedServices.join(", ")}]`);
      keywordLinkedSubcategories = [];
      keywordLinkedOwnerSubcategory = null;
    }

    // ── Resolve search config from service's parent subcategory ──
    // If no subcategorySearchConfig was found from the detected subcategory name,
    // but a service was detected, check if the service's parent subcategory has a config.
    if (!subcategorySearchConfig && detectedService) {
      const { data: svcParents } = await supabase
        .from("services")
        .select("subcategory_id, subcategories!inner(name_fr, category_id, categories!inner(name_fr))")
        .eq("name_fr", detectedService);
      if (svcParents && svcParents.length > 0) {
        // If detected subcategory exists, prefer the parent that matches it
        let bestParent: { name: string; config: { search_mode: string; max_results: number | null; boost_weight: number; synonyms: string[] } } | null = null;
        for (const sp of svcParents) {
          const parentName = (sp as any).subcategories?.name_fr;
          const parentCategoryName = (sp as any).subcategories?.categories?.name_fr;
          if (parentName) {
            // Skip if the service's parent category conflicts with ALL intent categories
            // e.g. don't apply Yoga/strict config when intent is Commerce
            if (intentCategories.length > 0 && parentCategoryName && !intentCategories.some(ic => ic.toLowerCase() === parentCategoryName.toLowerCase())) {
              console.log(`Skipping search config from service "${detectedService}" parent "${parentName}" (category "${parentCategoryName}" not in intent [${intentCategories.join(", ")}])`);
              continue;
            }
            // If this parent IS the detected subcategory, use it directly
            if (detectedSubcategory && parentName.toLowerCase() === detectedSubcategory.toLowerCase()) {
              const parentConfig = searchConfigs[parentName.toLowerCase()] || null;
              if (parentConfig) {
                bestParent = { name: parentName, config: parentConfig };
                break; // Perfect match, stop looking
              }
            }
            // Otherwise store first config found as fallback
            if (!bestParent) {
              const parentConfig = searchConfigs[parentName.toLowerCase()] || null;
              if (parentConfig) {
                bestParent = { name: parentName, config: parentConfig };
              }
            }
          }
        }
        if (bestParent) {
          subcategorySearchConfig = bestParent.config;
          console.log(`Resolved search config from service "${detectedService}" parent subcategory "${bestParent.name}": mode=${bestParent.config.search_mode}`);
        }
      }
    }

    // ── Suppress neighborhood when it conflicts with a detected subcategory ──
    // e.g. "plage d'essaouira" → neighborhood "Plage" + subcategory "Plages" both match "plage"
    // The subcategory intent should take priority; neighborhood filter would empty results.
    if (detectedNeighborhood && detectedSubcategory) {
      const nhNorm = stripAccentsGlobal(detectedNeighborhood.toLowerCase().trim());
      const scNorm = stripAccentsGlobal(detectedSubcategory.toLowerCase().trim());
      // Check if neighborhood name is a substring/stem of the subcategory or vice versa
      const nhBase = nhNorm.replace(/s$/, "");
      const scBase = scNorm.replace(/s$/, "");
      if (nhBase === scBase || nhNorm === scBase || nhBase === scNorm) {
        console.log(`Suppressed neighborhood "${detectedNeighborhood}" — conflicts with subcategory "${detectedSubcategory}"`);
        detectedNeighborhood = null;
      }
    }

    // When a service was detected, build a clean query for tsquery matching.
    // Remove noise words (like "achat") that don't exist in search vectors, keep service name + city etc.
    let queryForExpansion: string | null | undefined = effectiveQuery;

    // Strip detected neighborhood from queryForExpansion — neighborhood filtering is handled
    // by post-filter (filterByNeighborhood) which handles accent variants (médina/medina, guéliz/gueliz).
    // Keeping it in the tsquery causes accent mismatches (e.g. "médina" vs "medina" in search_vector).
    let isNeighborhoodOnlyQuery = false;
    if (detectedNeighborhood && queryForExpansion) {
      // Build a set of ALL words that refer to this neighborhood (canonical name + keywords/aliases)
      const nhVariantWords = new Set<string>();
      const nhAllVariants = getNeighborhoodVariants(detectedNeighborhood, loadedNeighborhoods);
      for (const v of nhAllVariants) {
        for (const w of v.toLowerCase().split(/\s+/)) {
          nhVariantWords.add(w);
          nhVariantWords.add(stripAccentsGlobal(w));
          nhVariantWords.add(w.replace(/[éèêë]/g, "e").replace(/[àâä]/g, "a"));
        }
      }
      const stripped = queryForExpansion.split(/\s+/).filter(w => {
        const wLower = w.toLowerCase();
        const wStripped = stripAccentsGlobal(wLower);
        const wSimple = wLower.replace(/[éèêë]/g, "e").replace(/[àâä]/g, "a");
        return !nhVariantWords.has(wLower) && !nhVariantWords.has(wStripped) && !nhVariantWords.has(wSimple);
      }).join(" ").trim();
      if (stripped) {
        queryForExpansion = stripped;
        console.log(`Stripped neighborhood from tsquery: "${queryForExpansion}" (was: "${effectiveQuery}")`);
      } else {
        // Query is only the neighborhood — use accent-stripped version for tsquery
        isNeighborhoodOnlyQuery = true;
        queryForExpansion = detectedNeighborhood.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        console.log(`Query is neighborhood-only, using accent-stripped: "${queryForExpansion}" (was: "${effectiveQuery}")`);
      }
    }
    // Strip time-related noise words from queryForExpansion (they don't exist in search vectors)
    const TIME_NOISE_QUERY = new Set(["soir", "matin", "midi", "après-midi", "apres-midi", "aujourd'hui", "demain", "semaine", "weekend", "ce", "cette"]);
    if (queryForExpansion) {
      const before = queryForExpansion;
      queryForExpansion = queryForExpansion.split(/\s+/).filter(w => !TIME_NOISE_QUERY.has(w.toLowerCase())).join(" ").trim() || queryForExpansion;
      if (queryForExpansion !== before) {
        console.log(`Stripped time noise from tsquery: "${queryForExpansion}" (was: "${before}")`);
      }
    }
    // Strip intent words (dormir, manger, etc.) from tsquery when they've already resolved to a category
    // These verbs don't appear in business search vectors and cause 0 results
    if (intentCategories.length > 0 && queryForExpansion && INTENT_TO_CATEGORY) {
      const before = queryForExpansion;
      const intentWords = new Set(Object.keys(INTENT_TO_CATEGORY));
      const stripped = queryForExpansion.split(/\s+/).filter(w => {
        const wLower = w.toLowerCase();
        const wStripped = stripAccentsGlobal(wLower);
        return !intentWords.has(wLower) && !intentWords.has(wStripped);
      }).join(" ").trim();
      if (stripped) {
        queryForExpansion = stripped;
      } else {
        // Intent word was the ONLY remaining term — switch to category-only search
        queryForExpansion = null;
        console.log(`Query reduced to empty after stripping intent word → will use category-only query`);
      }
      if (queryForExpansion !== before) {
        console.log(`Stripped intent word from tsquery: "${queryForExpansion}" (was: "${before}")`);
      }
    }
    // Strip auto-detected city from tsquery when no subcategory was detected
    // (city filtering is handled by p_city parameter, keeping it in tsquery is redundant but harmless
    // UNLESS it's the only remaining word, which would match everything in that city)
    if (!detectedSubcategory && effectiveCity && queryForExpansion) {
      const before = queryForExpansion;
      const cityWords = effectiveCity.toLowerCase().split(/\s+/);
      // Also include the matched keyword variant (e.g. "marrakesh" when city is "Marrakech")
      if (detectedCityMatchedTerm) {
        for (const w of detectedCityMatchedTerm.toLowerCase().split(/\s+/)) {
          if (!cityWords.includes(w)) cityWords.push(w);
        }
      }
      const stripped = queryForExpansion.split(/\s+/).filter(w => {
        const wLower = w.toLowerCase();
        const wStripped = stripAccentsGlobal(wLower);
        return !cityWords.some(cw => wLower === cw.toLowerCase() || wStripped === stripAccentsGlobal(cw.toLowerCase()));
      }).join(" ").trim();
      if (stripped && stripped !== queryForExpansion) {
        queryForExpansion = stripped;
        console.log(`Stripped city from tsquery: "${queryForExpansion}" (was: "${before}")`);
      } else if (!stripped) {
        // Query is only city (+ maybe intent word already stripped) → no meaningful tsquery terms
        // Let the city filter handle it alone
        queryForExpansion = null;
        console.log(`Query reduced to empty after stripping city → will use city-only query`);
      }
    }
    // In broad subcategory mode, remove intent/city/subcategory noise from tsquery input.
    // Example: "je veux jouer au tennis à Marrakech" => "Tennis" (fallback) instead of "jouer tennis Marrakech".
    if (detectedSubcategory && queryForExpansion) {
      const isStrictSubcategoryMode = subcategorySearchConfig?.search_mode === "strict";
      const BROAD_INTENT_NOISE = new Set([
        "veux", "veut", "vouloir", "souhaite", "souhaiter", "cherche", "chercher", "trouver", "trouve",
        "besoin", "faire", "aller", "pratiquer", "jouer", "joue", "tester", "essayer", "visiter",
      ]);

      const normalizeToken = (value: string) => stripAccentsGlobal(sanitizeTerm(value.toLowerCase()));
      const subcatWordSet = new Set(
        detectedSubcategory
          .toLowerCase()
          .split(/[\s/\-]+/)
          .map(normalizeToken)
          .filter((w) => w.length > 1),
      );
      const cityWordSet = new Set(
        (effectiveCity || "")
          .toLowerCase()
          .split(/[\s/\-]+/)
          .map(normalizeToken)
          .filter((w) => w.length > 1),
      );

      const cleanedTokens = queryForExpansion
        .split(/\s+/)
        .map((w) => w.trim())
        .filter(Boolean)
        .filter((token) => {
          const normalized = normalizeToken(token);
          if (!normalized || normalized.length <= 1) return false;
          if (FRENCH_STOP_WORDS.has(normalized)) return false;
          if (BROAD_INTENT_NOISE.has(normalized)) return false;
          if (subcatWordSet.has(normalized)) return false;
          if (cityWordSet.has(normalized)) return false;
          return true;
        });

      if (cleanedTokens.length > 0) {
        const cleaned = cleanedTokens.join(" ");
        if (cleaned !== queryForExpansion) {
          console.log(`Broad subcategory query cleanup: "${cleaned}" (was: "${queryForExpansion}")`);
        }
        queryForExpansion = cleaned;
      } else if (!isStrictSubcategoryMode) {
        queryForExpansion = detectedSubcategory;
        console.log(`Broad subcategory query fallback to detected subcategory: "${queryForExpansion}"`);
      }
    }

    if (detectedService && effectiveQuery) {
      // When multiple distinct services are detected, include ALL of them in the tsquery
      const allDetectedServiceNames = detectedServices.length > 1 ? detectedServices : [detectedService];
      const allSvcWords = new Set(allDetectedServiceNames.flatMap(s => s.toLowerCase().split(/\s+/)));
      const svcWords = detectedService.toLowerCase().split(/\s+/);
      const queryLower = effectiveQuery.toLowerCase();
      const hasServiceNameInQuery = svcWords.some(w => queryLower.includes(w));
      
      // Words that express intent but don't exist in search vectors
      const INTENT_NOISE = new Set([
        "achat", "acheter", "achats", "achete", "achète",
        "vente", "vendre", "vends",
        "cherche", "chercher", "trouver", "trouve", "besoin",
        "commander", "commande", "réserver", "reserver",
        "louer", "location", "loueur",
        "boire", "manger", "déguster", "deguster", "goûter", "gouter",
        "prendre", "faire", "voir", "visiter",
        "offrir", "cadeau", "anniversaire", "mariage",
        "femme", "mari", "homme", "ami", "amie", "copain", "copine",
        "mère", "mere", "père", "pere", "fils", "fille", "frère", "frere", "soeur", "sœur",
        "famille", "enfant", "enfants", "bébé", "bebe",
        // Conversational noise
        "sais-tu", "sais", "savez", "peux", "pouvez", "pourriez", "voudrais", "voudriez", "vouloir",
        "stp", "svp",
      ]);
      
      const allServiceRelatedWords = new Set([
        ...serviceMatchWordsForInjection,
        ...allSvcWords,
      ]);
      // Build city word set to strip from remainder (city filtering is handled separately)
      const cityWordsForStrip = new Set(
        (effectiveCity || "").toLowerCase().split(/\s+/).filter(Boolean).map(w => stripAccentsGlobal(w))
      );
      if (detectedCityMatchedTerm) {
        for (const w of detectedCityMatchedTerm.toLowerCase().split(/\s+/).filter(Boolean)) {
          cityWordsForStrip.add(stripAccentsGlobal(w));
        }
      }
      const cleanRemainder = effectiveQuery.split(/\s+/).filter(w => {
        const wLower = w.toLowerCase();
        const wStripped = stripAccentsGlobal(wLower);
        if (allServiceRelatedWords.has(wLower)) return false;
        if (FRENCH_STOP_WORDS.has(wLower)) return false;
        if (INTENT_NOISE.has(wLower)) return false;
        if (NOISE_ADJECTIVES.has(wLower)) return false;
        if (cityWordsForStrip.has(wStripped)) return false;
        if (wLower.includes("-")) {
          const parts = wLower.split("-").filter(p => p.length > 0);
          if (parts.some(p => allServiceRelatedWords.has(p))) return false;
        }
        return true;
      }).join(" ").trim();
      
      // Build queryForExpansion with detected service names
      // When multiple services are variants triggered by a single query word (e.g. "tapis" → "Tapis" + "Artisanat marocain"),
      // only use the PRIMARY service name for the tsquery to avoid polluting results with unrelated words.
      // The post-filter will handle OR matching across all variant services.
      let serviceNamesForQuery: string;
      if (allDetectedServiceNames.length > 1 && serviceMatchWordsForInjection.length > 0) {
        // Check if all services were triggered by a single query word → variants, not distinct
        const normalizeForCheck = (w: string): string => stripAccentsGlobal(w.toLowerCase().replace(/s$/, ""));
        const uniqueTriggers = new Set(serviceMatchWordsForInjection.map(normalizeForCheck));
        if (uniqueTriggers.size <= 1) {
          // Variants: only use the primary (first) service name for the tsquery
          serviceNamesForQuery = allDetectedServiceNames[0];
          console.log(`Service variants detected (single trigger "${serviceMatchWordsForInjection[0]}") → tsquery uses only primary service "${serviceNamesForQuery}" (skipping: ${allDetectedServiceNames.slice(1).join(", ")})`);
        } else {
          serviceNamesForQuery = allDetectedServiceNames.join(" ");
        }
      } else {
        serviceNamesForQuery = allDetectedServiceNames.join(" ");
      }
      if (!hasServiceNameInQuery) {
        queryForExpansion = serviceNamesForQuery + (cleanRemainder ? " " + cleanRemainder : "");
        console.log(`Injected service name(s) into query: "${queryForExpansion}" (was: "${effectiveQuery}")`);
      } else {
        queryForExpansion = serviceNamesForQuery + (cleanRemainder ? " " + cleanRemainder : "");
        if (queryForExpansion !== effectiveQuery) {
          console.log(`Cleaned query for tsquery: "${queryForExpansion}" (was: "${effectiveQuery}")`);
        }
      }
    }

    // ── Search Bundles: multi-subcategory intent mapping ──
    // When a bundle keyword is detected, run parallel queries per bundle entry instead of single-subcategory search
    let bundleActivated = false;
    let bundleTimeSlots: string[] = [];
    let bundleRequiredServices: string[] = [];
    {
      const { data: bundleData } = await supabase
        .from("search_bundles")
        .select("keyword, subcategory_name, required_service, badge_id, sort_order, time_slots")
        .eq("is_active", true)
        .order("sort_order");
      
      if (bundleData && bundleData.length > 0) {
        // Check all available text sources for bundle keyword matches
        const textsToCheck = [effectiveQuery, query, spoken].filter(Boolean) as string[];
        const allText = textsToCheck.map(t => stripAccentsGlobal(t.toLowerCase())).join(" ");
        const allWords = new Set(allText.split(/\s+/));
        
        // Build synonym-expanded word set: for each word, add its synonyms (both directions)
        const expandedWords = new Set(allWords);
        for (const [synKey, synValues] of Object.entries(synonyms)) {
          const normalizedKey = stripAccentsGlobal(synKey.toLowerCase());
          const normalizedValues = synValues.map(sv => stripAccentsGlobal(sv.toLowerCase()));
          
          // If any synonym value words are in the query, add the key_word's words
          for (const sv of normalizedValues) {
            const svWords = sv.split(/\s+/);
            if (svWords.every(w => allWords.has(w))) {
              // Add all words from the key
              for (const w of normalizedKey.split(/\s+/)) expandedWords.add(w);
            }
          }
          // If key_word is in the query, add synonym value words
          if (normalizedKey.split(/\s+/).every(w => allWords.has(w))) {
            for (const sv of normalizedValues) {
              for (const w of sv.split(/\s+/)) expandedWords.add(w);
            }
          }
        }
        
        const uniqueKeywords = [...new Set(bundleData.map((b: any) => stripAccentsGlobal(b.keyword.toLowerCase())))];
        
        // Simple French plural stemmer for matching tolerance
        const stemFr = (w: string): string => {
          if (w.length <= 3) return w;
          if (w.endsWith("eaux")) return w.slice(0, -1);
          if (w.endsWith("aux")) return w.slice(0, -2) + "l";
          if (w.endsWith("s") || w.endsWith("x")) return w.slice(0, -1);
          return w;
        };
        const stemSet = (words: Iterable<string>): Set<string> => {
          const s = new Set<string>();
          for (const w of words) { s.add(w); s.add(stemFr(w)); }
          return s;
        };
        const stemmedExpandedWords = stemSet(expandedWords);
        
        // Try direct match first (exact substring or single-word match)
        let matchedKeyword = uniqueKeywords.find(kw => allWords.has(kw) || allText.includes(kw));
        
        if (!matchedKeyword) {
          // Try word-by-word match using synonym-expanded word set
          matchedKeyword = uniqueKeywords.find(kw => {
            const kwWords = kw.split(/\s+/).filter(w => w.length > 1);
            return kwWords.length > 0 && kwWords.every(w => expandedWords.has(w));
          });
          if (matchedKeyword) {
            console.log(`📦 BUNDLE synonym-expanded match: "${matchedKeyword}" (expanded words: ${[...expandedWords].join(", ")})`);
          }
        }
        
        if (!matchedKeyword) {
          // Try plural-tolerant match: stem both keyword words and query words
          matchedKeyword = uniqueKeywords.find(kw => {
            const kwWords = kw.split(/\s+/).filter(w => w.length > 1);
            return kwWords.length > 0 && kwWords.every(w => stemmedExpandedWords.has(w) || stemmedExpandedWords.has(stemFr(w)));
          });
          if (matchedKeyword) {
            console.log(`📦 BUNDLE plural-tolerant match: "${matchedKeyword}"`);
          }
        }
        
        if (matchedKeyword) {
          const entries = bundleData.filter((b: any) => stripAccentsGlobal(b.keyword.toLowerCase()) === matchedKeyword);
          console.log(`\n📦 BUNDLE activated for keyword "${matchedKeyword}" → ${entries.length} entries`);
          bundleActivated = true;
          bundleTimeSlots = (entries[0] as any).time_slots || [];
          // Collect required_services from bundle entries for enrichment scoping
          bundleRequiredServices = entries
            .filter((e: any) => e.required_service)
            .map((e: any) => e.required_service as string);
          
          const allBundleResults: any[] = [];
          const seenIds = new Set<string>();
          
          for (const entry of entries) {
            // If badge_id is set, fetch businesses via business_badges join
            if (entry.badge_id && !entry.subcategory_name && !entry.required_service) {
              const { data: bbData } = await supabase
                .from("business_badges")
                .select("business_id")
                .eq("badge_id", entry.badge_id);
              
              if (bbData && bbData.length > 0) {
                const businessIds = bbData.map((bb: any) => bb.business_id);
                let builder = supabase.from("businesses").select("*")
                  .eq("is_active", true)
                  .in("id", businessIds);
                
                if (effectiveCity) builder = applyCityFilter(builder);
                if (detectedNeighborhood) {
                  builder = builder.or(buildNeighborhoodOrClause(detectedNeighborhood, loadedNeighborhoods));
                }
                
                builder = builder
                  .order("wtuce_status", { ascending: true })
                  .order("google_rating", { ascending: false, nullsFirst: false })
                  .order("priority_score", { ascending: false })
                  .limit(limit);
                
                const { data, error } = await builder;
                if (!error && data && data.length > 0) {
                  for (const b of data) {
                    if (!seenIds.has(b.id)) {
                      seenIds.add(b.id);
                      allBundleResults.push({
                        ...b,
                        distance_km: latitude && longitude && b.latitude && b.longitude
                          ? calculateDistance(latitude, longitude, b.latitude, b.longitude) : null,
                      });
                    }
                  }
                  console.log(`  Bundle entry [badge:${entry.badge_id}]: ${data.length} results`);
                } else {
                  console.log(`  Bundle entry [badge:${entry.badge_id}]: 0 results`);
                }
              }
              continue;
            }
            
            let builder = supabase.from("businesses").select("*").eq("is_active", true);
            
            // Filter by subcategory if specified (non-wildcard)
            // Resolve proper casing from DB since bundle entries may have lowercase names
            if (entry.subcategory_name) {
              const { data: subcatRow } = await supabase.from("subcategories").select("name_fr").ilike("name_fr", entry.subcategory_name).limit(1).single();
              const resolvedSubcat = subcatRow?.name_fr || entry.subcategory_name;
              builder = builder.or(`categories.cs.{"${resolvedSubcat}"},main_category.eq.${resolvedSubcat}`);
              console.log(`  Bundle subcategory resolved: "${entry.subcategory_name}" → "${resolvedSubcat}"`);
            }
            
            // Filter by badge_id via join if specified alongside subcategory/service
            if (entry.badge_id) {
              const { data: bbData } = await supabase
                .from("business_badges")
                .select("business_id")
                .eq("badge_id", entry.badge_id);
              if (bbData && bbData.length > 0) {
                builder = builder.in("id", bbData.map((bb: any) => bb.business_id));
              }
            }
            
            // Filter by required service if specified
            if (entry.required_service) {
              builder = builder.filter("services", "cs", `{"${entry.required_service}"}`);
            }
            // Apply city filter
            if (effectiveCity) builder = applyCityFilter(builder);
            
            // Apply neighborhood filter
            if (detectedNeighborhood) {
              builder = builder.or(buildNeighborhoodOrClause(detectedNeighborhood, loadedNeighborhoods));
            }
            
            builder = builder
              .order("wtuce_status", { ascending: true })
              .order("google_rating", { ascending: false, nullsFirst: false })
              .order("priority_score", { ascending: false })
              .limit(limit);
            
            const { data, error } = await builder;
            if (!error && data && data.length > 0) {
              for (const b of data) {
                if (!seenIds.has(b.id)) {
                  seenIds.add(b.id);
                  allBundleResults.push({
                    ...b,
                    distance_km: latitude && longitude && b.latitude && b.longitude
                      ? calculateDistance(latitude, longitude, b.latitude, b.longitude) : null,
                  });
                }
              }
              console.log(`  Bundle entry [${entry.subcategory_name || "*"}] + service "${entry.required_service || "*"}": ${data.length} results`);
            } else {
              console.log(`  Bundle entry [${entry.subcategory_name || "*"}] + service "${entry.required_service || "*"}": 0 results`);
            }
          }
          
          if (allBundleResults.length > 0) {
            businesses = allBundleResults;
            searchLevel = "exact";
            console.log(`📦 BUNDLE total: ${businesses.length} unique results`);
          }
        }
      }
    }

    // When a subcategory is detected, use direct SQL filtering (bypasses tsquery which matches descriptions)
    // Fusion rule: "Hôtel" and "Riad" are merged in search results
    // Fusion rule: load merge_group from subcategories DB
    let MERGED_SUBCATEGORIES: Record<string, string[]> = {};
    {
      const { data: mergeData } = await supabase
        .from("subcategories")
        .select("name_fr, merge_group")
        .not("merge_group", "is", null);
      if (mergeData) {
        const groups: Record<string, string[]> = {};
        for (const row of mergeData) {
          if (!row.merge_group) continue;
          if (!groups[row.merge_group]) groups[row.merge_group] = [];
          groups[row.merge_group].push(row.name_fr);
        }
        for (const names of Object.values(groups)) {
          for (const name of names) {
            MERGED_SUBCATEGORIES[name.toLowerCase()] = names;
          }
        }
      }
    }
    // ── Inject keyword-linked subcategories into MERGED_SUBCATEGORIES ──
    if (detectedSubcategory && keywordLinkedSubcategories.length > 0 && keywordLinkedOwnerSubcategory === detectedSubcategory) {
      const key = detectedSubcategory.toLowerCase();
      const existing = MERGED_SUBCATEGORIES[key] || [detectedSubcategory];
      const merged = [...new Set([...existing, ...keywordLinkedSubcategories])];
      // Update all entries in the merge group
      for (const name of merged) {
        MERGED_SUBCATEGORIES[name.toLowerCase()] = merged;
      }
      console.log(`Keyword-linked merge: "${detectedSubcategory}" now merged with [${merged.join(", ")}]`);
    } else if (detectedSubcategory && keywordLinkedSubcategories.length > 0) {
      console.log(`Skipped stale keyword-linked merge for "${detectedSubcategory}"; links belonged to "${keywordLinkedOwnerSubcategory || "?"}"`);
    }

    const bundleResultIds = new Set(businesses.map(b => b.id));
    const bundleIsActive = bundleResultIds.size > 0;
    // Determine if query is essentially just subcategory + city + noise (no additional terms)
    const isSubcatOnlyQuery = !!detectedSubcategory && detectedSubcategoryIsReal && (() => {
      if (!effectiveQuery) return false;
      const subcatWords = new Set(
        detectedSubcategory!.toLowerCase().split(/[\s/\-]+/)
          .map(w => stripAccentsGlobal(w)).filter(w => w.length > 1)
      );
      const cityWords = new Set(
        (effectiveCity || "").toLowerCase().split(/\s+/)
          .map(w => stripAccentsGlobal(w)).filter(w => w.length > 1)
      );
      const remaining = effectiveQuery.toLowerCase().split(/\s+/)
        .map(w => stripAccentsGlobal(w))
        .filter(w => w.length > 1 && !FRENCH_STOP_WORDS.has(w) && !subcatWords.has(w) && !cityWords.has(w) && !NOISE_ADJECTIVES.has(w));
      return remaining.length === 0;
    })();
    if (isSubcatOnlyQuery) {
      console.log(`Subcategory-only query detected for "${detectedSubcategory}" — strict subcategory mode`);
    }
    if (detectedSubcategory) {
      // Helper to fetch businesses for a given subcategory (or merged group) with current filters
      const fetchSubcategoryBusinesses = async (subcat: string, filterByServices?: string[], options?: { skipNeighborhood?: boolean; overrideCity?: string }) => {
        // When a bundle is active, do NOT apply merge groups (e.g. don't merge Riad+Hôtel)
        // because the bundle already targeted the precise subcategory+service combination
        const mergedSubcats = bundleIsActive ? [subcat] : (MERGED_SUBCATEGORIES[subcat.toLowerCase()] || [subcat]);
        
        let subBuilder = supabase.from("businesses").select("*").eq("is_active", true);
        
        if (mergedSubcats.length === 1) {
          subBuilder = subBuilder.contains("categories", [mergedSubcats[0]]);
        } else {
          // OR: match businesses that have ANY of the merged subcategories
          const orClause = mergedSubcats.map(sc => `categories.cs.{"${sc}"}`).join(",");
          subBuilder = subBuilder.or(orClause);
          console.log(`Merged subcategory search: [${mergedSubcats.join(", ")}]`);
        }
        
        // When services are detected alongside a subcategory, filter to only businesses offering those services
        if (filterByServices && filterByServices.length > 0) {
          subBuilder = subBuilder.overlaps("services", filterByServices);
        }
        
        // City filter: use overrideCity if provided, otherwise effectiveCity
        const cityToUse = options?.overrideCity || effectiveCity;
        if (cityToUse) {
          if (cityToUse === effectiveCity) {
            subBuilder = applyCityFilter(subBuilder);
          } else {
            subBuilder = subBuilder.ilike("city", cityToUse);
          }
        }
        // Skip category filter for conflicts and when a subcategory was detected from its own keywords.
        // Example: "acheter un gâteau" maps "gâteau" → subcategory "Pâtisserie"; the generic
        // intent "acheter" must not narrow it back to Commerce/Agriculture.
        const skipCategoryFilterForConflict = intentSubcategoryConflict && intentCategories.length <= 1;
        const skipCategoryFilterForKeywordSubcategory = detectedSubcategoryFromKeyword && !!detectedSubcategory;
        if (effectiveCategories.length > 0 && !skipCategoryFilterForConflict && !skipCategoryFilterForKeywordSubcategory) {
          const catOrClauses = effectiveCategories.map(c => `main_category.eq.${c},categories.cs.{"${c}"}`).join(",");
          subBuilder = subBuilder.or(catOrClauses);
        } else if (effectiveCategory && !skipCategoryFilterForConflict && !skipCategoryFilterForKeywordSubcategory) {
          subBuilder = subBuilder.or(`main_category.eq.${effectiveCategory},categories.cs.{"${effectiveCategory}"}`);
        }
        // Filter by neighborhood if detected (unless explicitly skipped)
        if (detectedNeighborhood && !options?.skipNeighborhood) {
          const nhOrClause = buildNeighborhoodOrClause(detectedNeighborhood, loadedNeighborhoods);
          subBuilder = subBuilder.or(nhOrClause);
        }
        
        const effectiveLimit = subcategorySearchConfig?.max_results || limit;
        subBuilder = subBuilder
          .order("wtuce_status", { ascending: true })
          .order("google_rating", { ascending: false, nullsFirst: false })
          .order("priority_score", { ascending: false })
          .limit(effectiveLimit);
        
        const { data, error } = await subBuilder;
        if (!error && data && data.length > 0) {
          return data.map((b: any) => ({
            ...b,
            distance_km:
              latitude && longitude && b.latitude && b.longitude
                ? calculateDistance(latitude, longitude, b.latitude, b.longitude)
                : null,
          }));
        }
        return [];
      };

      // If services were detected alongside the subcategory (e.g. "Restaurant galerie" → Restaurant + Galerie d'Art),
      // filter subcategory results to only those offering the detected service(s)
      // BUT skip service filter when the detected service is essentially the same concept as the subcategory
      // (e.g. service "Boucherie" ≈ subcategory "Boucherie / Charcuterie") — the category filter is sufficient
      const subcatNorm = stripAccentsGlobal(detectedSubcategory.toLowerCase()).replace(/[\s/\-]+/g, " ").trim();
      const serviceIsRedundantWithSubcategory = detectedServices.length > 0 && detectedServices.every(svc => {
        const svcNorm = stripAccentsGlobal(svc.toLowerCase()).replace(/[\s/\-]+/g, " ").trim();
        // Only redundant if the service and subcategory names are essentially the same concept
        // NOT when the service has additional qualifying words (e.g. "Excursions Vélo" vs "Excursions")
        const svcContentWords = svcNorm.split(" ").filter(w => w.length > 1 && !FRENCH_STOP_WORDS.has(w));
        const subcatContentWords = subcatNorm.split(" ").filter(w => w.length > 1 && !FRENCH_STOP_WORDS.has(w));
        // Redundant only if same word count and mutual inclusion (e.g. "Boucherie" ≈ "Boucherie / Charcuterie")
        // or exact match after normalization
        if (svcNorm === subcatNorm) return true;
        // If the service has MORE content words than the subcategory, it's more specific → NOT redundant
        if (svcContentWords.length > subcatContentWords.length) return false;
        return subcatNorm.includes(svcNorm) || svcNorm.includes(subcatNorm);
      });
      if (serviceIsRedundantWithSubcategory) {
        console.log(`Service filter [${detectedServices.join(", ")}] is redundant with subcategory "${detectedSubcategory}" — skipping`);
      }
      let serviceFilter = (detectedServices.length > 0 && !serviceIsRedundantWithSubcategory) ? detectedServices : undefined;
      
      // When a bundle is active, also run the subcategory query and merge results.
      // This ensures businesses that match the subcategory (e.g. "Massage") but weren't
      // captured by the bundle's specific service/badge filters are still included.
      const subcatResults = await fetchSubcategoryBusinesses(detectedSubcategory, serviceFilter);
      if (bundleIsActive) {
        // Merge: add subcategory results that aren't already in bundle results
        let addedFromSubcat = 0;
        for (const b of subcatResults) {
          if (!bundleResultIds.has(b.id)) {
            businesses.push(b);
            bundleResultIds.add(b.id);
            addedFromSubcat++;
          }
        }
        console.log(`Bundle active — merged ${addedFromSubcat} additional subcategory results for "${detectedSubcategory}" (total: ${businesses.length})`);
      } else {
        businesses = subcatResults;
      }
      searchLevel = "exact";
      console.log(`Subcategory direct query "${detectedSubcategory}" + city "${effectiveCity}" + neighborhood "${detectedNeighborhood}" + services filter [${(serviceFilter || []).join(", ")}]: ${businesses.length} results (bundleActive=${bundleIsActive})`);

      // If service filter yielded 0 results but would have results without it,
      // the detected service likely doesn't belong to this subcategory (e.g. "Fleurs comestibles" vs "Fleuriste")
      // → drop the service filter and retry with just the subcategory
      if (businesses.length === 0 && serviceFilter) {
        // Try with all originally matched service names (e.g. "Vin" failed → try "Cave à vin", "Cave à vin d'exception", etc.)
        if (allMatchedServiceNames.length > serviceFilter.length) {
          const broadFilter = [...new Set(allMatchedServiceNames)];
          console.log(`Service filter [${serviceFilter.join(", ")}] returned 0 results — trying all matched services [${broadFilter.join(", ")}]`);
          businesses = await fetchSubcategoryBusinesses(detectedSubcategory, broadFilter);
          if (businesses.length > 0) {
            serviceFilter = broadFilter;
            console.log(`Broad service filter matched: ${businesses.length} results`);
          }
        }
        // If still 0, drop service filter entirely
        if (businesses.length === 0) {
          console.log(`Service filter [${(serviceFilter || []).join(", ")}] returned 0 results for subcategory "${detectedSubcategory}" — retrying without service filter`);
          businesses = await fetchSubcategoryBusinesses(detectedSubcategory);
          serviceFilter = undefined;
          // Keep detected services for neighborhood-driven enrichment (cross-subcategory local intent)
          if (!detectedNeighborhood) {
            detectedServices = [];
            detectedService = null;
            allCandidateServiceNames = [];
          }
          console.log(`Subcategory without service filter "${detectedSubcategory}": ${businesses.length} results`);
        }
      }

      // ── Neighborhood: compute associated city for enrichment scope, but NEVER widen results ──
      // When a user searches in a specific neighborhood, respect that constraint strictly
      const neighborhoodCity = detectedNeighborhood && !effectiveCity ? getNeighborhoodCity(detectedNeighborhood, loadedNeighborhoods) : null;
      if (businesses.length === 0 && detectedNeighborhood) {
        console.log(`Neighborhood "${detectedNeighborhood}" yielded 0 results for subcategory "${detectedSubcategory}" — NOT widening to city (strict neighborhood mode)`);
      }

      // Enrichment by services within the same location scope
      // - If a specific service filter exists, enrich by that service list (e.g. "alcool")
      // - Otherwise, fallback to subcategory-as-service enrichment (legacy behavior)
      const enrichmentCity = effectiveCity || neighborhoodCity;
      // isSubcatOnlyQuery is computed above (before this block) so it's accessible everywhere
      const enrichmentServiceNames = (bundleActivated && bundleRequiredServices.length > 0)
        ? bundleRequiredServices
        : (serviceFilter && serviceFilter.length > 0)
        ? serviceFilter
        : (detectedServices.length > 0 ? detectedServices : [detectedSubcategory]);

      if (enrichmentServiceNames.length > 0 && !isSubcatOnlyQuery) {
        const existingIds = new Set(businesses.map(b => b.id));
        let svcBuilder = supabase.from("businesses").select("*").eq("is_active", true)
          .overlaps("services", enrichmentServiceNames);

        if (enrichmentCity) {
          if (enrichmentCity === effectiveCity) {
            svcBuilder = applyCityFilter(svcBuilder);
          } else {
            svcBuilder = svcBuilder.ilike("city", enrichmentCity);
          }
        }

        // Filter by category: use effectiveCategories (from intent/URL) or fall back to detected subcategory's parent
        // BUT skip category filter only when a specific service filter is active AND no subcategory was detected
        // (e.g. searching for "Excursions Vélo" with no specific subcategory should be cross-category)
        // When a subcategory IS detected (e.g. "Hôtel"), keep the category filter to avoid leaking unrelated categories
        const hasSpecificServiceFilter = serviceFilter && serviceFilter.length > 0;
        const enrichmentCats = effectiveCategories.length > 0 ? effectiveCategories : (subcategoryParentCategory ? [subcategoryParentCategory] : []);
        const skipEnrichmentCategoryFilterForConflict = intentSubcategoryConflict && intentCategories.length <= 1;
        const skipCategoryForCrossService = hasSpecificServiceFilter && !detectedSubcategoryIsReal;
        if (enrichmentCats.length > 0 && !skipEnrichmentCategoryFilterForConflict && !skipCategoryForCrossService) {
          const catOrClauses = enrichmentCats.map(c => `main_category.eq.${c},categories.cs.{"${c}"}`).join(",");
          svcBuilder = svcBuilder.or(catOrClauses);
        }

        if (detectedNeighborhood) {
          svcBuilder = svcBuilder.or(buildNeighborhoodOrClause(detectedNeighborhood, loadedNeighborhoods));
        }

        svcBuilder = svcBuilder
          .order("wtuce_status", { ascending: true })
          .order("priority_score", { ascending: false })
          .limit(limit);

        const { data: svcData, error: svcError } = await svcBuilder;
        if (!svcError && svcData && svcData.length > 0) {
          const newResults = svcData
            .filter((b: any) => !existingIds.has(b.id))
            .map((b: any) => ({
              ...b,
              distance_km: latitude && longitude && b.latitude && b.longitude
                ? calculateDistance(latitude, longitude, b.latitude, b.longitude) : null,
            }));
          businesses = [...businesses, ...newResults];
        }
        console.log(`Service enrichment [${enrichmentServiceNames.join(", ")}] for subcategory "${detectedSubcategory}": ${businesses.length} total results`);
      }

      // ── CROSS-CATEGORY SERVICE MERGE ──
      // When the query word matched a subcategory name (e.g. "Céramique" → "Poterie / Céramique"),
      // the word was excluded from service detection. But if it also matches a real service name,
      // businesses with that service in OTHER categories are missing. Merge them here.
      if (detectedSubcategory && detectedServices.length === 0 && effectiveQuery && !isSubcatOnlyQuery) {
        const subcatWords = detectedSubcategory.toLowerCase().split(/[\s/]+/).filter(w => w.length > 2);
        const queryWordsLower = effectiveQuery.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !FRENCH_STOP_WORDS.has(w));
        // Find query words that overlap with subcategory name words
        const overlappingWords = queryWordsLower.filter(qw => 
          subcatWords.some(sw => stripAccentsGlobal(sw) === stripAccentsGlobal(qw) || sw === qw)
        );
        if (overlappingWords.length > 0) {
          // Check if any of these words match an actual service name
          const { data: crossCatServices } = await supabase
            .from("services")
            .select("name_fr")
            .or(overlappingWords.map(w => `name_fr.ilike.${w}`).join(","));
          if (crossCatServices && crossCatServices.length > 0) {
            const crossServiceNames = crossCatServices.map((s: any) => s.name_fr);
            const existingIds = new Set(businesses.map(b => b.id));
            let crossBuilder = supabase.from("businesses").select("*").eq("is_active", true)
              .overlaps("services", crossServiceNames);
            if (effectiveCity) crossBuilder = applyCityFilter(crossBuilder);
            if (detectedNeighborhood) {
              crossBuilder = crossBuilder.or(buildNeighborhoodOrClause(detectedNeighborhood, loadedNeighborhoods));
            }
            crossBuilder = crossBuilder
              .order("wtuce_status", { ascending: true })
              .order("google_rating", { ascending: false, nullsFirst: false })
              .order("priority_score", { ascending: false })
              .limit(limit);
            const { data: crossData, error: crossError } = await crossBuilder;
            if (!crossError && crossData && crossData.length > 0) {
              const newResults = crossData
                .filter((b: any) => !existingIds.has(b.id))
                .map((b: any) => ({
                  ...b,
                  distance_km: latitude && longitude && b.latitude && b.longitude
                    ? calculateDistance(latitude, longitude, b.latitude, b.longitude) : null,
                }));
              businesses = [...businesses, ...newResults];
              console.log(`🔀 Cross-category service merge [${crossServiceNames.join(", ")}]: +${newResults.length} results (total: ${businesses.length})`);
            }
          }
        }
      }

      // (Alcohol-specific fallback removed — now handled generically by the service enrichment block above)

      // Append related subcategories (e.g. "Epicerie fine" after "Supermarché")
      const relatedSubcats = RELATED_SUBCATEGORIES[detectedSubcategory];
      if (relatedSubcats && relatedSubcats.length > 0) {
        const existingIds = new Set(businesses.map(b => b.id));
        for (const relSubcat of relatedSubcats) {
          const relatedResults = await fetchSubcategoryBusinesses(relSubcat);
          const newResults = relatedResults.filter(b => !existingIds.has(b.id));
          businesses = [...businesses, ...newResults];
          console.log(`Related subcategory "${relSubcat}": +${newResults.length} results (total: ${businesses.length})`);
        }
      }

      // ── Synonym-linked subcategories: moved AFTER strict mode refinement (see below) ──

      // ── Intent-subcategory conflict merge ──
      // When intent (e.g. "manger" → Restauration) conflicts with subcategory (e.g. Poissonnerie → Commerce),
      // also fetch businesses from the intent category that offer the relevant service, and prepend them
      if (intentSubcategoryConflict && intentCategory) {
        const existingIds = new Set(businesses.map(b => b.id));
        // Find services matching the query words that triggered the subcategory
        // e.g. "poisson" matched Poissonnerie → look for service "Poisson" in restaurants
        const qWords = (effectiveQuery || "").toLowerCase().split(/\s+/).filter((w: string) => 
          w.length > 2 && !FRENCH_STOP_WORDS.has(w) && !INTENT_TO_CATEGORY[w]
        );
        // Look up actual service names that match query words
        const { data: matchingIntentServices } = await supabase
          .from("services")
          .select("name_fr")
          .or(qWords.map(w => `name_fr.ilike.%${w}%`).join(","));
        const serviceVariants = matchingIntentServices 
          ? [...new Set(matchingIntentServices.map((s: any) => s.name_fr))]
          : [detectedSubcategory];
        
        if (serviceVariants.length > 0) {
          let intentBuilder = supabase.from("businesses").select("*").eq("is_active", true)
            .or(`main_category.eq.${intentCategory},categories.cs.{"${intentCategory}"}`)
            .overlaps("services", serviceVariants);
          if (effectiveCity) intentBuilder = applyCityFilter(intentBuilder);
          if (detectedNeighborhood) {
            intentBuilder = intentBuilder.or(buildNeighborhoodOrClause(detectedNeighborhood, loadedNeighborhoods));
          }
          intentBuilder = intentBuilder
            .order("wtuce_status", { ascending: true })
            .order("google_rating", { ascending: false, nullsFirst: false })
            .order("priority_score", { ascending: false })
            .limit(limit);
          const { data: intentData } = await intentBuilder;
          if (intentData && intentData.length > 0) {
            const intentResults = intentData
              .filter((b: any) => !existingIds.has(b.id))
              .map((b: any) => ({
                ...b,
                distance_km: latitude && longitude && b.latitude && b.longitude
                  ? calculateDistance(latitude, longitude, b.latitude, b.longitude) : null,
              }));
            // Prepend intent results (e.g. restaurants first, then poissonneries)
            businesses = [...intentResults, ...businesses];
            console.log(`Intent-conflict merge: +${intentResults.length} "${intentCategory}" with services [${serviceVariants.join(", ")}] (total: ${businesses.length})`);
          }
        }
      }

      // Skip in strict mode to preserve the rating-based sort order from the DB query
      const isSubcategoryPhraseOnlyMode =
        !!detectedSubcategory &&
        detectedSubcategoryIsReal &&
        isSubcatOnlyQuery;

      if (effectiveQuery && businesses.length > 1 && !isSubcategoryPhraseOnlyMode) {
        const qLower = effectiveQuery.toLowerCase();
        const qWords = qLower.split(/\s+/).filter(w => w.length > 1 && !FRENCH_STOP_WORDS.has(w));
        if (qWords.length >= 2) {
          const boosted: typeof businesses = [];
          const rest: typeof businesses = [];
          for (const b of businesses) {
            const bName = b.name.toLowerCase();
            const bWords = bName.split(/\s+/).filter((w: string) => w.length > 1);
            // Count how many query content words appear in the business name
            const matchCount = qWords.filter(qw => bWords.some((bw: string) => bw.includes(qw) || qw.includes(bw))).length;
            // Strong match: >= 70% of query content words found in name
            if (matchCount >= Math.ceil(qWords.length * 0.7)) {
              boosted.push(b);
            } else {
              rest.push(b);
            }
          }
          if (boosted.length > 0 && boosted.length < businesses.length) {
            businesses = [...boosted, ...rest];
            console.log(`Name-match boost: moved ${boosted.length} business(es) to top: [${boosted.map(b => b.name).join(", ")}]`);
          }
        }
      }
    }

    // ── Apply boost_weight from search config: re-sort with weighted priority ──
    if (subcategorySearchConfig && subcategorySearchConfig.boost_weight !== 1.0 && businesses.length > 1) {
      businesses = [...businesses].sort((a, b) => {
        const aScore = (a.priority_score || 0) * subcategorySearchConfig!.boost_weight;
        const bScore = (b.priority_score || 0) * subcategorySearchConfig!.boost_weight;
        // Keep verified first, then boosted priority
        if (a.wtuce_status !== b.wtuce_status) return a.wtuce_status === "verified" ? -1 : 1;
        return bScore - aScore;
      });
      console.log(`Applied boost_weight ${subcategorySearchConfig.boost_weight} to ${businesses.length} results`);
    }

    // In strict mode, if subcategory was detected, do NOT fall through to tsquery
    const isSubcategoryPhraseOnlyMode =
      !!detectedSubcategory &&
      detectedSubcategoryIsReal &&
      isSubcatOnlyQuery;
    const isStrictMode =
      (subcategorySearchConfig?.search_mode === "strict" && !!detectedSubcategory) ||
      isSubcategoryPhraseOnlyMode;
    if (isSubcategoryPhraseOnlyMode) {
      console.log(`Subcategory-only phrase mode enabled for "${detectedSubcategory}"`);
    }
    // In broad mode (default), ALSO run tsquery even if subcategory direct query found results,
    // and merge the results. This is the key difference: broad = subcategory + full-text merged.
    const isBroadWithResults = !isStrictMode && !bundleActivated && detectedSubcategory && businesses.length > 0;
    let broadExistingBusinesses = isBroadWithResults ? [...businesses] : [];
    if (isStrictMode && detectedSubcategory) {
      // In strict mode, if there are remaining query terms (e.g. "Mamounia public" from "bars de la Mamounia ouverts au public"),
      // do a supplementary tsquery search within the subcategory to find businesses matching those terms
      const subcatTokens = new Set(
        (detectedSubcategory || "").toLowerCase().split(/[\s/\-]+/).map(t => stripAccentsGlobal(t)).filter(t => t.length > 1)
      );
      const remainingTerms = queryForExpansion
        ? queryForExpansion.split(/\s+/)
            .map(w => w.trim().toLowerCase())
            .map(w => stripAccentsGlobal(w))
            .filter(w => w.length > 1 && !FRENCH_STOP_WORDS.has(w))
            .filter(w => !subcatTokens.has(w))
        : [];
      
      if (remainingTerms.length > 0) {
        // Build a tsquery from remaining terms and search within the subcategory
        const tsTerms = remainingTerms.map(t => sanitizeTerm(t)).filter(t => t.length > 1);
        if (tsTerms.length > 0) {
          const tsQuery = tsTerms.join(" & ");
          const mergedSubcats = MERGED_SUBCATEGORIES[detectedSubcategory.toLowerCase()] || [detectedSubcategory];
          const orClause = mergedSubcats.map(sc => `categories.cs.{"${sc}"}`).join(",");
          
          let strictTsBuilder = supabase.from("businesses").select("*").eq("is_active", true)
            .or(orClause)
            .textSearch("search_vector", tsQuery, { type: "plain", config: "simple" });
          if (effectiveCity) strictTsBuilder = applyCityFilter(strictTsBuilder);
          strictTsBuilder = strictTsBuilder
            .order("wtuce_status", { ascending: true })
            .order("google_rating", { ascending: false, nullsFirst: false })
            .order("priority_score", { ascending: false })
            .limit(limit);
          
          const { data: strictTsData, error: strictTsError } = await strictTsBuilder;
          if (!strictTsError && strictTsData && strictTsData.length > 0) {
            const strictTsBusinesses = strictTsData.map((b: any) => ({
              ...b,
              distance_km: latitude && longitude && b.latitude && b.longitude
                ? calculateDistance(latitude, longitude, b.latitude, b.longitude) : null,
            }));
            // Replace results with the filtered set
            businesses = strictTsBusinesses;
            // Re-apply neighborhood filter since strict mode bypasses Level 1 neighborhood filtering
            if (detectedNeighborhood && businesses.length > 0) {
              const beforeNh = businesses.length;
              businesses = filterByNeighborhood(businesses, detectedNeighborhood, isNeighborhoodOnlyQuery, loadedNeighborhoods);
              console.log(`Strict mode neighborhood re-filter "${detectedNeighborhood}": ${beforeNh} → ${businesses.length}`);
            }
            console.log(`Strict mode for "${detectedSubcategory}": tsquery "${tsQuery}" found ${businesses.length} results matching remaining terms [${remainingTerms.join(", ")}]`);
          } else {
            console.log(`Strict mode for "${detectedSubcategory}": tsquery "${tsQuery}" found 0 results, keeping original ${businesses.length} results`);
          }
        } else {
          console.log(`Strict mode for "${detectedSubcategory}": skipping tsquery fallback (${businesses.length} results from direct query)`);
        }
      } else {
        console.log(`Strict mode for "${detectedSubcategory}": skipping tsquery fallback (${businesses.length} results from direct query)`);
      }
    }

    if (detectedSubcategoryFromKeyword && detectedSubcategory && businesses.length > 0) {
      const subcatNorm = stripAccentsGlobal(detectedSubcategory.toLowerCase());
      const beforeKeywordSubcatFilter = businesses.length;
      businesses = businesses.filter((b: any) => {
        const categories = (b.categories || []).map((c: string) => stripAccentsGlobal(c.toLowerCase()));
        return categories.some((c: string) => c === subcatNorm);
      });
      if (broadExistingBusinesses.length > 0) broadExistingBusinesses = [...businesses];
      console.log(`Keyword-detected subcategory relevance filter "${detectedSubcategory}": ${beforeKeywordSubcatFilter} → ${businesses.length}`);
    }

    // ── Synonym-linked subcategories: merge AFTER strict mode so they don't get overwritten ──
    // Skip if synonyms were scoped out (detected subcategory had no matching synonym filters)
    if (detectedSubcategory && synonymLinkedSubcategories.length > 0 && !synonymsScopedOut && !isSubcategoryPhraseOnlyMode) {
      const existingIds = new Set(businesses.map(b => b.id));
      const extraSubcats = synonymLinkedSubcategories.filter(sc => sc.toLowerCase() !== detectedSubcategory!.toLowerCase());
      for (const synSubcat of extraSubcats) {
        let synBuilder = supabase.from("businesses").select("*").eq("is_active", true)
          .contains("categories", [synSubcat]);
        if (effectiveCity) synBuilder = applyCityFilter(synBuilder);
        synBuilder = synBuilder
          .order("wtuce_status", { ascending: true })
          .order("google_rating", { ascending: false, nullsFirst: false })
          .order("priority_score", { ascending: false })
          .limit(limit);
        const { data: synData } = await synBuilder;
        if (synData) {
          const newResults = synData
            .filter((b: any) => !existingIds.has(b.id))
            .map((b: any) => ({
              ...b,
              distance_km: latitude && longitude && b.latitude && b.longitude
                ? calculateDistance(latitude, longitude, b.latitude, b.longitude) : null,
            }));
          for (const b of newResults) existingIds.add(b.id);
          businesses = [...businesses, ...newResults];
          console.log(`Synonym-linked subcategory "${synSubcat}": +${newResults.length} results (total: ${businesses.length})`);
        }
      }
    }

    // In broad mode with existing results, temporarily clear businesses so tsquery runs
    if (!detectedSubcategory && synonymLinkedSubcategories.length > 0 && businesses.length === 0) {
      console.log(`No subcategory detected but synonym-linked subcategories found: [${synonymLinkedSubcategories.join(", ")}]`);
      const existingIds = new Set(businesses.map(b => b.id));
      for (const synSubcat of synonymLinkedSubcategories) {
        let synBuilder = supabase.from("businesses").select("*").eq("is_active", true)
          .contains("categories", [synSubcat]);
        if (effectiveCity) synBuilder = applyCityFilter(synBuilder);
        if (detectedNeighborhood) {
          synBuilder = synBuilder.or(buildNeighborhoodOrClause(detectedNeighborhood, loadedNeighborhoods));
        }
        synBuilder = synBuilder
          .order("wtuce_status", { ascending: true })
          .order("google_rating", { ascending: false, nullsFirst: false })
          .order("priority_score", { ascending: false })
          .limit(limit);
        const { data: synData, error: synError } = await synBuilder;
        if (!synError && synData && synData.length > 0) {
          const newResults = synData
            .filter((b: any) => !existingIds.has(b.id))
            .map((b: any) => ({
              ...b,
              distance_km: latitude && longitude && b.latitude && b.longitude
                ? calculateDistance(latitude, longitude, b.latitude, b.longitude) : null,
            }));
          for (const b of newResults) existingIds.add(b.id);
          businesses = [...businesses, ...newResults];
          console.log(`Synonym-linked subcategory "${synSubcat}": +${newResults.length} results (total: ${businesses.length})`);
        }
      }
      if (businesses.length > 0) {
        searchLevel = "exact";
      }
    }

    // Level 1: Exact full-text search with ts_rank (services/name weight A > description weight B)
    if ((queryForExpansion || city || effectiveCity || effectiveCategory) && businesses.length === 0 && !isStrictMode) {
      // When a service was detected and injected, don't expand service name words with synonyms
      // to avoid polluting the tsquery with unrelated terms (e.g. "vin" expanding to "bar")
      // BUT include ALL candidate service names as OR alternatives so synonyms match (e.g. Glacier | Glaces)
      let expandedQuery: string | null = null;
      if (queryForExpansion && detectedService) {
        const svcWords = detectedService.toLowerCase().split(/\s+/).filter(w => w.length > 0);
        const remainderWords = queryForExpansion.toLowerCase().split(/\s+/).filter(w => !svcWords.includes(w) && w.length > 0);
        
        // Build OR group from ALL candidate service names (not just the primary one)
        // Also include original matched keywords (e.g. "tapis") so businesses with that exact service name also match
        // Filter out French stop words (en, de, à, la, le, etc.) to avoid matching everything
        const allSvcTerms = allCandidateServiceNames.flatMap(name => 
          name.toLowerCase().split(/[\s/\-]+/).map(w => stripAccentsGlobal(sanitizeTerm(w))).filter(t => t.length > 1 && !FRENCH_STOP_WORDS.has(t))
        );
        // Add original keyword terms that triggered service detection (e.g. "tapis" → service "Artisanat marocain")
        // BUT skip terms that are just singular/plural variants of terms already in allSvcTerms
        // (e.g. "cour" when "cours" is already present from "Cours de piano")
        const allSvcTermsSet = new Set(allSvcTerms);
        // Also add singular/plural variants of svc terms for comparison
        const svcTermVariants = new Set(allSvcTerms);
        for (const t of allSvcTerms) {
          if (t.length > 3 && t.endsWith("s")) svcTermVariants.add(t.slice(0, -1));
          if (t.length > 2 && !t.endsWith("s")) svcTermVariants.add(t + "s");
        }
        const originalKeywordTerms = serviceMatchWordsForInjection
          .map(w => stripAccentsGlobal(sanitizeTerm(w.toLowerCase())))
          .filter(t => t.length > 1 && !FRENCH_STOP_WORDS.has(t) && !svcTermVariants.has(t));
        const uniqueSvcTermsBase = [...new Set([...allSvcTerms, ...originalKeywordTerms])];
        // Add singular/plural variants for each service term so FTS matches both forms
        // e.g. "trottinettes" → also add "trottinette" (search_vector may store either form)
        const uniqueSvcTermsWithVariants = new Set(uniqueSvcTermsBase);
        for (const t of uniqueSvcTermsBase) {
          if (t.length > 3 && t.endsWith("s") && !t.endsWith("ss")) {
            uniqueSvcTermsWithVariants.add(t.slice(0, -1));
          }
          if (t.length > 2 && !t.endsWith("s")) {
            uniqueSvcTermsWithVariants.add(t + "s");
          }
        }
        const uniqueSvcTerms = [...uniqueSvcTermsWithVariants];
        const svcPart = uniqueSvcTerms.length > 1
          ? `(${uniqueSvcTerms.join(" | ")})`
          : uniqueSvcTerms[0] || "";
        
        // Remainder words: expand with synonyms
        const remainderExpanded = remainderWords.length > 0 ? expandQuery(remainderWords.join(" ")) : "";
        const parts = [svcPart, remainderExpanded].filter(p => p.length > 0);
        expandedQuery = parts.join(" & ") || null;
      } else if (queryForExpansion) {
        // When the query is exactly the detected subcategory and it's multi-word,
        // use phrase operator (<->) so "beach club" only matches adjacent tokens,
        // preventing partial matches on just "club" (e.g. Tennis Academy, Montecristo)
        if (detectedSubcategory && queryForExpansion.toLowerCase().trim() === detectedSubcategory.toLowerCase().trim() && detectedSubcategory.includes(" ")) {
          const phraseWords = queryForExpansion.toLowerCase().split(/[\s\-]+/)
            .filter(w => w.length > 0 && !NOISE_ADJECTIVES.has(w))
            .map(w => stripAccentsGlobal(sanitizeTerm(w)))
            .filter(t => t.length > 1);
          if (phraseWords.length >= 2) {
            expandedQuery = phraseWords.join(" <-> ");
            console.log(`Phrase matching for multi-word subcategory "${detectedSubcategory}": "${expandedQuery}"`);
          } else {
            expandedQuery = expandQuery(queryForExpansion);
          }
        } else {
          expandedQuery = expandQuery(queryForExpansion);
        }
      }
      if (expandedQuery) console.log(`tsquery: "${expandedQuery}" (service: ${detectedService || "none"}, candidates: [${allCandidateServiceNames.join(", ")}], from: "${queryForExpansion}")`);

      if (!expandedQuery && effectiveCategory && !detectedSubcategory) {
        // No tsquery terms left (e.g. "dormir à essaouira" → intent=Hôtellerie, city=Essaouira)
        // Do a direct category + city/neighborhood query instead
        let catBuilder = supabase.from("businesses").select("*").eq("is_active", true)
          .or(`main_category.eq.${effectiveCategory},categories.cs.{"${effectiveCategory}"}`);
        if (effectiveCity) catBuilder = applyCityFilter(catBuilder);
        if (detectedNeighborhood) {
          catBuilder = catBuilder.or(buildNeighborhoodOrClause(detectedNeighborhood, loadedNeighborhoods));
        }
        catBuilder = catBuilder.order("priority_score", { ascending: false, nullsFirst: false }).limit(limit);
        const { data: catData, error: catError } = await catBuilder;
        if (!catError && catData && catData.length > 0) {
          let catResults = catData;
          // Post-filter by neighborhood if detected (the .or() above is additive, need strict filter)
          if (detectedNeighborhood) {
            catResults = filterByNeighborhood(catResults, detectedNeighborhood, true, loadedNeighborhoods);
          }
          businesses = catResults.map((b: any) => ({
            ...b,
            distance_km: latitude && longitude && b.latitude && b.longitude
              ? calculateDistance(latitude, longitude, b.latitude, b.longitude) : null,
          }));
          searchLevel = "exact";
          console.log(`Category+neighborhood direct query "${effectiveCategory}" + "${detectedNeighborhood || effectiveCity}": ${businesses.length} results`);
        }
      }
      // City-only query: no text, no category, just a city detected from the query (e.g. "marrakesh")
      if (!expandedQuery && !effectiveCategory && effectiveCity && businesses.length === 0) {
        let cityBuilder = supabase.from("businesses").select("*").eq("is_active", true);
        cityBuilder = applyCityFilter(cityBuilder);
        if (mainCategory) {
          cityBuilder = cityBuilder.eq("main_category", mainCategory);
          console.log(`City-only query: filtering by mainCategory "${mainCategory}"`);
        }
        cityBuilder = cityBuilder.order("priority_score", { ascending: false, nullsFirst: false }).limit(limit);
        const { data: cityData, error: cityError } = await cityBuilder;
        if (!cityError && cityData && cityData.length > 0) {
          businesses = cityData.map((b: any) => ({
            ...b,
            distance_km: latitude && longitude && b.latitude && b.longitude
              ? calculateDistance(latitude, longitude, b.latitude, b.longitude) : null,
          }));
          searchLevel = "exact";
          console.log(`City-only query "${effectiveCity}": ${businesses.length} results`);
        }
      }
      if (expandedQuery) {
        // Use ranked RPC function: prioritizes matches in services/name over description
        // Don't use p_service filter in RPC — we'll post-filter with all candidates instead
        // This ensures synonym services (Glacier vs Glaces) are all found
        const result = await supabase.rpc("search_businesses_with_rank", {
          p_query: expandedQuery,
          p_city: effectiveCity || null,
          p_category: effectiveCategory || null,
          p_service: null,
          p_limit: limit,
          p_city_id: strictCity ? null : (effectiveCityId || null),
        });
        const { data, error } = result;

        if (error) {
          console.error(`RPC search_businesses_with_rank error: ${error.message} (query="${expandedQuery}", city="${effectiveCity}")`);
        }

        if (!error && data && data.length > 0) {
          businesses = data.map((b: any) => ({
            ...b,
            distance_km:
              latitude && longitude && b.latitude && b.longitude
                ? calculateDistance(latitude, longitude, b.latitude, b.longitude)
                : null,
          }));
          
          // FIRST: Post-filter by detected subcategory (more precise than main_category)
          // In broad mode with existing direct results, skip this filter to get broader tsquery matches
          // The direct subcategory results are already preserved in broadExistingBusinesses
          if (detectedSubcategory && !isBroadWithResults) {
            const beforeCount = businesses.length;
            const filtered = businesses.filter((b: any) => {
              const bCategories = (b.categories || []).map((c: string) => c.toLowerCase());
              return bCategories.some((c: string) => c.includes(detectedSubcategory!.toLowerCase()) || detectedSubcategory!.toLowerCase().includes(c));
            });
            if (filtered.length > 0) {
              businesses = filtered;
            }
            console.log(`Subcategory post-filter "${detectedSubcategory}": ${beforeCount} → ${businesses.length}`);
          }

          // THEN: Post-filter by services:
          // If multiple services are detected, enforce strict AND across service names.
          const shouldUseMultiServiceAnd = detectedServices.length > 1;

          if (shouldUseMultiServiceAnd) {
            // AND logic: business must have ALL distinct detected services
            const beforeCount = businesses.length;
            businesses = businesses.filter((b: any) => {
              const businessServices = (b.services || []).map((s: string) => normalizeMatchingText(s));
              return detectedServices.every((ds) => {
                const normalizedDetected = normalizeMatchingText(ds);
                // Use prefix matching: "Cours" matches "cours débutant", "cours collectifs", etc.
                return businessServices.some((serviceName: string) => serviceName === normalizedDetected || serviceName.startsWith(normalizedDetected + " "));
              });
            });
            console.log(`Multi-service AND post-filter [${detectedServices.join(", ")}]: ${beforeCount} → ${businesses.length}`);
          } else if (allCandidateServiceNames.length > 0) {
            // OR logic: business must have at least ONE of the candidate services
            // BUT always keep businesses whose name closely matches the ORIGINAL query
            // Also include original matched keywords as valid service names (e.g. "tapis" keyword → also accept "Tapis" service)
            const extendedCandidates = [...allCandidateServiceNames];
            // Only inject individual query words that are NOT already part of a detected multi-word service name.
            // e.g. if "Cave à cigare" is detected, don't inject "cave" and "cigare" as standalone candidates
            // because they would match unrelated businesses (e.g. "cave à vin" via "cave").
            const multiWordServiceTokens = new Set<string>();
            for (const sn of allCandidateServiceNames) {
              if (sn.includes(" ") || sn.includes("-")) {
                for (const w of sn.toLowerCase().split(/[\s\-]+/)) {
                  if (w.length > 1 && !FRENCH_STOP_WORDS.has(w)) {
                    multiWordServiceTokens.add(w);
                    multiWordServiceTokens.add(stripAccentsGlobal(w));
                    // Also add singular/plural variants so "cour" is recognized as variant of "cours"
                    if (w.length > 3 && w.endsWith("s")) multiWordServiceTokens.add(w.slice(0, -1));
                    if (w.length > 2 && !w.endsWith("s")) multiWordServiceTokens.add(w + "s");
                    const stripped = stripAccentsGlobal(w);
                    if (stripped.length > 3 && stripped.endsWith("s")) multiWordServiceTokens.add(stripped.slice(0, -1));
                    if (stripped.length > 2 && !stripped.endsWith("s")) multiWordServiceTokens.add(stripped + "s");
                  }
                }
              }
            }
            for (const kw of serviceMatchWordsForInjection) {
              const kwLower = kw.toLowerCase();
              // Skip if this word is a component (or plural/singular variant) of a multi-word service already in candidates
              if (multiWordServiceTokens.has(kwLower) || multiWordServiceTokens.has(stripAccentsGlobal(kwLower))) continue;
              if (!extendedCandidates.some(c => c.toLowerCase() === kwLower)) {
                extendedCandidates.push(kw);
              }
            }
            const originalQueryLower = (query || "").toLowerCase().trim();
            const beforeCount = businesses.length;
            businesses = businesses.filter((b: any) => {
              // Keep if business name matches original query (user searching by name)
              const bNameLower = (b.name || "").toLowerCase();
              if (originalQueryLower.length >= 4 && (
                bNameLower.includes(originalQueryLower) || originalQueryLower.includes(bNameLower)
              )) {
                return true;
              }
              // Also keep if most significant words of the business name appear in the query
              const bWords = bNameLower.split(/\s+/).filter((w: string) => w.length > 2);
              const queryWords = originalQueryLower.split(/\s+/).filter((w: string) => w.length > 2);
              if (bWords.length >= 2 && queryWords.length >= 2) {
                const matchCount = bWords.filter((w: string) => queryWords.some((qw: string) => qw.includes(w) || w.includes(qw))).length;
                if (matchCount >= Math.ceil(bWords.length * 0.7)) {
                  return true;
                }
              }
              const allBusinessTags = collectBusinessTags(b);
              return extendedCandidates.some(cs => tagsMatchCandidate(cs, allBusinessTags));
            });
            if (beforeCount > 0 && businesses.length === 0) {
              // Debug: log what businesses were filtered out and why
              const debugSample = data.slice(0, 5).map((b: any) => ({
                name: b.name,
                services: (b.services || []).slice(0, 5),
                categories: (b.categories || []).slice(0, 3),
              }));
              console.log(`Service AND debug - filtered businesses: ${JSON.stringify(debugSample)}`);
            }
            console.log(`Service AND post-filter [${extendedCandidates.join(", ")}]: ${beforeCount} → ${businesses.length}`);
            
            // When service filter gives 0 results, fallback to the original FTS results
            // (before post-filter). The service detection was a false positive — the FTS
            // already found the right businesses via subcategory/business keywords.
            if (businesses.length === 0 && data && data.length > 0) {
              console.log(`Service AND filter returned 0 results — reusing original ${data.length} FTS results (service detection was false positive)`);
              businesses = data.map((b: any) => ({
                ...b,
                distance_km: latitude && longitude && b.latitude && b.longitude
                  ? calculateDistance(latitude, longitude, b.latitude, b.longitude) : null,
              }));
              // Clear the false-positive service detection so it doesn't affect downstream logic
              detectedService = null;
              detectedServices = [];
              allCandidateServiceNames = [];
            }

            // Final fallback: when search_vector misses relevant businesses (e.g. keyword-only entries),
            // fetch a broader candidate set and apply semantic tag matching in memory.
            if (businesses.length === 0 && allCandidateServiceNames.length > 0) {
              let semanticFallbackBuilder = supabase.from("businesses").select("*").eq("is_active", true);
              if (effectiveCity) semanticFallbackBuilder = applyCityFilter(semanticFallbackBuilder);
              if (effectiveCategory) {
                semanticFallbackBuilder = semanticFallbackBuilder.or(`main_category.eq.${effectiveCategory},categories.cs.{"${effectiveCategory}"}`);
              }
              if (detectedSubcategory) {
                semanticFallbackBuilder = semanticFallbackBuilder.contains("categories", [detectedSubcategory]);
              }

              const { data: semanticFallbackData } = await semanticFallbackBuilder
                .order("priority_score", { ascending: false })
                .limit(500);

              if (semanticFallbackData && semanticFallbackData.length > 0) {
                const semanticFiltered = semanticFallbackData.filter((b: any) => {
                  const allTags = collectBusinessTags(b);
                  return allCandidateServiceNames.some(cs => tagsMatchCandidate(cs, allTags));
                });

                if (semanticFiltered.length > 0) {
                  businesses = semanticFiltered.map((b: any) => ({
                    ...b,
                    distance_km: latitude && longitude && b.latitude && b.longitude
                      ? calculateDistance(latitude, longitude, b.latitude, b.longitude)
                      : null,
                  }));
                  console.log(`Service semantic fallback [${allCandidateServiceNames.join(", ")}]: ${businesses.length} results`);
                }
              }
            }

            // If still 0 results and we have a category constraint, retry semantic fallback WITHOUT category
            // This handles cases where voice intent returns wrong category (e.g. "Services" instead of "Commerce")
            if (businesses.length === 0 && allCandidateServiceNames.length > 0 && effectiveCategory) {
              let noCatBuilder = supabase.from("businesses").select("*").eq("is_active", true);
              if (effectiveCity) noCatBuilder = applyCityFilter(noCatBuilder);
              const { data: noCatData } = await noCatBuilder
                .order("priority_score", { ascending: false })
                .limit(500);
              if (noCatData && noCatData.length > 0) {
                const noCatFiltered = noCatData.filter((b: any) => {
                  const allTags = collectBusinessTags(b);
                  return allCandidateServiceNames.some(cs => tagsMatchCandidate(cs, allTags));
                });
                if (noCatFiltered.length > 0) {
                  businesses = noCatFiltered.map((b: any) => ({
                    ...b,
                    distance_km: latitude && longitude && b.latitude && b.longitude
                      ? calculateDistance(latitude, longitude, b.latitude, b.longitude) : null,
                  }));
                  searchLevel = "exact";
                  console.log(`Service semantic fallback (no category) [${allCandidateServiceNames.join(", ")}]: ${businesses.length} results`);
                }
              }
            }
          }
          
          // When keyword matching identified specific subcategories, further filter businesses
          // to only those whose categories include the relevant subcategory.
          // This prevents e.g. "Sur-mesure" in Mode/Tourisme from matching when "artisan" keyword
          // only exists in Ferronnerie/Meubles subcategories.
          const uniqueKwSubcats = [...new Set(keywordMatchedSubcategories)];
          if (uniqueKwSubcats.length > 0 && businesses.length > 0) {
            const beforeKwFilter = businesses.length;
            const kwFiltered = businesses.filter((b: any) => {
              const bCategories = (b.categories || []).map((c: string) => c.toLowerCase());
              return uniqueKwSubcats.some(sc => bCategories.includes(sc.toLowerCase()));
            });
            if (kwFiltered.length > 0) {
              businesses = kwFiltered;
              console.log(`Keyword-subcategory post-filter [${uniqueKwSubcats.join(", ")}]: ${beforeKwFilter} → ${businesses.length}`);
            } else {
              console.log(`Keyword-subcategory post-filter [${uniqueKwSubcats.join(", ")}]: ${beforeKwFilter} → 0 (keeping original)`);
            }
          }
          
          // Neighborhood post-filter for Level 1 results
          if (detectedNeighborhood && businesses.length > 0) {
            const beforeNeighborhood = businesses.length;
            const neighborhoodFiltered = filterByNeighborhood(businesses, detectedNeighborhood, isNeighborhoodOnlyQuery, loadedNeighborhoods);
            // Always enforce neighborhood filter when explicitly detected — don't silently drop it
            businesses = neighborhoodFiltered;
            console.log(`Neighborhood post-filter "${detectedNeighborhood}" (Level 1): ${beforeNeighborhood} → ${businesses.length}`);
          }

          // ── Neighborhood enrichment: supplement tsquery results with exact DB matches ──
          if (detectedNeighborhood && effectiveCity) {
            const existingIds = new Set(businesses.map((b: any) => b.id));
            const nhVariants = getNeighborhoodVariants(detectedNeighborhood, loadedNeighborhoods).map(v => v.toLowerCase());
            
            // Fetch businesses by exact neighborhood + city
            let enrichBuilder = supabase
              .from("businesses")
              .select("*")
              .eq("is_active", true)
              .ilike("city", effectiveCity)
              .or(nhVariants.map(v => `neighborhood.ilike.%${v}%`).join(","));
            
            // Apply category/subcategory/service filters if detected
            if (effectiveCategory) {
              enrichBuilder = enrichBuilder.or(`main_category.eq.${effectiveCategory},categories.cs.{"${effectiveCategory}"}`);
            }
            if (detectedSubcategory) {
              enrichBuilder = enrichBuilder.contains("categories", [detectedSubcategory]);
            }
            
            enrichBuilder = enrichBuilder
              .order("wtuce_status", { ascending: true })
              .order("priority_score", { ascending: false })
              .limit(limit);
            
            const { data: enrichData, error: enrichError } = await enrichBuilder;
            if (!enrichError && enrichData) {
              let newBusinesses = enrichData.filter((b: any) => !existingIds.has(b.id));
              
              // Apply service post-filter on enriched results too
              if (allCandidateServiceNames.length > 0) {
                newBusinesses = newBusinesses.filter((b: any) => {
                  const allTags = collectBusinessTags(b);
                  return allCandidateServiceNames.some(cs => tagsMatchCandidate(cs, allTags));
                });
              }
              
              const enriched = newBusinesses.map((b: any) => ({
                ...b,
                distance_km: latitude && longitude && b.latitude && b.longitude
                  ? calculateDistance(latitude, longitude, b.latitude, b.longitude)
                  : null,
              }));
              
              if (enriched.length > 0) {
                console.log(`Neighborhood enrichment "${detectedNeighborhood}" + "${effectiveCity}": +${enriched.length} new businesses (was ${businesses.length})`);
                businesses = [...businesses, ...enriched];
              }
            }
          }

          searchLevel = "exact";
        } else if (allCandidateServiceNames.length > 0) {
          let semanticFallbackBuilder = supabase.from("businesses").select("*").eq("is_active", true);
          if (effectiveCity) semanticFallbackBuilder = applyCityFilter(semanticFallbackBuilder);
          if (effectiveCategory) {
            semanticFallbackBuilder = semanticFallbackBuilder.or(`main_category.eq.${effectiveCategory},categories.cs.{"${effectiveCategory}"}`);
          }
          if (detectedSubcategory) {
            semanticFallbackBuilder = semanticFallbackBuilder.contains("categories", [detectedSubcategory]);
          }

          const { data: semanticFallbackData, error: semanticFallbackError } = await semanticFallbackBuilder
            .order("priority_score", { ascending: false })
            .limit(500);

          if (!semanticFallbackError && semanticFallbackData && semanticFallbackData.length > 0) {
            const semanticFiltered = semanticFallbackData.filter((b: any) => {
              const allTags = collectBusinessTags(b);
              return allCandidateServiceNames.some(cs => tagsMatchCandidate(cs, allTags));
            });

            if (semanticFiltered.length > 0) {
              businesses = semanticFiltered.map((b: any) => ({
                ...b,
                distance_km: latitude && longitude && b.latitude && b.longitude
                  ? calculateDistance(latitude, longitude, b.latitude, b.longitude)
                  : null,
              }));
              searchLevel = "exact";
              console.log(`Service semantic fallback [${allCandidateServiceNames.join(", ")}]: ${businesses.length} results`);
            }
          }

          // If still 0 results with category constraint, retry without category
          if (businesses.length === 0 && allCandidateServiceNames.length > 0 && effectiveCategory) {
            let noCatBuilder = supabase.from("businesses").select("*").eq("is_active", true);
            if (effectiveCity) noCatBuilder = applyCityFilter(noCatBuilder);
            const { data: noCatData } = await noCatBuilder
              .order("priority_score", { ascending: false })
              .limit(500);
            if (noCatData && noCatData.length > 0) {
              const noCatFiltered = noCatData.filter((b: any) => {
                const allTags = collectBusinessTags(b);
                return allCandidateServiceNames.some(cs => tagsMatchCandidate(cs, allTags));
              });
              if (noCatFiltered.length > 0) {
                businesses = noCatFiltered.map((b: any) => ({
                  ...b,
                  distance_km: latitude && longitude && b.latitude && b.longitude
                    ? calculateDistance(latitude, longitude, b.latitude, b.longitude) : null,
                }));
                searchLevel = "exact";
                console.log(`Service semantic fallback (no category) [${allCandidateServiceNames.join(", ")}]: ${businesses.length} results`);
              }
            }
          }
        }
      } else {
        // No text query, just filter by city/category
        let queryBuilder = supabase.from("businesses").select("*").eq("is_active", true);

        if (effectiveCity) {
          queryBuilder = applyCityFilter(queryBuilder);
        }

        if (effectiveCategory) {
          queryBuilder = queryBuilder.or(`main_category.eq.${effectiveCategory},categories.cs.{"${effectiveCategory}"}`);
        }

        // If subcategory detected, filter by categories array
        if (detectedSubcategory) {
          queryBuilder = queryBuilder.contains("categories", [detectedSubcategory]);
        }

        queryBuilder = queryBuilder
          .order("wtuce_status", { ascending: true })
          .order("priority_score", { ascending: false })
          .limit(limit);

        const { data, error } = await queryBuilder;

        if (!error && data && data.length > 0) {
          businesses = data.map((b: any) => ({
            ...b,
            distance_km:
              latitude && longitude && b.latitude && b.longitude
                ? calculateDistance(latitude, longitude, b.latitude, b.longitude)
                : null,
          }));
          searchLevel = "exact";
        }
      }
    }

    // ── Broad mode merge: combine direct subcategory results with tsquery results ──
    if (broadExistingBusinesses.length > 0) {
      const existingIds = new Set(broadExistingBusinesses.map(b => b.id));
      const newFromTsquery = businesses.filter(b => !existingIds.has(b.id));
      // Direct subcategory results first (most relevant), then additional tsquery matches
      businesses = [...broadExistingBusinesses, ...newFromTsquery];
      console.log(`Broad mode merge: ${broadExistingBusinesses.length} direct + ${newFromTsquery.length} tsquery = ${businesses.length} total`);
      searchLevel = "exact";
    }

    // ── Intent category + city fallback ──
    // When FTS returned results but NONE match the detected city, and we have an intent category,
    // fall back to showing all businesses of that category in the detected city.
    // Example: "dormir face au coucher de soleil à essaouira" → FTS matches random businesses,
    // but none are in Essaouira → fetch all "Hôtellerie" businesses in Essaouira instead.
    if (businesses.length >= 0 && effectiveCity && intentCategory && !detectedSubcategory) {
      const cityLower = effectiveCity.toLowerCase();
      const hasAnyInCity = businesses.some((b: any) => {
        if ((b.city || "").toLowerCase() === cityLower) return true;
        if (effectiveCityId && b.zone_city_ids?.includes(effectiveCityId) && b.is_visible_locale) return true;
        return false;
      });
      // Trigger fallback when no in-city results OR when the query is just a main category name
      // (in which case FTS results are too narrow — we want the whole category in the city)
      if (!hasAnyInCity || queryIsMainCategory) {
        console.log(`Intent+city fallback: FTS returned ${businesses.length} results but NONE in "${effectiveCity}" — fetching by category "${intentCategory}"`);
        let catCityBuilder = supabase.from("businesses").select("*").eq("is_active", true);
        catCityBuilder = applyCityFilter(catCityBuilder);
        // Apply all intent categories if multiple
        if (effectiveCategories.length > 1) {
          const catOrClauses = effectiveCategories.map(c => `main_category.eq.${c},categories.cs.{"${c}"}`).join(",");
          catCityBuilder = catCityBuilder.or(catOrClauses);
        } else {
          catCityBuilder = catCityBuilder.or(`main_category.eq.${intentCategory},categories.cs.{"${intentCategory}"}`);
        }
        catCityBuilder = catCityBuilder
          .order("wtuce_status", { ascending: true })
          .order("google_rating", { ascending: false, nullsFirst: false })
          .order("priority_score", { ascending: false })
          .limit(limit);
        const { data: catCityData, error: catCityError } = await catCityBuilder;
        if (!catCityError && catCityData && catCityData.length > 0) {
          businesses = catCityData.map((b: any) => ({
            ...b,
            distance_km: latitude && longitude && b.latitude && b.longitude
              ? calculateDistance(latitude, longitude, b.latitude, b.longitude) : null,
          }));
          searchLevel = "exact";
          console.log(`Intent+city fallback: ${businesses.length} results for "${intentCategory}" in "${effectiveCity}"`);
        }
      }
    }

    // ── Main-category without city fallback ──
    // When the query is a bare main-category name (e.g. "restauration") and no city is set,
    // FTS is too narrow (it matches only businesses literally tagged with that word in services).
    // Fetch the entire category pool so the front-end overlay "Précision requise" can offer
    // all available cities for that category.
    if (queryIsMainCategory && !effectiveCity && intentCategory) {
      console.log(`Main-category no-city fallback: fetching all "${intentCategory}" businesses for overlay city suggestions`);
      let catBuilder = supabase.from("businesses").select("*").eq("is_active", true);
      if (effectiveCategories.length > 1) {
        const catOrClauses = effectiveCategories.map(c => `main_category.eq.${c},categories.cs.{"${c}"}`).join(",");
        catBuilder = catBuilder.or(catOrClauses);
      } else {
        catBuilder = catBuilder.or(`main_category.eq.${intentCategory},categories.cs.{"${intentCategory}"}`);
      }
      catBuilder = catBuilder
        .order("wtuce_status", { ascending: true })
        .order("priority_score", { ascending: false })
        .limit(1000);
      const { data: catData, error: catErr } = await catBuilder;
      if (!catErr && catData && catData.length > 0) {
        businesses = catData.map((b: any) => ({
          ...b,
          distance_km: latitude && longitude && b.latitude && b.longitude
            ? calculateDistance(latitude, longitude, b.latitude, b.longitude) : null,
        }));
        searchLevel = "exact";
        // Clear any false-positive service detection so downstream doesn't refilter
        detectedService = null;
        detectedServices = [];
        allCandidateServiceNames = [];
        console.log(`Main-category no-city fallback: ${businesses.length} results for "${intentCategory}"`);
      }
    }

    // Also handle when FTS returned 0 results with intent category + city
    if (businesses.length === 0 && effectiveCity && intentCategory) {
      console.log(`Intent+city fallback (0 results): fetching by category "${intentCategory}" in "${effectiveCity}"`);
      let catCityBuilder = supabase.from("businesses").select("*").eq("is_active", true);
      catCityBuilder = applyCityFilter(catCityBuilder);
      if (effectiveCategories.length > 1) {
        const catOrClauses = effectiveCategories.map(c => `main_category.eq.${c},categories.cs.{"${c}"}`).join(",");
        catCityBuilder = catCityBuilder.or(catOrClauses);
      } else {
        catCityBuilder = catCityBuilder.or(`main_category.eq.${intentCategory},categories.cs.{"${intentCategory}"}`);
      }
      catCityBuilder = catCityBuilder
        .order("wtuce_status", { ascending: true })
        .order("google_rating", { ascending: false, nullsFirst: false })
        .order("priority_score", { ascending: false })
        .limit(limit);
      const { data: catCityData, error: catCityError } = await catCityBuilder;
      if (!catCityError && catCityData && catCityData.length > 0) {
        businesses = catCityData.map((b: any) => ({
          ...b,
          distance_km: latitude && longitude && b.latitude && b.longitude
            ? calculateDistance(latitude, longitude, b.latitude, b.longitude) : null,
        }));
        searchLevel = "exact";
        console.log(`Intent+city fallback (0 results): ${businesses.length} results`);
      }
    }

    // Level 2: Fuzzy search with trigram similarity
    if (businesses.length === 0 && effectiveQuery) {
      let fuzzyBuilder = supabase
        .from("businesses")
        .select("*")
        .eq("is_active", true)
        .or(
          `name.ilike.%${effectiveQuery}%,description.ilike.%${effectiveQuery}%,categories.cs.{${effectiveQuery}},services.cs.{${effectiveQuery}}`
        );

      if (effectiveCity) {
        fuzzyBuilder = applyCityFilter(fuzzyBuilder);
      }

      const { data, error } = await fuzzyBuilder
        .order("wtuce_status", { ascending: true })
        .order("priority_score", { ascending: false })
        .limit(limit);

        if (!error && data && data.length > 0) {
          businesses = data.map((b) => ({
            ...b,
            distance_km:
              latitude && longitude && b.latitude && b.longitude
                ? calculateDistance(latitude, longitude, b.latitude, b.longitude)
                : null,
          }));
          
          // Apply service post-filter on fuzzy results too
          if (allCandidateServiceNames.length > 0) {
            const beforeSvc = businesses.length;
            businesses = businesses.filter((b: any) => {
              const allTags = collectBusinessTags(b);
              return allCandidateServiceNames.some(cs => tagsMatchCandidate(cs, allTags));
            });
            console.log(`Service post-filter (Level 2): ${beforeSvc} → ${businesses.length}`);
          }

          // Neighborhood post-filter for Level 2 results
          if (detectedNeighborhood && businesses.length > 0) {
            const beforeNeighborhood = businesses.length;
            const neighborhoodFiltered = filterByNeighborhood(businesses, detectedNeighborhood, isNeighborhoodOnlyQuery, loadedNeighborhoods);
            if (neighborhoodFiltered.length > 0) {
              businesses = neighborhoodFiltered;
            }
            console.log(`Neighborhood post-filter "${detectedNeighborhood}" (Level 2): ${beforeNeighborhood} → ${businesses.length}`);
          }

          searchLevel = "fuzzy";
        }
    }

    // Level 3: Expand to radius (30km) — skip if a service was detected (no point showing random nearby businesses)
    if (businesses.length === 0 && latitude && longitude && !originalDetectedService) {
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("is_active", true)
        .not("latitude", "is", null)
        .not("longitude", "is", null);

      if (!error && data) {
        const withinRadius = data
          .map((b) => ({
            ...b,
            distance_km: calculateDistance(latitude, longitude, b.latitude!, b.longitude!),
          }))
          .filter((b) => b.distance_km <= radiusKm)
          .sort((a, b) => {
            if (a.wtuce_status !== b.wtuce_status) {
              return a.wtuce_status === "verified" ? -1 : 1;
            }
            return (a.distance_km || 0) - (b.distance_km || 0);
          })
          .slice(0, limit);

        if (withinRadius.length > 0) {
          businesses = withinRadius;
          searchLevel = "radius";
        }
      }
    }

    // Level 4: Expand to region — skip if a service was detected
    if (businesses.length === 0 && region && !originalDetectedService) {
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("is_active", true)
        .ilike("region", region)
        .order("wtuce_status", { ascending: true })
        .order("priority_score", { ascending: false })
        .limit(limit);

      if (!error && data && data.length > 0) {
        businesses = data.map((b) => ({
          ...b,
          distance_km:
            latitude && longitude && b.latitude && b.longitude
              ? calculateDistance(latitude, longitude, b.latitude, b.longitude)
              : null,
        }));
        searchLevel = "region";
      }
    }

    // Level 5: Featured/Recommended businesses (national fallback)
    // Skip if a service was explicitly detected — 0 results means the service doesn't exist here, not that we should show random businesses
    if (businesses.length === 0 && !originalDetectedService) {
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("is_active", true)
        .or("wtuce_status.eq.verified,is_featured.eq.true")
        .order("is_featured", { ascending: false })
        .order("priority_score", { ascending: false })
        .limit(limit);

      if (!error && data) {
        businesses = data.map((b) => ({
          ...b,
          distance_km:
            latitude && longitude && b.latitude && b.longitude
              ? calculateDistance(latitude, longitude, b.latitude, b.longitude)
              : null,
        }));
        searchLevel = "recommended";
      }
    }

    // Service post-filter removed: now handled at SQL level via p_service parameter in search_businesses_with_rank

    // Exclude pure "Traiteurs" from Restauration results (keep if they also have Restaurant, Café, etc.)
    if (category === "Restauration" || (!category && businesses.length > 0)) {
      const isRestaurantContext = category === "Restauration" ||
        (effectiveQuery && /restaurant|manger|déjeuner|dîner|diner|cuisine|resto/i.test(effectiveQuery));
      if (isRestaurantContext) {
        businesses = businesses.filter(b => {
          const cats = (b.categories || []).map((c: string) => c.toLowerCase());
          if (cats.length === 1 && cats[0] === "traiteurs") return false;
          const nonTraiteur = cats.filter(c => c !== "traiteurs");
          return nonTraiteur.length > 0;
        });
      }
    }

    // Deprioritize visit-only businesses (Musées, Monuments) when intent is commercial (purchase/service)
    {
      const VISIT_SERVICES = ["musées", "musées thématiques", "monuments", "patrimoine, histoire & culture"];
      const VISIT_KEYWORDS = /\b(visiter|visite|voir|découvrir|decouvrir|explorer|admirer|musée|musee|monument|patrimoine|historique)\b/i;
      const isVisitIntent = effectiveQuery ? VISIT_KEYWORDS.test(effectiveQuery) : false;
      if (!isVisitIntent && originalDetectedService && businesses.length > 1) {
        const detectedLower = originalDetectedService.toLowerCase();
        const isVisitService = VISIT_SERVICES.includes(detectedLower);
        if (!isVisitService) {
          const commercial: typeof businesses = [];
          const visitOnly: typeof businesses = [];
          for (const b of businesses) {
            const svcLower = (b.services || []).map((s: string) => s.toLowerCase());
            const hasVisitService = svcLower.some(s => VISIT_SERVICES.includes(s));
            const mainCatCulture = (b.main_category || "").toLowerCase() === "culture";
            if (hasVisitService && mainCatCulture) {
              visitOnly.push(b);
            } else {
              commercial.push(b);
            }
          }
          if (commercial.length > 0) {
            businesses = [...commercial, ...visitOnly];
          }
        }
      }
    }

    // Superlative intent: apply global ranking policy
    // 1. Verified first; 2. priority_score DESC; 3. weighted rating /20 DESC (≥10 reviews) as tiebreaker
    if (isSuperlatif && businesses.length > 1) {
      console.log(`Superlative detected in "${effectiveQuery}" → applying ranking policy (verified > priority_score > rating)`);
      businesses = [...businesses].sort((a, b) => {
        const aVerified = a.wtuce_status === "verified";
        const bVerified = b.wtuce_status === "verified";
        if (aVerified !== bVerified) return aVerified ? -1 : 1;
        const psDiff = (b.priority_score || 0) - (a.priority_score || 0);
        if (psDiff !== 0) return psDiff;
        return getBestRating(b) - getBestRating(a);
      });
    }
    // Filter out name-matched businesses that are irrelevant when a subcategory/service is detected
    // e.g. "Gypsy Queens La Piscine" (a clothing store) should NOT be pinned for "piscine" search
    // BUT: never remove a business whose name is an exact match for the full query
    if (nameMatchedBusinessIds.length > 0 && (detectedSubcategory || detectedServices.length > 0)) {
      // Fetch the name-matched businesses to check their categories/services
      const { data: nameMatchData } = await supabase
        .from("businesses")
        .select("id, name, categories, services")
        .in("id", nameMatchedBusinessIds)
        .eq("is_active", true);
      if (nameMatchData) {
        const qNorm = stripAccentsGlobal((effectiveQuery ?? "").toLowerCase().trim());
        const relevantIds = nameMatchData.filter((b: any) => {
          // For keyword-pinned businesses: when specific services are detected,
          // require the business to have at least one of those services.
          // This prevents Decathlon (keyword "Vélo") from appearing for "balade en vélo"
          // when the detected service is "Excursions Vélo".
          if (keywordPinnedIds.has(b.id)) {
            if (detectedServices.length > 0) {
              const bSvcs = (b.services || []).map((s: string) => s.toLowerCase());
              const hasDetectedService = detectedServices.some(ds => 
                bSvcs.some((bs: string) => bs.includes(ds.toLowerCase()) || ds.toLowerCase().includes(bs))
              );
              if (!hasDetectedService) return false;
            }
            return true;
          }
          // Never remove exact name matches (the query IS the business name)
          const bNameNorm = stripAccentsGlobal((b.name || "").toLowerCase().trim());
          if (bNameNorm === qNorm) return true;
          // Keep businesses whose name contains the detected subcategory term
          // e.g. "Hotel Le Golf D'Essaouira" should stay for "golf" searches
          if (detectedSubcategory) {
            const subNorm = stripAccentsGlobal(detectedSubcategory.toLowerCase());
            if (bNameNorm.includes(subNorm)) return true;
          }
          const bCats = (b.categories || []).map((c: string) => c.toLowerCase());
          const bSvcs = (b.services || []).map((s: string) => s.toLowerCase());
          // Check if business has the detected subcategory in its categories
          if (detectedSubcategory && bCats.some((c: string) => c.includes(detectedSubcategory!.toLowerCase()) || detectedSubcategory!.toLowerCase().includes(c))) return true;
          // Check if business has any of the detected services
          if (detectedServices.length > 0 && detectedServices.some(ds => bSvcs.some((bs: string) => bs.includes(ds.toLowerCase()) || ds.toLowerCase().includes(bs)))) return true;
          return false;
        }).map((b: any) => b.id);
        const removedNames = nameMatchData.filter((b: any) => !relevantIds.includes(b.id));
        if (removedNames.length > 0) {
          console.log(`Removed ${removedNames.length} irrelevant name match(es) (no matching subcategory/service): [${removedNames.map((b: any) => b.id).join(", ")}]`);
        }
        nameMatchedBusinessIds = relevantIds;
      }
    }
    // Inject name-matched businesses that may have been filtered out by strict mode
    // Skip injection when a bundle is activated — bundles define precise intent, name matches would pollute results
    
    if (nameMatchedBusinessIds.length > 0 && !bundleActivated && !isSubcategoryPhraseOnlyMode) {
      const existingIds = new Set(businesses.map(b => b.id));
      const missingIds = nameMatchedBusinessIds.filter(id => !existingIds.has(id));
      if (missingIds.length > 0) {
        // Fetch the missing businesses directly
        const { data: missingBusinesses } = await supabase
          .from("businesses")
          .select("id, name, slug, description, categories, services, city, region, latitude, longitude, wtuce_status, priority_score, phone, email, website, address, logo_url, main_category, neighborhood, keywords, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, restaurant_guru_rating, restaurant_guru_review_count, trustpilot_rating, trustpilot_review_count, getyourguide_rating, getyourguide_review_count, viator_rating, viator_review_count, avis_verifies_rating, avis_verifies_review_count, tourradar_rating, tourradar_review_count, computed_rating, total_review_count, images, google_maps_url, badge_id, gamme_id, is_featured, default_service, hook_fr, hook_en, hook_ar, engagements, online_shop_url, opening_hours, show_opening_hours, is_open_24h, vacation_dates, zone_chalandise, is_visible_locale, zone_city_ids, business_type")
          .in("id", missingIds)
          .eq("is_active", true);
        if (missingBusinesses && missingBusinesses.length > 0) {
          const mapped = missingBusinesses.map((b: any) => ({
            ...b,
            categories: b.categories || [],
            services: b.services || [],
            distance_km: null,
          }));
          businesses = [...mapped, ...businesses];
          console.log(`Injected ${mapped.length} name-matched business(es) filtered out by strict mode: [${mapped.map((b: any) => b.name).join(", ")}]`);
        }
      }
      // Pin name matches to top
      const pinned: typeof businesses = [];
      const rest: typeof businesses = [];
      for (const b of businesses) {
        if (nameMatchedBusinessIds.includes(b.id)) {
          pinned.push(b);
        } else {
          rest.push(b);
        }
      }
      if (pinned.length > 0) {
        businesses = [...pinned, ...rest];
        console.log(`Name-match pin: moved ${pinned.length} business(es) to top: [${pinned.map(b => b.name).join(", ")}]`);
      }
    } else if (nameMatchedBusinessIds.length > 0 && bundleActivated) {
      console.log(`⏭️ Name-match injection/pinning skipped (bundle activated, ${nameMatchedBusinessIds.length} name matches ignored)`);
    } else if (nameMatchedBusinessIds.length > 0 && isSubcategoryPhraseOnlyMode) {
      console.log(`⏭️ Name-match injection/pinning skipped (subcategory-only phrase mode for "${detectedSubcategory}")`);
    }
    // LLM Re-ranking: DISABLED — SQL ordering (ts_rank + priority_score + wtuce_status) is sufficient
    // The rerank added 1.5s–12s latency for marginal relevance gains
    // Kept as dead code for future reference; can be re-enabled via skipRerank=false if needed
    console.log(`⏭️ Rerank disabled globally`);

    // Autocomplete mode: sort by best rating DESC, then apply name-match boost, then return lightweight results
    if (isAutocomplete) {
      businesses = [...businesses].sort((a, b) => getBestRating(b) - getBestRating(a));

      // Name-match boost for autocomplete: move businesses whose name strongly matches the query to the top
      if (effectiveQuery && businesses.length > 1) {
        const qLower = effectiveQuery.toLowerCase();
        const qWords = qLower.split(/\s+/).filter(w => w.length > 1 && !FRENCH_STOP_WORDS.has(w));
        if (qWords.length >= 2) {
          const boosted: typeof businesses = [];
          const rest: typeof businesses = [];
          for (const b of businesses) {
            const bName = b.name.toLowerCase();
            const bWords = bName.split(/\s+/).filter((w: string) => w.length > 1);
            const matchCount = qWords.filter(qw => bWords.some((bw: string) => bw.includes(qw) || qw.includes(bw))).length;
            if (matchCount >= Math.ceil(qWords.length * 0.7)) {
              boosted.push(b);
            } else {
              rest.push(b);
            }
          }
          if (boosted.length > 0 && boosted.length < businesses.length) {
            businesses = [...boosted, ...rest];
            console.log(`Autocomplete name-match boost: moved ${boosted.length} business(es) to top: [${boosted.map(b => b.name).join(", ")}]`);
          }
        }
      }

      const lightResults = businesses.slice(0, limit).map(b => ({
        id: b.id,
        name: b.name,
        slug: (b as any).slug || null,
        city: b.city,
        main_category: b.main_category,
        logo_url: b.logo_url,
      }));
      return new Response(JSON.stringify({ businesses: lightResults, searchLevel, totalResults: lightResults.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Service filter: exclude businesses missing required services based on query keywords ──
    if (businesses.length > 0 && effectiveQuery) {
      try {
        const { data: serviceFilters } = await supabase
          .from("search_service_filters")
          .select("keyword, keyword_en, keyword_ar, required_service")
          .eq("is_active", true);
        
        if (serviceFilters && serviceFilters.length > 0) {
          const queryLower = stripAccentsGlobal((effectiveQuery || "").toLowerCase());
          const spokenLower = stripAccentsGlobal((spoken || "").toLowerCase());
          const matchingFilters = serviceFilters.filter(f => {
            const kws = [f.keyword, (f as any).keyword_en, (f as any).keyword_ar]
              .filter(Boolean)
              .map((k: string) => stripAccentsGlobal(k.toLowerCase()));
            return kws.some(kw => queryLower.includes(kw) || spokenLower.includes(kw));
          });
          
          if (matchingFilters.length > 0) {
            const requiredServices = matchingFilters.map(f => f.required_service.toLowerCase());
            const before = businesses.length;
            const filtered = businesses.filter(b => {
              const bServices = (b.services || []).map((s: string) => s.toLowerCase());
              // Match if business service equals required OR starts/ends with the required word as a whole word
              return requiredServices.some(rs => bServices.some((bs: string) => {
                if (bs === rs) return true;
                // Check whole-word boundary match: "hammam privatif" matches "privatif", but "balcons privatifs" does not
                const regex = new RegExp(`\\b${rs.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
                return regex.test(bs);
              }));
            });
            // If filter reduces to 0, keep original results (filter was too restrictive for this context)
            if (filtered.length > 0) {
              businesses = filtered;
              console.log(`Service filter applied: keywords=[${matchingFilters.map(f => f.keyword).join(",")}] required=[${requiredServices.join(",")}] → ${before} → ${businesses.length} results`);
            } else {
              console.log(`Service filter skipped (would reduce ${before} → 0): keywords=[${matchingFilters.map(f => f.keyword).join(",")}] required=[${requiredServices.join(",")}]`);
            }
          }
        }
      } catch (e) {
        console.warn("Service filter query failed:", e);
      }
    }

    // ── Destination enrichment: merge businesses linked to searchable destinations (only when no city is explicitly resolved) ──
    if (effectiveQuery && !effectiveCity) {
      try {
        const queryLower = stripAccentsGlobal(effectiveQuery.toLowerCase());
        const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
        
        // Fetch searchable destinations
        const { data: destinations } = await supabase
          .from("destinations")
          .select("id, name_fr, name_en, name_ar, keywords")
          .eq("is_searchable", true);
        
        if (destinations && destinations.length > 0) {
          const matchedDestinations: string[] = [];
          const matchedDestinationNames: string[] = []; // original name_fr for city matching
          
          for (const dest of destinations) {
            const names = [dest.name_fr, dest.name_en, dest.name_ar].filter(Boolean).map((n: string) => stripAccentsGlobal(n.toLowerCase()));
            const kws = (dest.keywords || []).map((k: string) => stripAccentsGlobal(k.toLowerCase()));
            const allTerms = [...names, ...kws];
            
            // Check if any query word matches a destination name/keyword
            const matched = allTerms.some(term => {
              const termWords = term.split(/\s+/);
              // Single word term
              if (termWords.length === 1) return queryWords.some(qw => {
                if (qw === term) return true;
                // Substring match only if BOTH words are > 3 chars and the shorter is >= 80% of the longer
                if (qw.length <= 3 || term.length <= 3) return false;
                const shorter = qw.length <= term.length ? qw : term;
                const longer = qw.length <= term.length ? term : qw;
                return longer.includes(shorter) && shorter.length / longer.length >= 0.8;
              });
              // Multi-word term: all term words must match a query word (exact only for short words)
              return termWords.every((tw: string) => queryWords.some((qw: string) => {
                if (qw === tw) return true;
                if (qw.length <= 3 || tw.length <= 3) return false;
                const shorter = qw.length <= tw.length ? qw : tw;
                const longer = qw.length <= tw.length ? tw : qw;
                return longer.includes(shorter) && shorter.length / longer.length >= 0.8;
              }));
            });
            
            if (matched) {
              matchedDestinations.push(dest.id);
              if (dest.name_fr) matchedDestinationNames.push(dest.name_fr);
            }
          }
          
          if (matchedDestinations.length > 0) {
            const existingIds = new Set(businesses.map(b => b.id));

            // 1) Fetch businesses linked via business_destinations
            const { data: bdLinks } = await supabase
              .from("business_destinations")
              .select("business_id")
              .in("destination_id", matchedDestinations);
            
            const linkedIds = (bdLinks || []).map(l => l.business_id).filter(id => !existingIds.has(id));

            // 2) Fetch businesses whose city matches any matched destination name
            let cityBusinesses: any[] = [];
            if (matchedDestinationNames.length > 0) {
              for (const cityName of matchedDestinationNames) {
                const { data: cityBiz } = await supabase
                  .from("businesses")
                  .select("*")
                  .eq("is_active", true)
                  .ilike("city", cityName)
                  .order("priority_score", { ascending: false })
                  .limit(50);
                if (cityBiz) cityBusinesses.push(...cityBiz);
              }
            }

            // Merge all new IDs (linked + city-based), deduplicate
            const allNewIds = new Set(linkedIds);
            const cityBizById = new Map<string, any>();
            for (const b of cityBusinesses) {
              if (!existingIds.has(b.id)) {
                allNewIds.add(b.id);
                cityBizById.set(b.id, b);
              }
            }

            if (allNewIds.size > 0) {
              // Fetch linked businesses not already fetched via city query
              const idsToFetch = [...allNewIds].filter(id => !cityBizById.has(id));
              let fetchedLinked: any[] = [];
              if (idsToFetch.length > 0) {
                const { data } = await supabase
                  .from("businesses")
                  .select("*")
                  .eq("is_active", true)
                  .in("id", idsToFetch)
                  .order("priority_score", { ascending: false });
                fetchedLinked = data || [];
              }

              const allNew = [...fetchedLinked, ...cityBusinesses.filter(b => !existingIds.has(b.id))];
              // Deduplicate
              const seen = new Set<string>();
              const deduped: any[] = [];
              for (const b of allNew) {
                if (!seen.has(b.id) && !existingIds.has(b.id)) {
                  seen.add(b.id);
                  deduped.push(b);
                }
              }

              if (deduped.length > 0) {
                const mapped = deduped.map((b: any) => ({
                  ...b,
                  destination_enriched: true,
                  distance_km: latitude && longitude && b.latitude && b.longitude
                    ? calculateDistance(latitude, longitude, b.latitude, b.longitude) : null,
                }));
                if (searchLevel === "recommended") {
                  businesses = mapped;
                } else {
                  businesses = [...businesses, ...mapped];
                }
                if (searchLevel === "recommended" || searchLevel === "region") {
                  searchLevel = "destination";
                }
                console.log(`🗺️ Destination enrichment: +${mapped.length} businesses from ${matchedDestinations.length} destination(s) + city match (total: ${businesses.length})`);
              }
            }
          }
        }
      } catch (e) {
        console.warn("Destination enrichment failed:", e);
      }
    }
    } // end if (!serviceShortcutActivated && !labelShortcutActivated)

    // In multi-intent mode, keep only businesses that belong to one of the detected intent categories
    // (prevents broad fallback/service merges from leaking unrelated categories)
    if (intentCategories.length > 1 && businesses.length > 0 && !detectedSubcategoryFromKeyword) {
      const allowedCats = new Set(intentCategories.map(c => c.toLowerCase()));
      const beforeIntentFilter = businesses.length;
      businesses = businesses.filter((b: any) => {
        const main = (b.main_category || "").toLowerCase();
        const cats = (b.categories || []).map((c: string) => c.toLowerCase());
        return allowedCats.has(main) || cats.some((c: string) => allowedCats.has(c));
      });
      if (businesses.length !== beforeIntentFilter) {
        console.log(`Multi-intent category guard: ${beforeIntentFilter} → ${businesses.length} (allowed: [${intentCategories.join(", ")}])`);
      }
    }


    // ── Exact name match isolation: if query IS a business name, return only that business ──
    // This prevents "Baberrih Hotel" from returning all hotels just because "Hotel" is in search_vector
    // Excluded: city names and other generic terms that aren't business names
    let exactNameMatchIsolation = false;
    const normNameIso = (s: string) =>
      stripAccentsGlobal(String(s ?? "").toLowerCase())
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
    if (query && businesses.length >= 1) {
      const qNormIso = normNameIso(query);
      let exactBusiness = businesses.find(b => normNameIso(b.name) === qNormIso);
      // Repli : la requête EST un nom d'établissement mais la fiche n'est pas dans les
      // résultats (écrasée par la détection de sous-catégorie, ex. "Plage"). On la récupère.
      if (!exactBusiness && qNormIso.split(" ").length >= 2) {
        const { data: directName } = await supabase
          .from("businesses")
          .select("*")
          .eq("is_active", true)
          .ilike("name", `%${query.trim()}%`)
          .limit(5);
        const hit = (directName ?? []).find((b: any) => normNameIso(b.name) === qNormIso);
        if (hit) {
          exactBusiness = {
            ...hit,
            distance_km: latitude && longitude && hit.latitude && hit.longitude
              ? calculateDistance(latitude, longitude, hit.latitude, hit.longitude) : null,
          } as any;
          businesses = [exactBusiness as any, ...businesses.filter((b: any) => b.id !== (exactBusiness as any).id)];
          console.log(`🎯 Exact name recovered from DB: "${query}" → ${(exactBusiness as any).name}`);
        }
      }
      if (exactBusiness) {
        // Check the query is NOT just a city name
        const isCityName = !!detectedCity && stripAccentsGlobal(detectedCity.toLowerCase()) === qNormIso;
        const cityDetResult2 = await detectCityInQueryDynamic(query, supabase);
        const isJustACity = !!cityDetResult2 && stripAccentsGlobal(cityDetResult2.matchedTerm.toLowerCase().trim()) === qNormIso;
        
        // Skip name pinning when services were detected — the query is categorical, not a name lookup
        // e.g. "location moto essaouira" matches business name but also service keyword "location moto"
        const hasDetectedServicesForPinning = (detectedServices && detectedServices.length > 0) || serviceShortcutActivated;
        if (!isCityName && !isJustACity && !hasDetectedServicesForPinning) {
          const beforeIso = businesses.length;
          // Keep the exact match + any business whose keywords match a DISTINCTIVE query word
          // Exclude generic words that are also common subcategory/category names (hotel, restaurant, etc.)
          const genericTerms = new Set([
            'hotel', 'hotels', 'riad', 'riads', 'restaurant', 'restaurants', 'cafe', 'spa',
            'club', 'maison', 'villa', 'boutique', 'bar', 'palais', 'palace', 'kasbah',
            'auberge', 'lodge', 'resort', 'camping', 'gite', 'ferme', 'domaine',
            'agence', 'garage', 'pharmacie', 'clinique', 'ecole', 'institut',
            'salon', 'atelier', 'galerie', 'musee', 'theatre', 'cinema',
          ]);
          const queryWords = qNormIso.split(/\s+/).filter(w => w.length >= 3 && !genericTerms.has(w));
          // Keep businesses whose name contains the query (or vice-versa)
          const nameContainMatches = businesses.filter(b => {
            if (b.id === exactBusiness!.id) return false;
            const bNameNorm = normNameIso(b.name);
            return bNameNorm.includes(qNormIso) || qNormIso.includes(bNameNorm);
          });
          const nameContainIds = new Set(nameContainMatches.map(b => b.id));
          const keywordMatches = queryWords.length > 0 ? businesses.filter(b => {
            if (b.id === exactBusiness!.id || nameContainIds.has(b.id)) return false;
            const bKeywords = (b.keywords ?? []).map((k: string) => stripAccentsGlobal(k.toLowerCase().trim()));
            return bKeywords.some((kw: string) => queryWords.some(qw => kw.includes(qw) || qw.includes(kw)));
          }) : [];
          businesses = [exactBusiness as any, ...nameContainMatches, ...keywordMatches];
          exactNameMatchIsolation = true;
          console.log(`🎯 Exact name match isolation: "${query}" → keeping ${businesses.length} results (exact + ${keywordMatches.length} keyword matches, was ${beforeIso})`);
        }
      }
    }

    // ── Explicit proximity constraint: when caller provides lat/lng + radiusKm,
    // keep only businesses inside that radius before final ranking/pagination.
    if (latitude && longitude && radiusKm && businesses.length > 0) {
      const beforeRadius = businesses.length;
      businesses = businesses
        .map((b: any) => ({
          ...b,
          distance_km: b.distance_km ?? (b.latitude && b.longitude ? calculateDistance(latitude, longitude, b.latitude, b.longitude) : null),
        }))
        .filter((b: any) => b.distance_km !== null && b.distance_km <= radiusKm);
      console.log(`📍 Radius constraint: ${beforeRadius} → ${businesses.length} within ${radiusKm}km`);
    }

    // ── Final sort: align with global ranking policy before pagination ──
    // 1. Verified first, sorted by priority_score DESC
    // 2. Non-verified: priority_score DESC, then computed_rating DESC (ignore rating if < 10 reviews)
    if (!exactNameMatchIsolation) {
      businesses.sort((a, b) => {
        const aV = a.wtuce_status === "verified" ? 0 : 1;
        const bV = b.wtuce_status === "verified" ? 0 : 1;
        if (aV !== bV) return aV - bV;
        // Verified tier: priority_score DESC
        if (aV === 0) {
          return (b.priority_score || 0) - (a.priority_score || 0);
        }
        // Non-verified tier: priority_score DESC first
        const aPrio = a.priority_score || 0;
        const bPrio = b.priority_score || 0;
        if (aPrio !== bPrio) return bPrio - aPrio;
        // Then computed_rating DESC, but ignore if < 10 reviews
        const aCount = (a as any).total_review_count ?? 0;
        const bCount = (b as any).total_review_count ?? 0;
        const aRating = aCount >= 10 ? ((a as any).computed_rating ?? (a as any).rating ?? -1) : -1;
        const bRating = bCount >= 10 ? ((b as any).computed_rating ?? (b as any).rating ?? -1) : -1;
        return bRating - aRating;
      });
    }



    // totalCount is always the full processed result count
    const totalCount = businesses.length;

    // Apply server-side pagination: slice the full result set
    const paginatedBusinesses = businesses.slice(offset, offset + pageSize);
    console.log(`Pagination: totalCount=${totalCount}, offset=${offset}, pageSize=${pageSize}, returning=${paginatedBusinesses.length}`);

    // Determine disambiguation type
    // Skip disambiguation when few results (≤ 5) — the user already has a manageable list
    // Also skip when a business name exactly matches the query (name-pinning)
    const hasCity = !!effectiveCity;
    const hasSubcategory = !!detectedSubcategory;
    const hasCategory = !!intentCategory || !!detectedService || (Array.isArray(detectedServices) && detectedServices.length > 0);
    const queryNorm = stripAccentsGlobal((query || "").trim().toLowerCase());
    const hasExactNameMatch = businesses.some(b => stripAccentsGlobal(b.name.toLowerCase()) === queryNorm);
    let disambiguationType: "needs_category" | "needs_city" | null = null;
    if (!hasExactNameMatch && businesses.length > 5) {
      if (hasCity && !hasSubcategory && !hasCategory && businesses.length > 10) {
        disambiguationType = "needs_category";
      } else if ((hasSubcategory || hasCategory) && !hasCity) {
        disambiguationType = "needs_city";
      }
    }

    // ── Post-search city inference: if no city was detected but all results share the same city, infer it ──
    // Skip when the query is a bare main-category name — we want the "needs_city" overlay to trigger.
    if (!effectiveCity && !queryIsMainCategory && businesses.length > 0 && businesses.length <= 50) {
      const citiesInResults = new Set(businesses.map(b => b.city).filter(Boolean));
      if (citiesInResults.size === 1) {
        const inferredCity = [...citiesInResults][0]!;
        effectiveCity = inferredCity;
        console.log(`Post-search city inference: all ${businesses.length} results are in "${inferredCity}"`);
      }
    }

    const synonymWasUsed = matchedSynonymFilters.length > 0 || !!matchedSynonymBadgeId;
    // preciseMatch: true when the search was driven by a synonym or a detected service/keyword
    // This tells the frontend NOT to run the extra category fetch that would dilute precise results
    const preciseMatch = synonymWasUsed || serviceWasDetected || serviceShortcutActivated || labelShortcutActivated;
    // Optional payload slimming for clients that only need a subset of fields.
    // - "ids": ultra-light, only enough to identify and link a business (used by Home).
    // - "card": fields needed to render search result cards (no description, hooks, raw rating sources, etc.).
    // - undefined/null: full payload (legacy behavior, used by SearchPage detail panels).
    let projectedBusinesses: any[] = paginatedBusinesses as any[];
    if (compact === "ids") {
      projectedBusinesses = paginatedBusinesses.map((b: any) => ({
        id: b.id,
        name: b.name,
        slug: b.slug ?? null,
        city: b.city ?? null,
        main_category: b.main_category ?? null,
        logo_url: b.logo_url ?? null,
      }));
    } else if (compact === "card") {
      // Batch-fetch video + document text for the candidate businesses so the
      // front-side AND filter (buildBlob) can match on this enriched content too.
      const candidateIds = paginatedBusinesses.map((b: any) => b.id).filter(Boolean);
      const extraTextByBiz = new Map<string, string>();
      if (candidateIds.length > 0) {
        try {
          const [ytRes, docRes, gvLinkRes] = await Promise.all([
            supabase.from("business_youtube_videos").select("business_id, title").in("business_id", candidateIds),
            supabase.from("business_documents").select("business_id, name, description").in("business_id", candidateIds),
            supabase.from("generic_video_businesses").select("business_id, generic_video_id").in("business_id", candidateIds),
          ]);
          const append = (id: string, txt: string) => {
            if (!txt) return;
            const prev = extraTextByBiz.get(id) || "";
            extraTextByBiz.set(id, prev ? `${prev} ${txt}` : txt);
          };
          for (const r of (ytRes.data || [])) append(r.business_id, r.title || "");
          for (const r of (docRes.data || [])) append(r.business_id, `${r.name || ""} ${r.description || ""}`.trim());
          const gvIds = Array.from(new Set((gvLinkRes.data || []).map((r: any) => r.generic_video_id).filter(Boolean)));
          if (gvIds.length > 0) {
            const gvRes = await supabase.from("generic_videos").select("id, title, name, description").in("id", gvIds);
            const gvById = new Map<string, { title?: string; name?: string; description?: string }>();
            for (const v of (gvRes.data || [])) gvById.set(v.id, v);
            for (const link of (gvLinkRes.data || [])) {
              const v = gvById.get(link.generic_video_id);
              if (v) append(link.business_id, `${v.title || ""} ${v.name || ""} ${v.description || ""}`.trim());
            }
          }
        } catch (e) {
          console.warn("extra_text batch fetch failed:", e);
        }
      }
      projectedBusinesses = paginatedBusinesses.map((b: any) => ({
        id: b.id,
        name: b.name,
        slug: b.slug ?? null,
        city: b.city ?? null,
        neighborhood: b.neighborhood ?? null,
        main_category: b.main_category ?? null,
        categories: b.categories ?? null,
        services: b.services ?? null,
        keywords: b.keywords ?? null,
        logo_url: b.logo_url ?? null,
        images: b.images ?? null,
        latitude: b.latitude ?? null,
        longitude: b.longitude ?? null,
        rating: b.rating ?? null,
        computed_rating: b.computed_rating ?? null,
        total_review_count: b.total_review_count ?? null,
        wtuce_status: b.wtuce_status ?? null,
        opening_hours: b.opening_hours ?? null,
        show_opening_hours: b.show_opening_hours ?? null,
        is_open_24h: b.is_open_24h ?? null,
        default_service: b.default_service ?? null,
        engagements: b.engagements ?? null,
        priority_score: b.priority_score ?? null,
        distance_km: b.distance_km ?? null,
        // Fields used by SearchPage (BusinessMap, vacation/badge logic, hook display, gamme/badge resolution)
        address: b.address ?? null,
        phone: b.phone ?? null,
        whatsapp: b.whatsapp ?? null,
        hook_fr: b.hook_fr ?? null,
        hook_en: b.hook_en ?? null,
        hook_ar: b.hook_ar ?? null,
        gamme_id: b.gamme_id ?? null,
        badge_id: b.badge_id ?? null,
        vacation_dates: b.vacation_dates ?? null,
        destination_enriched: b.destination_enriched ?? false,
        google_rating: b.google_rating ?? null,
        google_review_count: b.google_review_count ?? null,
        tripadvisor_rating: b.tripadvisor_rating ?? null,
        tripadvisor_review_count: b.tripadvisor_review_count ?? null,
        extra_text: extraTextByBiz.get(b.id) || null,
      }));
    }

    const result: SearchResult = {
      businesses: projectedBusinesses as any,
      searchLevel,
      message: getSearchLevelMessage(searchLevel, language),
      totalResults: projectedBusinesses.length,
      totalCount,
      detectedSubcategory: detectedSubcategory || null,
      detectedCity: effectiveCity || null,
      detectedNeighborhood: detectedNeighborhood || null,
      detectedCategory: intentCategory || null,
      detectedService: detectedService || null,
      intentSubcategoryConflict,
      searchMode: serviceShortcutActivated ? "service_shortcut" : "broad",
      disambiguationType,
      synonymUsed: synonymWasUsed || undefined,
      preciseMatch: preciseMatch || undefined,
      exactNameMatchIsolation: exactNameMatchIsolation || undefined,
    };

    // Async log to search_logs table (fire-and-forget, don't block response)
    const _totalLatencyMs = Date.now() - _searchStartMs;
    if (!isAutocomplete && effectiveQuery && offset === 0) {
      // Observation seule : le résolveur ne modifie aucun résultat, il mesure la couverture.
      let _resolution: Record<string, unknown> = {};
      try {
        const _res = await resolveWithAdmin(supabase, effectiveQuery);
        _resolution = resolutionMetric(_res);
      } catch (e) {
        console.warn("[taxonomy-resolver] observation failed:", String(e));
      }
      supabase.from("search_logs").insert({
        ..._resolution,
        query: query || "",
        effective_query: effectiveQuery,
        detected_city: effectiveCity || null,
        detected_neighborhood: detectedNeighborhood || null,
        detected_subcategory: detectedSubcategory || null,
        search_mode: serviceShortcutActivated ? "service_shortcut" : (typeof subcategorySearchConfig !== 'undefined' ? subcategorySearchConfig?.search_mode : null) || null,
        search_level: searchLevel,
        total_results: totalCount,
        rerank_applied: !!lastRerankMeta,
        rerank_latency_ms: lastRerankMeta?.latencyMs || null,
        total_latency_ms: _totalLatencyMs,
        results_before: lastRerankMeta?.before || null,
        results_after: lastRerankMeta?.after || paginatedBusinesses.slice(0, 20).map(b => b.name),
        movements: lastRerankMeta?.movements || null,
        is_autocomplete: false,
        is_superlative: isSuperlatif,
      }).then(({ error }) => {
        if (error) console.warn("Failed to log search:", error.message);
      });
      lastRerankMeta = null;
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Search error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        businesses: [],
        searchLevel: "error",
        message: "Une erreur s'est produite",
        totalResults: 0,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Haversine formula to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

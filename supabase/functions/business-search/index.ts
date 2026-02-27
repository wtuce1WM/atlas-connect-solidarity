import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

// Get the best available rating for a business (composite)
function getBestRating(b: Business): number {
  return Math.max(
    b.google_rating ?? 0,
    b.tripadvisor_rating ?? 0,
    b.restaurant_guru_rating ?? 0,
  );
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
  main_category: string | null;
}

interface SearchResult {
  businesses: Business[];
  searchLevel: string;
  message: string;
  totalResults: number;
  detectedSubcategory?: string | null;
  searchMode?: string | null;
}

// Synonymes pour améliorer la recherche
const synonyms: Record<string, string[]> = {
  hotel: ["hôtel", "hébergement", "riad", "ryad"],
  riad: ["ryad", "riad", "hôtel", "hébergement"],
  restaurant: ["resto", "gastronomie", "cuisine", "brasserie", "table", "manger", "déjeuner", "dîner"],
  francais: ["française", "francaise", "français", "french"],
  italien: ["italienne", "italiana", "italien", "italian", "pizza", "pasta", "pâtes", "rital"],
  japonais: ["japonaise", "japanese", "sushi", "sashimi", "niakoué", "niak"],
  marocain: ["marocaine", "moroccan", "tajine", "couscous"],
  libanais: ["libanaise", "lebanese", "levantin"],
  asiatique: ["asian", "chinois", "chinoise", "thaï", "thaïlandais", "thaïlandaise"],
  spa: ["hammam", "bien-être", "massage", "détente", "relaxation", "soin"],
  transport: ["taxi", "navette", "transfert", "voiture"],
  tour: ["excursion", "visite", "circuit", "guide"],
  shop: ["boutique", "artisanat", "souvenir", "shopping"],
  animaux: ["animaux", "animal", "chien", "chat", "pet"],
  piscine: ["piscine", "pool", "baignade"],
  parking: ["parking", "garage", "stationnement"],
  wifi: ["wifi", "internet", "connexion"],
  climatisation: ["climatisation", "climatisé", "clim", "ac"],
  terrasse: ["terrasse", "toit"],
  rooftop: ["rooftop", "toit-terrasse"],
  halal: ["halal", "casher", "végétarien", "vegan"],
  tapis: ["tapis", "berbere", "berberes", "kilim", "zellige", "artisanat", "tissage"],
  bijoux: ["bijoux", "bijou", "argent", "or", "joaillerie", "bague", "collier", "bracelet", "boucle d'oreille", "pendentif"],
  epices: ["epices", "épice", "herbes", "aromates", "souk", "curcuma", "safran", "poivre", "cumin", "thym", "romarin", "laurier"],
  cuir: ["cuir", "maroquinerie", "babouche", "sac"],
  poterie: ["poterie", "ceramique", "faience", "zellige"],
  plage: ["plage", "mer", "ocean", "océan", "bord de mer", "front de mer", "vue mer", "bord eau", "littoral", "cote", "côte", "atlantique", "pieds dans l'eau", "pieds dans le sable", "coucher de soleil face à la mer", "coucher de soleil face à l'océan", "coucher de soleil sur la plage"],
  bar: ["bar", "café", "lounge", "boire", "cocktail", "whisky", "rhum", "pastis", "ricard", "apéritif", "prendre une cuite", "alcool fort", "digestif", "bourbon", "brandy", "martini", "champagne", "vin", "vin rosé", "vin blanc", "vin rouge"],
  cafe: ["café", "café", "coffee", "thé", "pâtisserie"],
  art: ["art", "galerie", "galerie d'art", "artistique", "exposition", "expo", "musee", "musée", "culture", "culturel"],
  petanque: ["pétanque", "petanque", "boules", "boulodrome"],
  glacier: ["glacier", "glace", "glaces", "sorbet", "gelato", "creme glacee", "crème glacée"],
  boite: ["boîte", "boite", "boîte de nuit", "discothèque", "discotheque", "nightclub", "clubbing", "soirée", "sortir", "fête", "fete"],
  nightclub: ["night club", "nightclub", "boîte de nuit", "boite de nuit", "discothèque", "discotheque", "clubbing", "danser", "dancing"],
  vin: ["vin", "vins", "alcool", "cave", "cave à vin", "bière", "biere", "spiritueux", "liqueur", "whisky", "champagne", "épicerie fine"],
  liveshow: ["live show", "liveshow", "spectacle", "dîner spectacle", "dinner show", "show", "animation", "soirée spectacle"],
  historique: ["historique", "lieu historique", "lieu historiques", "historiques", "patrimoine", "ancien", "histoire"],
};

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

/**
 * Detect if a query is a natural language sentence (vs. short keywords).
 * A query is "natural" if it has 4+ words AND contains at least 2 French stop words.
 */
function isNaturalLanguageQuery(query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  if (words.length < 4) return false;
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

async function detectCityInQueryDynamic(query: string, supabase: any): Promise<string | null> {
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
      if (lower.includes(nameLower) || lowerStripped.includes(stripAccentsGlobal(nameLower))) return city.name_fr;
    }
    // Check keywords (typos, aliases) with accent normalization
    if (city.keywords && Array.isArray(city.keywords)) {
      for (const kw of city.keywords) {
        const kwLower = kw.toLowerCase();
        if (lower.includes(kwLower) || lowerStripped.includes(stripAccentsGlobal(kwLower))) return city.name_fr;
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
  const { data } = await supabase.from("neighborhoods").select("name, keywords, cities!inner(name_fr)");
  if (data) {
    loadedNeighborhoods = data.map((n: any) => ({ name: n.name, keywords: n.keywords || [], city_name: n.cities?.name_fr || null }));
  }
  return loadedNeighborhoods;
}

// Get the city associated with a neighborhood
function getNeighborhoodCity(neighborhood: string, neighborhoods: NeighborhoodEntry[]): string | null {
  const lower = neighborhood.toLowerCase();
  const stripped = stripAccentsGlobal(lower);
  for (const n of neighborhoods) {
    if (n.name.toLowerCase() === lower || stripAccentsGlobal(n.name.toLowerCase()) === stripped) return n.city_name;
    for (const kw of n.keywords) {
      if (kw.toLowerCase() === lower || stripAccentsGlobal(kw.toLowerCase()) === stripped) return n.city_name;
    }
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
    if (b.is_visible_locale === true) return true;
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
  return [...variants.map(n => `neighborhood.ilike.${n}`), 'is_visible_locale.eq.true'].join(",");
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

    // Token matching: only count CONTENT tokens (exclude stop words like "de", "du", "à")
    const tagContentTokens = tokenizeForMatching(tag).filter(t => t.length > 1 && !FRENCH_STOP_WORDS.has(t));
    const matchCount = tagContentTokens.filter((token) => candidateContentTokensSet.has(token)).length;
    return matchCount >= minTokenMatches;
  });
}

function collectBusinessTags(business: any): string[] {
  return [
    ...((business.services || []) as string[]),
    ...((business.categories || []) as string[]),
    ...((business.keywords || []) as string[]),
  ].filter(Boolean);
}

// Adjectives that don't exist in business search vectors and should be dropped
const NOISE_ADJECTIVES = new Set([
  "traditionnel", "traditionnelle", "traditionnels", "traditionnelles",
  "authentique", "authentiques", "typique", "typiques",
  "vrai", "vraie", "vrais", "vraies", "véritable", "véritables",
  "local", "locale", "locaux", "locales",
  "ancien", "ancienne", "anciens", "anciennes",
  "moderne", "modernes", "contemporain", "contemporaine",
  "luxueux", "luxueuse", "chic", "élégant", "élégante",
  "petit", "petite", "petits", "petites",
  "grand", "grande", "grands", "grandes",
  "joli", "jolie", "jolis", "jolies",
  "beau", "belle", "beaux", "belles",
  "bon", "bonne", "bons", "bonnes",
  "meilleur", "meilleure", "meilleurs", "meilleures",
  "original", "originale", "originaux", "originales",
  "fameux", "fameuse", "célèbre", "célèbres",
  "populaire", "populaires",
]);

function expandQuery(query: string): string {
  // Split on whitespace AND hyphens so "Restaurant-galerie" → ["restaurant", "galerie"]
  const words = query.toLowerCase().split(/[\s\-]+/).filter(w => w.length > 0 && !NOISE_ADJECTIVES.has(w));

  const groups = words.map(word => {
    const alternatives: string[] = [word];

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

    // For alternatives containing "/", keep slash as-is for tsquery matching
    const sanitized = [...new Set(alternatives)].map(a => {
      if (a.includes("/")) return a.replace(/['']/g, "").replace(/[^a-zA-Z0-9àâäéèêëïîôùûüÿçœæÀÂÄÉÈÊËÏÎÔÙÛÜŸÇŒÆ/]/g, "");
      return sanitizeTerm(a);
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      query,
      city,
      region,
      category,
      latitude,
      longitude,
      radiusKm = 30,
      limit = 51,
      language = "fr",
      mode,
      spoken,
    }: SearchParams & { language?: string; mode?: string; spoken?: string } = await req.json();

    const isAutocomplete = mode === "autocomplete";

    let businesses: Business[] = [];
    let searchLevel = "exact";

    // ── Natural language detection: extract keywords via LLM if needed ──
    let effectiveQuery = query;
    if (query && isNaturalLanguageQuery(query)) {
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

    // Detect superlative intent (meilleur, top, best…) → sort by rating
    const isSuperlatif = effectiveQuery ? detectSuperlative(effectiveQuery) : false;

// Auto-détection de ville dans la query si aucune ville n'est passée explicitement
    const detectedCity = (!city && effectiveQuery) ? await detectCityInQueryDynamic(effectiveQuery, supabase) : null;
    const effectiveCity = city || detectedCity || undefined;

    // Resolve city name → UUID for zone_city_ids filtering
    let effectiveCityId: string | null = null;
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

    // Helper: build city OR clause including zone_city_ids coverage
    const applyCityFilter = (builder: any) => {
      if (!effectiveCity) return builder;
      if (effectiveCityId) {
        return builder.or(`city.ilike.${effectiveCity},zone_city_ids.cs.{"${effectiveCityId}"}`);
      }
      return builder.ilike("city", effectiveCity);
    };

    // Auto-détection de quartier dans la query
    const detectedNeighborhood = effectiveQuery ? await detectNeighborhoodInQuery(effectiveQuery, supabase) : null;
    if (detectedNeighborhood) {
      console.log(`Auto-detected neighborhood "${detectedNeighborhood}" from query "${effectiveQuery}"`);
    }

    // Related subcategories: after main results, also show businesses from these subcategories
    const RELATED_SUBCATEGORIES: Record<string, string[]> = {
      // Intentionally empty — only add truly equivalent subcategories here
    };
    // ── Load subcategory search configs from DB ──
    let searchConfigs: Record<string, { search_mode: string; max_results: number | null; boost_weight: number; synonyms: string[] }> = {};
    {
      const { data: configs } = await supabase
        .from("subcategory_search_config")
        .select("subcategory_id, search_mode, max_results, boost_weight, synonyms, subcategories!inner(name_fr)");
      if (configs) {
        for (const c of configs) {
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
    }

    // ── Check for exact business name match (for pinning, but don't skip subcategory detection) ──
    let nameMatchedBusinessIds: string[] = [];
    let nameSearchQueryForDetection = "";
    if (effectiveQuery && effectiveQuery.split(/\s+/).length <= 6) {
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
      }
    }

    // ── Subcategory detection always runs (no longer skipped by name matches) ──
    let detectedSubcategory: string | null = null;
    if (effectiveQuery) {
      const qLower = effectiveQuery.toLowerCase();
      const qWords = qLower.split(/\s+/);

      // Dynamic lookup: match query words against subcategory names AND keywords from DB
      const { data: subcats } = await supabase
        .from("subcategories")
        .select("name_fr, keywords");
      
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
        for (const sc of sorted) {
          const n = sc.name_fr?.toLowerCase();
          if (!n) continue;
          const nWords = n.split(/\s+/).filter((w: string) => w.length > 1);
          const nContentWords = nWords.filter((w: string) => !FRENCH_STOP_WORDS.has(w));
          const nContent = nContentWords.join(" ");
          const singleWordMatch = !n.includes(" ") && qWords.some(qw => 
            qw === n || stripPluralSimple(qw) === n || qw === stripPluralSimple(n) ||
            stripAccents(qw) === stripAccents(n) || normalizeWord(qw) === stripAccents(n) || stripAccents(qw) === normalizeWord(n)
          );
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
          if (n.includes(" ") ? (qLower.includes(n) || (nContent.length > 2 && qLower.includes(nContent)) || multiWordMatch || slashMatch) : singleWordMatch) {
            detectedSubcategory = sc.name_fr;
            console.log(`Auto-detected subcategory "${sc.name_fr}" from name match in query "${effectiveQuery}"`);
            break;
          }
        }

        // ── PASS 2: Keyword matches (only if no name match found) ──
        if (!detectedSubcategory) {
          for (const sc of sorted) {
            const n = sc.name_fr?.toLowerCase();
            if (!n) continue;
            const kws: string[] = (sc.keywords || []).map((k: string) => k.toLowerCase());
            if (kws.length === 0) continue;
            if (kws.length > 0 && (
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
              detectedSubcategory = sc.name_fr;
              console.log(`Auto-detected subcategory "${sc.name_fr}" from keyword match in query "${effectiveQuery}"`);
              break;
            }
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
      if (!subcategorySearchConfig) {
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
            subcategorySearchConfig = config;
            console.log(`Auto-detected subcategory "${detectedSubcategory}" from config synonym match in query "${effectiveQuery}"`);
          }
          break;
        }
      }
    }
    // Auto-detect category from intent words when no explicit category is provided
    // Load intent word → category mappings from DB
    let INTENT_TO_CATEGORY: Record<string, string> = {};
    let INTENT_MERGE_FLAGS: Record<string, boolean> = {};
    {
      const { data: intentWords } = await supabase
        .from("search_intent_words")
        .select("word, category_name, merge_on_conflict");
      if (intentWords) {
        for (const iw of intentWords) {
          INTENT_TO_CATEGORY[iw.word.toLowerCase()] = iw.category_name;
          INTENT_MERGE_FLAGS[iw.word.toLowerCase()] = iw.merge_on_conflict;
        }
        console.log(`Loaded ${intentWords.length} intent word mappings`);
      }
    }
    let intentCategory: string | null = null;
    let intentMergeOnConflict = true;
    // Always check intent words — even when a category is provided (e.g. from LLM voice intent)
    // Intent words from the DB should override the LLM-derived category
    {
      const queriesToCheck = [effectiveQuery, query, spoken].filter(Boolean) as string[];
      for (const q of queriesToCheck) {
        const qLower = q.toLowerCase();
        const qWords = qLower.split(/\s+/);
        // Check multi-word intent phrases first (e.g. "faire livrer")
        for (const intentPhrase of Object.keys(INTENT_TO_CATEGORY)) {
          if (intentPhrase.includes(" ") && qLower.includes(intentPhrase)) {
            intentCategory = INTENT_TO_CATEGORY[intentPhrase];
            intentMergeOnConflict = INTENT_MERGE_FLAGS[intentPhrase] ?? true;
            console.log(`Intent phrase "${intentPhrase}" → category "${intentCategory}" (merge=${intentMergeOnConflict})`);
            break;
          }
        }
        if (intentCategory) break;
        // Then check single words
        for (const w of qWords) {
          const wStripped = stripAccentsGlobal(w);
          const match = INTENT_TO_CATEGORY[w] || INTENT_TO_CATEGORY[wStripped];
          if (match) {
            intentCategory = match;
            intentMergeOnConflict = INTENT_MERGE_FLAGS[w] ?? INTENT_MERGE_FLAGS[wStripped] ?? true;
            console.log(`Intent word "${w}" → category "${intentCategory}" (merge=${intentMergeOnConflict})`);
            break;
          }
        }
        if (intentCategory) break;
      }
    }
    // Intent words override the URL/LLM category when detected
    const effectiveCategory = intentCategory || category || undefined;
    if (intentCategory && category && intentCategory !== category) {
      console.log(`Intent category "${intentCategory}" overrides URL category "${category}"`);
    }

    // ── Detect category-subcategory conflict ──
    // When the effective category (from intent OR explicit URL param) conflicts with detected subcategory's parent,
    // try to find a better subcategory under the target category, or merge results from both
    let intentSubcategoryConflict = false;
    let conflictSubcategoryParentCategory: string | null = null;
    const categoryForConflictCheck = intentCategory || category || null;
    if (categoryForConflictCheck && detectedSubcategory) {
      const { data: subcatWithCat } = await supabase
        .from("subcategories")
        .select("name_fr, categories!inner(name_fr)")
        .eq("name_fr", detectedSubcategory)
        .limit(1)
        .single();
      if (subcatWithCat) {
        const parentCatName = (subcatWithCat as any).categories?.name_fr;
        if (parentCatName && parentCatName !== categoryForConflictCheck) {
          // Before declaring a conflict, check if there's a better subcategory under the target category
          // e.g. "poisson" + category=Commerce → detected="Poisson" (Agriculture)
          // → prefer "Poissonnerie" (Commerce) which has "poisson" in its keywords
          const qLower = (effectiveQuery || "").toLowerCase();
          const qWords = qLower.split(/\s+/).filter((w: string) => w.length > 1);
          const { data: targetSubcats } = await supabase
            .from("subcategories")
            .select("name_fr, keywords, categories!inner(name_fr)")
            .eq("categories.name_fr", categoryForConflictCheck);
          let betterSubcat: string | null = null;
          if (targetSubcats) {
            for (const sc of targetSubcats) {
              const scName = (sc.name_fr || "").toLowerCase();
              const scKws: string[] = ((sc as any).keywords || []).map((k: string) => k.toLowerCase());
              // Check if any query word matches this subcategory's name or keywords
              const nameMatch = qWords.some(qw => scName.includes(qw) || qw.includes(scName));
              const kwMatch = qWords.some(qw => scKws.some(k => k === qw || k.includes(qw) || qw.includes(k)));
              if (nameMatch || kwMatch) {
                betterSubcat = sc.name_fr;
                break;
              }
            }
          }
          if (betterSubcat) {
            console.log(`Category-subcategory re-evaluation: switching from "${detectedSubcategory}" (${parentCatName}) to "${betterSubcat}" (${categoryForConflictCheck}) — better match for category`);
            detectedSubcategory = betterSubcat;
            // No conflict since we found a matching subcategory under the target category
          } else if (intentCategory && intentMergeOnConflict) {
            intentSubcategoryConflict = true;
            conflictSubcategoryParentCategory = parentCatName;
            console.log(`Intent-subcategory conflict: intent="${intentCategory}" vs subcategory "${detectedSubcategory}" parent="${parentCatName}" → will merge results`);
          } else if (category) {
            // Explicit category from URL — just switch subcategory to null to avoid wrong results
            console.log(`Explicit category "${category}" conflicts with detected subcategory "${detectedSubcategory}" (${parentCatName}) — dropping subcategory`);
            detectedSubcategory = null;
          }
        }
      }
    }

    // ── Pre-detect matching service(s) from query keywords ──
    let detectedService: string | null = null;
    let detectedServices: string[] = []; // ALL fully-matched services (distinct concepts → AND)
    let allCandidateServiceNames: string[] = []; // ALL candidate service names (synonyms → OR)
    let allMatchedServiceNames: string[] = []; // FULL list of matching services before narrowing (for fallback)
    let originalDetectedService: string | null = null; // Keep track even after fallback
    let serviceMatchWordsForInjection: string[] = [];
    let serviceMatchWordsOuter: string[] = []; // All query words used in service detection (for cleanRemainder)
    let keywordMatchedSubcategories: string[] = []; // Subcategories of services matched via keywords
    
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
      const serviceMatchWords = [...new Set(queryWords.filter(w => 
        !FRENCH_STOP_WORDS.has(w) && w !== cityLower && w !== neighborhoodLower 
        && !subcatNameWords.includes(w) && !INTENT_TO_CATEGORY[w] && !TIME_NOISE.has(w) && !PERSONAL_CONTEXT_NOISE.has(w)
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
        const nameSearchTerms = [...new Set(serviceMatchWords.flatMap(w => {
          const stripped = stripPluralForName(w);
          return stripped !== w ? [w, stripped] : [w];
        }))];
        // For short words (≤4 chars), use word-boundary pattern to avoid "art" matching "Artisanat"
        const nameConditions = nameSearchTerms.map(w => {
          if (w.length <= 4) return `name_fr.ilike.% ${w} %,name_fr.ilike.% ${w},name_fr.ilike.${w} %,name_fr.ilike.${w},name_fr.ilike.%'${w}%,name_fr.ilike.%'${w}%`;
          return `name_fr.ilike.%${w}%`;
        }).join(",");
        const { data: matchingByName } = await supabase
          .from("services")
          .select("name_fr, keywords, subcategories!inner(name_fr)")
          .or(nameConditions);

        // Also search in keywords array using cs (contains) for each word
        const { data: matchingByKeywords } = await supabase
          .from("services")
          .select("name_fr, keywords, subcategories!inner(name_fr)")
          .not("keywords", "eq", "{}");

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
              return k === w || w === k || kNorm === wNorm || normalizeWordKw(k) === normalizeWordKw(w) || wordBoundaryMatch(k, w) || (w.length > 3 && w.includes(k));
            });
          }) ||
          // Multi-word keyword match: if ALL content words of a multi-word keyword appear in the query
          kws.some((k: string) => {
            if (!k.includes(" ")) return false;
            const kwContentWords = k.split(/\s+/).filter((w: string) => w.length > 1 && !FRENCH_STOP_WORDS.has(w));
            return kwContentWords.length >= 2 && kwContentWords.every((kw: string) =>
              serviceMatchWords.some(qw => qw === kw || normalizeWordKw(qw) === normalizeWordKw(kw))
            );
          });
        });
        const allMatched = new Map<string, any>();
        // Normalize key: replace hyphens with spaces for merging variants like "Sur-mesure" / "Sur mesure"
        const normalizeServiceKey = (name: string) => name.toLowerCase().replace(/-/g, " ").replace(/\s+/g, " ").trim();
        for (const s of [...(matchingByName || []), ...keywordMatches]) {
          const normKey = normalizeServiceKey(s.name_fr);
          // Extract subcategory name from joined data
          const sSubcat = s.subcategories?.name_fr || null;
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
            // Filter out stop words from service name for matching (e.g. "Au feu de bois" → ["feu", "bois"])
            const svcContentWords = svc.name_fr.toLowerCase().split(/[\s]+/).filter((w: string) => w.length > 1 && !FRENCH_STOP_WORDS.has(w));
            // Also split hyphenated words for matching (e.g. "Sur-mesure" → ["sur-mesure", "sur", "mesure"])
            const svcContentWordsExpanded = svcContentWords.flatMap((w: string) => {
              if (w.includes("-")) {
                const parts = w.split("-").filter(p => p.length > 1 && !FRENCH_STOP_WORDS.has(p));
                return [w, ...parts];
              }
              return [w];
            });
            const svcWords = svc.name_fr.toLowerCase().split(/\s+/).filter((w: string) => w.length > 1);
            const allSvcWordsMatched = svcContentWords.length > 0 && svcContentWords.every((w: string) => {
              // For hyphenated words, match if ANY part matches a query word
              const candidates = w.includes("-") 
                ? [w, ...w.split("-").filter(p => p.length > 1 && !FRENCH_STOP_WORDS.has(p))]
                : [w];
              return candidates.some(cand =>
                serviceMatchWords.some(qw => {
                  if (usedQueryWords.has(qw)) return false;
                  return qw === cand || stripPlural(qw) === stripPlural(cand);
                })
              );
            });
            if (allSvcWordsMatched) {
              fullyMatchedServices.push(svc.name_fr);
              // Mark query words as used (only content words, not stop words)
              for (const sw of svcContentWords) {
                // For hyphenated words, also try matching individual parts
                const candidates = sw.includes("-")
                  ? [sw, ...sw.split("-").filter(p => p.length > 1 && !FRENCH_STOP_WORDS.has(p))]
                  : [sw];
                for (const cand of candidates) {
                  const matchedQw = serviceMatchWords.find(qw => !usedQueryWords.has(qw) && (qw === cand || stripPlural(qw) === stripPlural(cand)));
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
                  return k === qw || stripPlural(k) === stripPlural(qw) || wordBoundaryMatch(k, qw);
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
            const hasMultiWordMatch = svcKws.some((k: string) => {
              if (!k.includes(" ")) return false;
              const kwContentWords = k.split(/\s+/).filter((w: string) => w.length > 1 && !FRENCH_STOP_WORDS.has(w));
              return kwContentWords.length >= 2 && kwContentWords.every((kw: string) =>
                serviceMatchWords.some(qw => qw === kw || normalizeWordKw(qw) === normalizeWordKw(kw))
              );
            });
            // Alias match: a keyword of this service exactly matches the name of a fully-matched service
            // e.g. "Barber Shop" has keyword "Barbier" which is also a fully-matched service name
            const hasAliasMatch = svcKws.some((k: string) => fullyMatchedNamesLower.includes(normalizeWordKw(k)));
            if (kwScore >= 2 || hasMultiWordMatch || hasAliasMatch) {
              strongKeywordServices.push(svc.name_fr);
              console.log(`Strong keyword match: "${svc.name_fr}" (kwScore=${kwScore}, multiWord=${hasMultiWordMatch}, alias=${hasAliasMatch})`);
            }
          }

          if (fullyMatchedServices.length > 0) {
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
            
            // Narrow candidates to only the detected services
            allCandidateServiceNames = detectedServices;
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
                return text.includes(w);
              };
              const matchCount = serviceMatchWords.filter(w => wordMatchesService(w, svcLower)).length;
              const svcWordCount = svcWords.length;
              const kws = (svc.keywords || []).map((k: string) => k.toLowerCase());
              const kwMatchCount = serviceMatchWords.filter(w => {
                const wNorm = stripPlural(w);
                return kws.some((k: string) => {
                  const kNorm = stripPlural(k);
                  if (k === w || kNorm === wNorm) return true;
                  // For short words, require word boundary
                  if (w.length <= 4) return wordBoundaryMatch(k, w);
                  return k.includes(w) || w.includes(k);
                });
              }).length;
              
              // For multi-word service names, require ≥2 query words to match
              // Exception: if the service name originally contains a contraction (d', l'), 
              // the stripped word is a qualifier — 1 match on the main word is enough
              const originalName = svc.name_fr.toLowerCase();
              const hasContraction = /[dlsn]['']\w/i.test(originalName);
              const minMatchRequired = hasContraction ? 1 : 2;
              if (svcWordCount >= 2 && matchCount < minMatchRequired && kwMatchCount === 0) continue;
              
              const exactNameMatch = serviceMatchWords.some(w => stripPlural(w) === svcNorm || w === svcLower);
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
        }
      }
    }

    // ── Filter out services that don't belong to the detected subcategory ──
    // e.g. "offrir des fleurs" detects subcategory "Fleuriste" but service "Fleurs comestibles" belongs to "Fruits & Legumes"
    // For neighborhood-driven queries, keep cross-subcategory services (same local intent can span multiple subcategories)
    if (detectedSubcategory && detectedServices.length > 0 && !detectedNeighborhood) {
      // Look up which subcategory the detected subcategory actually is
      const { data: detectedSubcatRow } = await supabase
        .from("subcategories")
        .select("id, name_fr")
        .eq("name_fr", detectedSubcategory)
        .limit(1)
        .single();
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
            console.log(`Removed services not in subcategory "${detectedSubcategory}": [${removed.join(", ")}]`);
            detectedServices = filteredDetected;
            detectedService = filteredDetected.length > 0 ? filteredDetected[0] : null;
            allCandidateServiceNames = filteredDetected;
            originalDetectedService = detectedService;
          }
        }
      }
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
        let bestParent: { name: string; config: typeof subcategorySearchConfig } | null = null;
        for (const sp of svcParents) {
          const parentName = (sp as any).subcategories?.name_fr;
          const parentCategoryName = (sp as any).subcategories?.categories?.name_fr;
          if (parentName) {
            // Skip if the service's parent category conflicts with the intent category
            // e.g. don't apply Yoga/strict config when intent is Commerce
            if (intentCategory && parentCategoryName && parentCategoryName.toLowerCase() !== intentCategory.toLowerCase()) {
              console.log(`Skipping search config from service "${detectedService}" parent "${parentName}" (category "${parentCategoryName}" ≠ intent "${intentCategory}")`);
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
          console.log(`Resolved search config from service "${detectedService}" parent subcategory "${bestParent.name}": mode=${bestParent.config!.search_mode}`);
        }
      }
    }

    // When a service was detected, build a clean query for tsquery matching.
    // Remove noise words (like "achat") that don't exist in search vectors, keep service name + city etc.
    let queryForExpansion = effectiveQuery;

    // Strip detected neighborhood from queryForExpansion — neighborhood filtering is handled
    // by post-filter (filterByNeighborhood) which handles accent variants (médina/medina, guéliz/gueliz).
    // Keeping it in the tsquery causes accent mismatches (e.g. "médina" vs "medina" in search_vector).
    let isNeighborhoodOnlyQuery = false;
    if (detectedNeighborhood && queryForExpansion) {
      const nhWords = detectedNeighborhood.toLowerCase().split(/\s+/);
      const stripped = queryForExpansion.split(/\s+/).filter(w => {
        const wLower = w.toLowerCase();
        return !nhWords.some(nw => wLower === nw || wLower === nw.replace(/[éèêë]/g, "e").replace(/[àâä]/g, "a") || nw === wLower.replace(/[éèêë]/g, "e").replace(/[àâä]/g, "a"));
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
    if (intentCategory && queryForExpansion && INTENT_TO_CATEGORY) {
      const before = queryForExpansion;
      const intentWords = new Set(Object.keys(INTENT_TO_CATEGORY));
      queryForExpansion = queryForExpansion.split(/\s+/).filter(w => {
        const wLower = w.toLowerCase();
        const wStripped = stripAccentsGlobal(wLower);
        return !intentWords.has(wLower) && !intentWords.has(wStripped);
      }).join(" ").trim() || queryForExpansion;
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
      const stripped = queryForExpansion.split(/\s+/).filter(w => {
        const wLower = w.toLowerCase();
        const wStripped = stripAccentsGlobal(wLower);
        return !cityWords.some(cw => wLower === cw.toLowerCase() || wStripped === stripAccentsGlobal(cw.toLowerCase()));
      }).join(" ").trim();
      if (stripped && stripped !== queryForExpansion) {
        queryForExpansion = stripped;
        console.log(`Stripped city from tsquery: "${queryForExpansion}" (was: "${before}")`);
      } else if (!stripped && intentCategory) {
        // Query is only city + intent word (already stripped) → no meaningful tsquery terms
        // Let the category filter handle it alone
        queryForExpansion = null;
        console.log(`Query reduced to empty after stripping city+intent → will use category-only query`);
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
      
      // Filter out intent noise words, stop words AND noise adjectives from the remaining query
      // Also strip hyphenated compounds that contain a service keyword (e.g. "canapé-lit" when service is "Canapé")
      // serviceMatchWords contains ALL query words that participated in service detection
      // (including keyword-matched words like "méridienne" that matched via keyword of "Canapé")
      const allServiceRelatedWords = new Set([
        ...serviceMatchWordsForInjection,
        ...svcWords,
        ...serviceMatchWordsOuter,
      ]);
      const cleanRemainder = effectiveQuery.split(/\s+/).filter(w => {
        const wLower = w.toLowerCase();
        if (allServiceRelatedWords.has(wLower)) return false;
        if (FRENCH_STOP_WORDS.has(wLower)) return false;
        if (INTENT_NOISE.has(wLower)) return false;
        if (NOISE_ADJECTIVES.has(wLower)) return false;
        // Strip hyphenated words whose parts are already covered by the service
        if (wLower.includes("-")) {
          const parts = wLower.split("-").filter(p => p.length > 0);
          if (parts.some(p => allServiceRelatedWords.has(p))) return false;
        }
        return true;
      }).join(" ").trim();
      
      if (!hasServiceNameInQuery) {
        // Replace the keyword synonym with the actual service name for tsquery
        queryForExpansion = detectedService + (cleanRemainder ? " " + cleanRemainder : "");
        console.log(`Injected service name into query: "${queryForExpansion}" (was: "${effectiveQuery}")`);
      } else {
        // Service name already in query — rebuild with service name + clean remainder
        queryForExpansion = detectedService + (cleanRemainder ? " " + cleanRemainder : "");
        if (queryForExpansion !== effectiveQuery) {
          console.log(`Cleaned query for tsquery: "${queryForExpansion}" (was: "${effectiveQuery}")`);
        }
      }
    }

    // When a subcategory is detected, use direct SQL filtering (bypasses tsquery which matches descriptions)
    // Fusion rule: "Hôtel" and "Riad" are merged in search results
    const MERGED_SUBCATEGORIES: Record<string, string[]> = {
      "hôtel": ["Hôtel", "Riad"],
      "riad": ["Hôtel", "Riad"],
    };

    if (detectedSubcategory && businesses.length === 0) {
      // Helper to fetch businesses for a given subcategory (or merged group) with current filters
      const fetchSubcategoryBusinesses = async (subcat: string, filterByServices?: string[], options?: { skipNeighborhood?: boolean; overrideCity?: string }) => {
        // Determine which subcategories to query (merged if applicable)
        const mergedSubcats = MERGED_SUBCATEGORIES[subcat.toLowerCase()] || [subcat];
        
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
        // Skip category filter when there's an intent-subcategory conflict
        // (e.g. "manger du poisson" → intent=Restauration but subcategory=Poissonnerie/Commerce)
        if (effectiveCategory && !intentSubcategoryConflict) {
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
      const subcatNorm = stripAccentsGlobal(detectedSubcategory.toLowerCase());
      const serviceIsRedundantWithSubcategory = detectedServices.length > 0 && detectedServices.every(svc => {
        const svcNorm = stripAccentsGlobal(svc.toLowerCase());
        return subcatNorm.includes(svcNorm) || svcNorm.includes(subcatNorm);
      });
      if (serviceIsRedundantWithSubcategory) {
        console.log(`Service filter [${detectedServices.join(", ")}] is redundant with subcategory "${detectedSubcategory}" — skipping`);
      }
      let serviceFilter = (detectedServices.length > 0 && !serviceIsRedundantWithSubcategory) ? detectedServices : undefined;
      businesses = await fetchSubcategoryBusinesses(detectedSubcategory, serviceFilter);
      searchLevel = "exact";
      console.log(`Subcategory direct query "${detectedSubcategory}" + city "${effectiveCity}" + neighborhood "${detectedNeighborhood}" + services filter [${(serviceFilter || []).join(", ")}]: ${businesses.length} results`);

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
      const enrichmentServiceNames = (serviceFilter && serviceFilter.length > 0)
        ? serviceFilter
        : (detectedServices.length > 0 ? detectedServices : [detectedSubcategory]);

      if (enrichmentServiceNames.length > 0) {
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

        if (effectiveCategory && !intentSubcategoryConflict) {
          svcBuilder = svcBuilder.or(`main_category.eq.${effectiveCategory},categories.cs.{"${effectiveCategory}"}`);
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
      if (effectiveQuery && businesses.length > 1 && subcategorySearchConfig?.search_mode !== "strict") {
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
    const isStrictMode = subcategorySearchConfig?.search_mode === 'strict' && !!detectedSubcategory;
    // In broad mode (default), ALSO run tsquery even if subcategory direct query found results,
    // and merge the results. This is the key difference: broad = subcategory + full-text merged.
    const isBroadWithResults = !isStrictMode && detectedSubcategory && businesses.length > 0;
    const broadExistingBusinesses = isBroadWithResults ? [...businesses] : [];
    if (isStrictMode && detectedSubcategory) {
      console.log(`Strict mode for "${detectedSubcategory}": skipping tsquery fallback (${businesses.length} results from direct query)`);
    }
    // In broad mode with existing results, temporarily clear businesses so tsquery runs
    if (isBroadWithResults) {
      console.log(`Broad mode for "${detectedSubcategory}": running tsquery to merge with ${businesses.length} direct results`);
      businesses = [];
    }

    // Level 1: Exact full-text search with ts_rank (services/name weight A > description weight B)
    if ((queryForExpansion || city || effectiveCategory) && businesses.length === 0 && !isStrictMode) {
      // When a service was detected and injected, don't expand service name words with synonyms
      // to avoid polluting the tsquery with unrelated terms (e.g. "vin" expanding to "bar")
      // BUT include ALL candidate service names as OR alternatives so synonyms match (e.g. Glacier | Glaces)
      let expandedQuery: string | null = null;
      if (queryForExpansion && detectedService) {
        const svcWords = detectedService.toLowerCase().split(/\s+/).filter(w => w.length > 0);
        const remainderWords = queryForExpansion.toLowerCase().split(/\s+/).filter(w => !svcWords.includes(w) && w.length > 0);
        
        // Build OR group from ALL candidate service names (not just the primary one)
        // Filter out French stop words (en, de, à, la, le, etc.) to avoid matching everything
        const allSvcTerms = allCandidateServiceNames.flatMap(name => 
          name.toLowerCase().split(/[\s/\-]+/).map(w => sanitizeTerm(w)).filter(t => t.length > 1 && !FRENCH_STOP_WORDS.has(t))
        );
        const uniqueSvcTerms = [...new Set(allSvcTerms)];
        const svcPart = uniqueSvcTerms.length > 1
          ? `(${uniqueSvcTerms.join(" | ")})`
          : uniqueSvcTerms[0] || "";
        
        // Remainder words: expand with synonyms
        const remainderExpanded = remainderWords.length > 0 ? expandQuery(remainderWords.join(" ")) : "";
        const parts = [svcPart, remainderExpanded].filter(p => p.length > 0);
        expandedQuery = parts.join(" & ") || null;
      } else if (queryForExpansion) {
        expandedQuery = expandQuery(queryForExpansion);
      }
      if (expandedQuery) console.log(`tsquery: "${expandedQuery}" (service: ${detectedService || "none"}, candidates: [${allCandidateServiceNames.join(", ")}], from: "${queryForExpansion}")`);

      if (!expandedQuery && effectiveCategory && !detectedSubcategory) {
        // No tsquery terms left (e.g. "dormir à essaouira" → intent=Hôtellerie, city=Essaouira)
        // Do a direct category + city query instead
        let catBuilder = supabase.from("businesses").select("*").eq("is_active", true)
          .or(`main_category.eq.${effectiveCategory},categories.cs.{"${effectiveCategory}"}`);
        if (effectiveCity) catBuilder = applyCityFilter(catBuilder);
        catBuilder = catBuilder.order("priority_score", { ascending: false, nullsFirst: false }).limit(limit);
        const { data: catData, error: catError } = await catBuilder;
        if (!catError && catData && catData.length > 0) {
          businesses = catData.map((b: any) => ({
            ...b,
            distance_km: latitude && longitude && b.latitude && b.longitude
              ? calculateDistance(latitude, longitude, b.latitude, b.longitude) : null,
          }));
          searchLevel = "exact";
          console.log(`Category+city direct query "${effectiveCategory}" + "${effectiveCity}": ${businesses.length} results`);
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
          p_city_id: effectiveCityId || null,
        });
        const { data, error } = result;

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
              return bCategories.some(c => c.includes(detectedSubcategory!.toLowerCase()) || detectedSubcategory!.toLowerCase().includes(c));
            });
            if (filtered.length > 0) {
              businesses = filtered;
            }
            console.log(`Subcategory post-filter "${detectedSubcategory}": ${beforeCount} → ${businesses.length}`);
          }

          // THEN: Post-filter by services:
          // - If multiple DISTINCT service concepts detected (e.g. "Viande" + "Au feu de bois") → AND
          // - If single concept with synonym candidates (e.g. Glacier, Glaces, Glaces / Sorbets) → OR
          // Determine if multiple detected services are truly distinct concepts or variants of the same keyword
          // e.g. "Vin", "Cave à vin", "Cave à vin d'exception" are all from keyword "vin" → use OR
          // e.g. "Viande" + "Au feu de bois" are distinct concepts → use AND
          const areDistinctConcepts = detectedServices.length > 1 && (() => {
            // Services are variants (not distinct) if they ALL share at least one common significant word
            // e.g. "Vin", "Cave à vin", "Cave à vin d'exception" all share "vin" → variants
            const stopWords = new Set(['à', 'de', 'des', 'du', 'la', 'le', 'les', 'un', 'une', 'aux', 'en', 'd']);
            const serviceWordSets = detectedServices.map(ds => 
              new Set(ds.toLowerCase().split(/[\s''`]+/).filter(w => w.length > 1 && !stopWords.has(w)))
            );
            // Find if any word from the first service appears in ALL other services
            const firstSet = serviceWordSets[0];
            for (const word of firstSet) {
              if (serviceWordSets.every(s => {
                for (const sw of s) {
                  if (sw.includes(word) || word.includes(sw)) return true;
                }
                return false;
              })) {
                console.log(`Services share common word "${word}" → treating as variants (OR)`);
                return false;
              }
            }
            return true;
          })();

          if (detectedServices.length > 1 && areDistinctConcepts) {
            // AND logic: business must have ALL distinct detected services
            const beforeCount = businesses.length;
            businesses = businesses.filter((b: any) => {
              const bServices = (b.services || []).map((s: string) => s.toLowerCase());
              const allTags = collectBusinessTags(b);
              return detectedServices.every(ds => tagsMatchCandidate(ds, allTags));
            });
            console.log(`Multi-service AND post-filter [${detectedServices.join(", ")}]: ${beforeCount} → ${businesses.length}`);
            
            // When multi-service AND filter gives 0, fallback to OR among detected services
            if (businesses.length === 0 && beforeCount > 0) {
              const orFallback = data.map((b: any) => ({
                ...b,
                distance_km: latitude && longitude && b.latitude && b.longitude
                  ? calculateDistance(latitude, longitude, b.latitude, b.longitude) : null,
              })).filter((b: any) => {
                const bServices = (b.services || []).map((s: string) => s.toLowerCase());
                return detectedServices.some(ds => 
                  bServices.some(bs => bs.includes(ds.toLowerCase()) || ds.toLowerCase().includes(bs))
                );
              });
              if (orFallback.length > 0) {
                businesses = orFallback;
                console.log(`Multi-service AND→OR fallback: ${orFallback.length} results`);
              } else {
                console.log(`Multi-service AND filter returned 0 results — no OR fallback either`);
              }
            }
          } else if (allCandidateServiceNames.length > 0 || (detectedServices.length > 1 && !areDistinctConcepts)) {
            // OR logic: business must have at least ONE of the candidate services
            // Also used when multiple detected services are variants of the same concept (e.g. Vin, Cave à vin)
            // BUT always keep businesses whose name closely matches the ORIGINAL query
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
              return allCandidateServiceNames.some(cs => tagsMatchCandidate(cs, allBusinessTags));
            });
            console.log(`Service OR post-filter [${allCandidateServiceNames.join(", ")}]: ${beforeCount} → ${businesses.length}`);
            
            // When service filter gives 0 results, fallback to unfiltered tsquery results
            // This handles cases like "oursins à Essaouira" where the specific service doesn't exist
            // in that city but related establishments (seafood restaurants) should still appear
            if (businesses.length === 0) {
              console.log(`Service OR filter returned 0 results — falling back to tsquery without service filter`);
              // Re-run the tsquery search without service filtering
              const tsQueryFallback = expandQuery(queryForExpansion);
              if (tsQueryFallback) {
                let fallbackBuilder = supabase.from("businesses").select("*").eq("is_active", true)
                  .textSearch("search_vector", tsQueryFallback, { type: "plain", config: "simple" });
                if (effectiveCity) fallbackBuilder = applyCityFilter(fallbackBuilder);
                if (effectiveCategory) fallbackBuilder = fallbackBuilder.or(`main_category.eq.${effectiveCategory},categories.cs.{"${effectiveCategory}"}`);
                fallbackBuilder = fallbackBuilder
                  .order("priority_score", { ascending: false })
                  .limit(limit);
                const { data: fallbackData } = await fallbackBuilder;
                if (fallbackData && fallbackData.length > 0) {
                  businesses = fallbackData.map((b: any) => ({
                    ...b,
                    distance_km: latitude && longitude && b.latitude && b.longitude
                      ? calculateDistance(latitude, longitude, b.latitude, b.longitude) : null,
                  }));
                  console.log(`Service fallback tsquery "${tsQueryFallback}": ${businesses.length} results`);
                }
              }
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
            if (neighborhoodFiltered.length > 0) {
              businesses = neighborhoodFiltered;
            }
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

    // Superlative intent: sort by best rating DESC (google > tripadvisor > restaurant_guru)
    if (isSuperlatif && businesses.length > 1) {
      console.log(`Superlative detected in "${effectiveQuery}" → sorting by rating`);
      businesses = [...businesses].sort((a, b) => getBestRating(b) - getBestRating(a));
    }
    // Filter out name-matched businesses that are irrelevant when a subcategory/service is detected
    // e.g. "Gypsy Queens La Piscine" (a clothing store) should NOT be pinned for "piscine" search
    if (nameMatchedBusinessIds.length > 0 && (detectedSubcategory || detectedServices.length > 0)) {
      // Fetch the name-matched businesses to check their categories/services
      const { data: nameMatchData } = await supabase
        .from("businesses")
        .select("id, categories, services")
        .in("id", nameMatchedBusinessIds)
        .eq("is_active", true);
      if (nameMatchData) {
        const relevantIds = nameMatchData.filter((b: any) => {
          const bCats = (b.categories || []).map((c: string) => c.toLowerCase());
          const bSvcs = (b.services || []).map((s: string) => s.toLowerCase());
          // Check if business has the detected subcategory in its categories
          if (detectedSubcategory && bCats.some(c => c.includes(detectedSubcategory!.toLowerCase()) || detectedSubcategory!.toLowerCase().includes(c))) return true;
          // Check if business has any of the detected services
          if (detectedServices.length > 0 && detectedServices.some(ds => bSvcs.some(bs => bs.includes(ds.toLowerCase()) || ds.toLowerCase().includes(bs)))) return true;
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
    if (nameMatchedBusinessIds.length > 0) {
      const existingIds = new Set(businesses.map(b => b.id));
      const missingIds = nameMatchedBusinessIds.filter(id => !existingIds.has(id));
      if (missingIds.length > 0) {
        // Fetch the missing businesses directly
        const { data: missingBusinesses } = await supabase
          .from("businesses")
          .select("id, name, description, categories, services, city, region, latitude, longitude, wtuce_status, priority_score, phone, email, website, address, logo_url, main_category, neighborhood, keywords, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, restaurant_guru_rating, restaurant_guru_review_count, images, google_maps_url, badge_id, gamme_id, is_featured")
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
    }
    // LLM Re-ranking: apply on exact/fuzzy results with a real query (skip autocomplete & superlative)
    // When name matches exist, rerank only the non-pinned portion to preserve exact match priority
    const rerankConditions = { isAutocomplete, isSuperlatif, effectiveQuery, count: businesses.length, searchLevel, nameMatches: nameMatchedBusinessIds.length };
    console.log(`Rerank check: ${JSON.stringify(rerankConditions)}`);
    if (!isAutocomplete && !isSuperlatif && effectiveQuery && businesses.length > 3 && (searchLevel === "exact" || searchLevel === "fuzzy")) {
      console.log(`✅ Rerank conditions met — triggering LLM rerank for "${effectiveQuery}"`);
      if (nameMatchedBusinessIds.length > 0) {
        // Rerank only the non-pinned businesses
        const pinnedCount = nameMatchedBusinessIds.filter(id => businesses.some(b => b.id === id)).length;
        const pinnedPart = businesses.slice(0, pinnedCount);
        const restPart = businesses.slice(pinnedCount);
        if (restPart.length > 3) {
          const rerankedRest = await llmRerank(effectiveQuery, restPart);
          businesses = [...pinnedPart, ...rerankedRest];
        }
      } else {
        businesses = await llmRerank(effectiveQuery, businesses);
      }
    } else {
      console.log(`⏭️ Rerank skipped`);
    }

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
          .select("keyword, required_service")
          .eq("is_active", true);
        
        if (serviceFilters && serviceFilters.length > 0) {
          const queryLower = stripAccentsGlobal((effectiveQuery || "").toLowerCase());
          const spokenLower = stripAccentsGlobal((spoken || "").toLowerCase());
          const matchingFilters = serviceFilters.filter(f => {
            const kw = stripAccentsGlobal(f.keyword.toLowerCase());
            return queryLower.includes(kw) || spokenLower.includes(kw);
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

    const result: SearchResult = {
      businesses,
      searchLevel,
      message: getSearchLevelMessage(searchLevel, language),
      totalResults: businesses.length,
      detectedSubcategory: detectedSubcategory || null,
      searchMode: subcategorySearchConfig?.search_mode || null,
    };

    // Async log to search_logs table (fire-and-forget, don't block response)
    if (!isAutocomplete && effectiveQuery) {
      supabase.from("search_logs").insert({
        query: query || "",
        effective_query: effectiveQuery,
        detected_city: effectiveCity || null,
        detected_neighborhood: detectedNeighborhood || null,
        detected_subcategory: detectedSubcategory || null,
        search_mode: subcategorySearchConfig?.search_mode || null,
        search_level: searchLevel,
        total_results: businesses.length,
        rerank_applied: !!lastRerankMeta,
        rerank_latency_ms: lastRerankMeta?.latencyMs || null,
        results_before: lastRerankMeta?.before || null,
        results_after: lastRerankMeta?.after || businesses.slice(0, 20).map(b => b.name),
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Detect superlative keywords that indicate the user wants results sorted by rating
function detectSuperlative(query: string): boolean {
  const superlatives = [
    "meilleur", "meilleurs", "meilleure", "meilleures",
    "top", "best", "le plus noté", "les plus notés",
    "le mieux noté", "les mieux notés",
    "le plus recommandé", "les plus recommandés",
    "le plus populaire", "les plus populaires",
  ];
  const lower = query.toLowerCase();
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

// LLM re-ranking: reorder candidates by semantic relevance to the query
async function llmRerank(query: string, candidates: Business[]): Promise<Business[]> {
  if (candidates.length <= 1) return candidates;

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return candidates;

  const candidateList = candidates.map((b, i) => ({
    rank: i,
    name: b.name,
    main_category: b.main_category ?? "",
    services: (b.services ?? []).slice(0, 6).join(", "),
  }));

  const prompt = `Tu es un moteur de classement pour un annuaire d'entreprises au Maroc.
Requête : "${query}"
Classe ces établissements du plus pertinent au moins pertinent. Critères : spécialisation principale > services correspondants > mention secondaire.
${candidateList.map(c => `[${c.rank}] ${c.name} | ${c.main_category} | ${c.services}`).join("\n")}
Réponds UNIQUEMENT avec les indices entre crochets dans l'ordre, ex: [2],[0],[4],[1],[3]`;

  try {
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

    if (!response.ok) return candidates;

    const data = await response.json();
    const content: string = data.choices?.[0]?.message?.content ?? "";
    const matches = [...content.matchAll(/\[(\d+)\]/g)];
    const orderedIndices = matches.map(m => parseInt(m[1])).filter(i => i >= 0 && i < candidates.length);
    if (orderedIndices.length === 0) return candidates;

    const reranked = orderedIndices.map(i => candidates[i]);
    const missing = candidates.filter((_, i) => !orderedIndices.includes(i));
    console.log(`LLM rerank "${query}": [${orderedIndices.join(",")}]`);
    return [...reranked, ...missing];
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
  const { data: cities } = await supabase
    .from("cities")
    .select("name_fr, name_en, name_ar, keywords")
    .eq("is_active", true);
  
  if (!cities) return null;
  
  // Sort by name length DESC so longer names match first (e.g. "El Jadida" before "Fès")
  const sorted = [...cities].sort((a: any, b: any) => (b.name_fr?.length || 0) - (a.name_fr?.length || 0));
  
  for (const city of sorted) {
    // Check main names
    for (const name of [city.name_fr, city.name_en, city.name_ar].filter(Boolean)) {
      if (lower.includes(name.toLowerCase())) return city.name_fr;
    }
    // Check keywords (typos, aliases)
    if (city.keywords && Array.isArray(city.keywords)) {
      for (const kw of city.keywords) {
        if (lower.includes(kw.toLowerCase())) return city.name_fr;
      }
    }
  }
  return null;
}

// detectCityInQuery is no longer used — replaced by detectCityInQueryDynamic

// Known neighborhoods for auto-detection in query
const KNOWN_NEIGHBORHOODS = [
  "Gueliz", "Guéliz", "Hivernage", "Médina", "Medina", "Ancienne Médina", "Palmeraie",
  "Agdal", "Semlalia", "Mellah", "Kasbah", "Sidi Ghanem", "Targa", "Menara",
  "Daoudiate", "Anfa", "Maârif", "Corniche", "Bourgogne", "Racine", "Gauthier",
  "Souissi", "Hassan", "Hay Riad", "Marina", "Port", "Taghazout", "Sidi Kaouki",
  "Oudaya", "Dhar El Mehraz",
];

function detectNeighborhoodInQuery(query: string): string | null {
  const lower = query.toLowerCase();
  const words = lower.split(/\s+/);
  const sorted = [...KNOWN_NEIGHBORHOODS].sort((a, b) => b.length - a.length);
  for (const n of sorted) {
    const nLower = n.toLowerCase();
    if (nLower.includes(" ")) {
      // Multi-word: substring match is fine
      if (lower.includes(nLower)) return n;
    } else {
      // Single-word: must be a standalone word to avoid "aéroport" matching "Port"
      if (words.includes(nLower)) return n;
    }
  }
  return null;
}

// Post-filter businesses by neighborhood, including "Toute la ville & environs" wildcard
function filterByNeighborhood(businesses: any[], neighborhood: string): any[] {
  const nLower = neighborhood.toLowerCase();
  // Handle accent variants (e.g. Gueliz/Guéliz)
  const variants = [nLower];
  if (nLower === "gueliz" || nLower === "guéliz") {
    variants.push("gueliz", "guéliz");
  }
  if (nLower === "médina" || nLower === "medina") {
    variants.push("médina", "medina", "ancienne médina");
  }
  
  return businesses.filter((b: any) => {
    const bNeighborhood = (b.neighborhood || "").toLowerCase();
    if (variants.some(v => bNeighborhood === v || bNeighborhood.includes(v))) return true;
    if (bNeighborhood.includes("toute la ville")) return true;
    return false;
  });
}

// Sanitize a term for to_tsquery: remove apostrophes and special chars
function sanitizeTerm(term: string): string {
  return term.replace(/['']/g, "").replace(/[^a-zA-Z0-9àâäéèêëïîôùûüÿçœæÀÂÄÉÈÊËÏÎÔÙÛÜŸÇŒÆ]/g, "");
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
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 0 && !NOISE_ADJECTIVES.has(w));

  const groups = words.map(word => {
    const alternatives: string[] = [word];

    // If word contains "/" keep it as-is (e.g. "maison/villa") for tsquery
    // Also add the individual parts so they can match separately
    if (word.includes("/")) {
      const parts = word.split("/").filter(p => p.length > 0);
      alternatives.push(...parts);
    }

    for (const [key, values] of Object.entries(synonyms)) {
      const sanitizedWord = sanitizeTerm(word);
      if (sanitizeTerm(key) === sanitizedWord || values.some(v => sanitizeTerm(v.toLowerCase()) === sanitizedWord)) {
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
    }: SearchParams & { language?: string; mode?: string } = await req.json();

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

    // Auto-détection de quartier dans la query
    const detectedNeighborhood = effectiveQuery ? detectNeighborhoodInQuery(effectiveQuery) : null;
    if (detectedNeighborhood) {
      console.log(`Auto-detected neighborhood "${detectedNeighborhood}" from query "${effectiveQuery}"`);
    }

    // Related subcategories: after main results, also show businesses from these subcategories
    const RELATED_SUBCATEGORIES: Record<string, string[]> = {
      "Supermarché": ["Epicerie fine"],
    };
    let detectedSubcategory: string | null = null;
    if (!category && effectiveQuery) {
      const qLower = effectiveQuery.toLowerCase();
      const qWords = qLower.split(/\s+/);

      // Dynamic lookup: match query words against subcategory names AND keywords from DB
      const { data: subcats } = await supabase
        .from("subcategories")
        .select("name_fr");
      
      if (subcats) {
        // Sort by name length DESC so longer names match first (e.g. "Night Club" before "Club")
        const sorted = [...subcats].sort((a, b) => (b.name_fr?.length || 0) - (a.name_fr?.length || 0));
        for (const sc of sorted) {
          const n = sc.name_fr?.toLowerCase();
          if (!n) continue;
          // Match by name: try exact substring first, then try with stop words stripped from both
          const nWords = n.split(/\s+/).filter(w => w.length > 1);
          const nContentWords = nWords.filter(w => !FRENCH_STOP_WORDS.has(w));
          const nContent = nContentWords.join(" ");
          if (n.includes(" ") ? (qLower.includes(n) || (nContent.length > 2 && qLower.includes(nContent))) : qWords.includes(n)) {
            detectedSubcategory = sc.name_fr;
            console.log(`Auto-detected subcategory "${sc.name_fr}" from name match in query "${effectiveQuery}"`);
            break;
          }
        }
      }
    }
    // Auto-detect category from intent words when no explicit category is provided
    // e.g. "manger" → Restauration, "acheter" → Commerce, "dormir" → Hôtellerie
    const INTENT_TO_CATEGORY: Record<string, string> = {
      "manger": "Restauration", "déjeuner": "Restauration", "dejeuner": "Restauration",
      "dîner": "Restauration", "diner": "Restauration", "souper": "Restauration",
      "boire": "Restauration", "déguster": "Restauration", "deguster": "Restauration",
      "goûter": "Restauration", "gouter": "Restauration", "bruncher": "Restauration",
      "acheter": "Commerce", "achat": "Commerce", "achats": "Commerce",
      "shopping": "Commerce", "courses": "Commerce",
      "dormir": "Hôtellerie", "héberger": "Hôtellerie", "heberger": "Hôtellerie",
      "loger": "Hôtellerie", "séjourner": "Hôtellerie", "sejourner": "Hôtellerie",
      "nuit": "Hôtellerie", "nuitée": "Hôtellerie", "nuitee": "Hôtellerie",
    };
    let intentCategory: string | null = null;
    if (!category && effectiveQuery) {
      const qWords = effectiveQuery.toLowerCase().split(/\s+/);
      for (const w of qWords) {
        if (INTENT_TO_CATEGORY[w]) {
          intentCategory = INTENT_TO_CATEGORY[w];
          console.log(`Intent word "${w}" → category "${intentCategory}"`);
          break;
        }
      }
    }
    const effectiveCategory = category || intentCategory || undefined;

    // ── Pre-detect matching service(s) from query keywords ──
    let detectedService: string | null = null;
    let detectedServices: string[] = []; // ALL fully-matched services (distinct concepts → AND)
    let allCandidateServiceNames: string[] = []; // ALL candidate service names (synonyms → OR)
    let originalDetectedService: string | null = null; // Keep track even after fallback
    let serviceMatchWordsForInjection: string[] = [];
    if (effectiveQuery) {
      // Strip French contractions: l'aéroport → aéroport, d'art → art, etc.
      const stripContractions = (w: string): string => w.replace(/^[lLdDsSnNjJcCqQ][\u0027\u2019\u2018\u0060]/g, "");
      const queryWords = effectiveQuery.toLowerCase().split(/\s+/)
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
      const serviceMatchWords = [...new Set(queryWords.filter(w => 
        !FRENCH_STOP_WORDS.has(w) && w !== cityLower && w !== neighborhoodLower 
        && !subcatNameWords.includes(w) && !INTENT_TO_CATEGORY[w] && !TIME_NOISE.has(w)
      ))];

      if (serviceMatchWords.length > 0) {
        // Search by name OR keywords array
        const nameConditions = serviceMatchWords.map(w => `name_fr.ilike.%${w}%`).join(",");
        const { data: matchingByName } = await supabase
          .from("services")
          .select("name_fr, keywords")
          .or(nameConditions);

        // Also search in keywords array using cs (contains) for each word
        const { data: matchingByKeywords } = await supabase
          .from("services")
          .select("name_fr, keywords")
          .not("keywords", "eq", "{}");

        // Merge: services matched by name + services whose keywords contain a query word
        const stripPlural = (w: string): string => {
          if (w.endsWith("aux")) return w.slice(0, -3) + "al";
          if (w.endsWith("eaux")) return w.slice(0, -4) + "eau";
          if (w.endsWith("s")) return w.slice(0, -1);
          return w;
        };
        const keywordMatches = (matchingByKeywords || []).filter(svc => {
          const kws = (svc.keywords || []).map((k: string) => k.toLowerCase());
          return serviceMatchWords.some(w => {
            const wNorm = stripPlural(w);
            return kws.some((k: string) => {
              const kNorm = stripPlural(k);
              return k.includes(w) || w.includes(k) || kNorm === wNorm;
            });
          });
        });
        const allMatched = new Map<string, any>();
        for (const s of [...(matchingByName || []), ...keywordMatches]) {
          const existing = allMatched.get(s.name_fr);
          if (existing) {
            const mergedKws = [...new Set([...(existing.keywords || []), ...(s.keywords || [])])];
            allMatched.set(s.name_fr, { ...existing, keywords: mergedKws });
          } else {
            allMatched.set(s.name_fr, s);
          }
        }
        const matchingServices = Array.from(allMatched.values());

        if (matchingServices && matchingServices.length > 0) {
          // Store ALL candidate service names for OR post-filtering
          allCandidateServiceNames = matchingServices.map((s: any) => s.name_fr);
          
          // Collect ALL services whose name words are fully present in the query
          const fullyMatchedServices: string[] = [];
          const usedQueryWords = new Set<string>();
          
          // First pass: find multi-word services with full match (greedy, longest first)
          const sortedByWordCount = [...matchingServices].sort((a, b) => {
            const aWords = a.name_fr.toLowerCase().split(/\s+/).filter((w: string) => w.length > 1).length;
            const bWords = b.name_fr.toLowerCase().split(/\s+/).filter((w: string) => w.length > 1).length;
            return bWords - aWords; // longest first
          });
          
          for (const svc of sortedByWordCount) {
            // Filter out stop words from service name for matching (e.g. "Au feu de bois" → ["feu", "bois"])
            const svcContentWords = svc.name_fr.toLowerCase().split(/\s+/).filter((w: string) => w.length > 1 && !FRENCH_STOP_WORDS.has(w));
            const svcWords = svc.name_fr.toLowerCase().split(/\s+/).filter((w: string) => w.length > 1);
            const allSvcWordsMatched = svcContentWords.length > 0 && svcContentWords.every((w: string) => 
              serviceMatchWords.some(qw => {
                if (usedQueryWords.has(qw)) return false; // Don't reuse query words
                return qw === w || stripPlural(qw) === stripPlural(w);
              })
            );
            if (allSvcWordsMatched) {
              fullyMatchedServices.push(svc.name_fr);
              // Mark query words as used (only content words, not stop words)
              for (const sw of svcContentWords) {
                const matchedQw = serviceMatchWords.find(qw => !usedQueryWords.has(qw) && (qw === sw || stripPlural(qw) === stripPlural(sw)));
                if (matchedQw) usedQueryWords.add(matchedQw);
              }
            }
          }
          
          if (fullyMatchedServices.length > 0) {
            detectedServices = fullyMatchedServices;
            detectedService = fullyMatchedServices[0]; // Primary service for RPC filter
            // Narrow candidates to only the fully matched services (avoids "Surf Trips" polluting "Road Trip 4x4" results)
            allCandidateServiceNames = fullyMatchedServices;
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
              const matchCount = serviceMatchWords.filter(w => svcLower.includes(w)).length;
              const svcWordCount = svcWords.length;
              const kws = (svc.keywords || []).map((k: string) => k.toLowerCase());
              const kwMatchCount = serviceMatchWords.filter(w => {
                const wNorm = stripPlural(w);
                return kws.some((k: string) => {
                  const kNorm = stripPlural(k);
                  return k.includes(w) || w.includes(k) || kNorm === wNorm;
                });
              }).length;
              
              // For multi-word service names, require ≥2 query words to match
              if (svcWordCount >= 2 && matchCount < 2 && kwMatchCount === 0) continue;
              
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
          serviceMatchWordsForInjection = serviceMatchWords;
          console.log(`Detected service(s) for SQL filter: [${detectedServices.join(", ")}], all candidates: [${allCandidateServiceNames.join(", ")}] (from: ${serviceMatchWords.join(", ")})`);
        }
      }
    }

    // When a service was detected, build a clean query for tsquery matching.
    // Remove noise words (like "achat") that don't exist in search vectors, keep service name + city etc.
    let queryForExpansion = effectiveQuery;

    // Strip detected neighborhood from queryForExpansion — neighborhood filtering is handled
    // by post-filter (filterByNeighborhood) which handles accent variants (médina/medina, guéliz/gueliz).
    // Keeping it in the tsquery causes accent mismatches (e.g. "médina" vs "medina" in search_vector).
    if (detectedNeighborhood && queryForExpansion) {
      const nhWords = detectedNeighborhood.toLowerCase().split(/\s+/);
      queryForExpansion = queryForExpansion.split(/\s+/).filter(w => {
        const wLower = w.toLowerCase();
        return !nhWords.some(nw => wLower === nw || wLower === nw.replace(/[éè]/g, "e") || nw === wLower.replace(/[éè]/g, "e"));
      }).join(" ").trim() || queryForExpansion;
      if (queryForExpansion !== effectiveQuery) {
        console.log(`Stripped neighborhood from tsquery: "${queryForExpansion}" (was: "${effectiveQuery}")`);
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
      ]);
      
      // Filter out intent noise words, stop words AND noise adjectives from the remaining query
      const cleanRemainder = effectiveQuery.split(/\s+/).filter(w => {
        const wLower = w.toLowerCase();
        return !serviceMatchWordsForInjection.includes(wLower) 
          && !FRENCH_STOP_WORDS.has(wLower)
          && !INTENT_NOISE.has(wLower)
          && !NOISE_ADJECTIVES.has(wLower)
          // Don't remove words that are part of the service name
          && !svcWords.includes(wLower);
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
    if (detectedSubcategory && businesses.length === 0) {
      // Helper to fetch businesses for a given subcategory with current filters
      const fetchSubcategoryBusinesses = async (subcat: string) => {
        let subBuilder = supabase.from("businesses").select("*").eq("is_active", true)
          .contains("categories", [subcat]);
        
        if (effectiveCity) {
          subBuilder = subBuilder.ilike("city", effectiveCity);
        }
        if (effectiveCategory) {
          subBuilder = subBuilder.or(`main_category.eq.${effectiveCategory},categories.cs.{"${effectiveCategory}"}`);
        }
        // Filter by neighborhood if detected (match both with and without accents)
        if (detectedNeighborhood) {
          const nLower = detectedNeighborhood.toLowerCase();
          // Handle Gueliz/Guéliz duality and similar accent variants
          const neighborhoodVariants = [detectedNeighborhood];
          if (nLower === "gueliz" || nLower === "guéliz") {
            neighborhoodVariants.push("Gueliz", "Guéliz");
          }
          if (neighborhoodVariants.length > 1) {
            const orClause = neighborhoodVariants.map(n => `neighborhood.ilike.${n}`).join(",");
            subBuilder = subBuilder.or(orClause);
          } else {
            subBuilder = subBuilder.ilike("neighborhood", detectedNeighborhood);
          }
        }
        
        subBuilder = subBuilder
          .order("wtuce_status", { ascending: true })
          .order("priority_score", { ascending: false })
          .limit(limit);
        
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

      businesses = await fetchSubcategoryBusinesses(detectedSubcategory);
      searchLevel = "exact";
      console.log(`Subcategory direct query "${detectedSubcategory}" + city "${effectiveCity}" + neighborhood "${detectedNeighborhood}": ${businesses.length} results`);

      // Always enrich: also find businesses that have this subcategory as a service (e.g. "Hammam" service in hotels)
      {
        const existingIds = new Set(businesses.map(b => b.id));
        let svcBuilder = supabase.from("businesses").select("*").eq("is_active", true)
          .contains("services", [detectedSubcategory]);
        if (effectiveCity) svcBuilder = svcBuilder.ilike("city", effectiveCity);
        if (effectiveCategory) svcBuilder = svcBuilder.or(`main_category.eq.${effectiveCategory},categories.cs.{"${effectiveCategory}"}`);
        if (detectedNeighborhood) {
          const nLower = detectedNeighborhood.toLowerCase();
          const neighborhoodVariants = [detectedNeighborhood];
          if (nLower === "gueliz" || nLower === "guéliz") neighborhoodVariants.push("Gueliz", "Guéliz");
          if (neighborhoodVariants.length > 1) {
            svcBuilder = svcBuilder.or(neighborhoodVariants.map(n => `neighborhood.ilike.${n}`).join(","));
          } else {
            svcBuilder = svcBuilder.ilike("neighborhood", detectedNeighborhood);
          }
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
        console.log(`Subcategory service enrichment "${detectedSubcategory}": ${businesses.length} total results`);
      }

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
    }

    // Level 1: Exact full-text search with ts_rank (services/name weight A > description weight B)
    if ((queryForExpansion || city || effectiveCategory) && businesses.length === 0) {
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
          name.toLowerCase().split(/[\s/]+/).map(w => sanitizeTerm(w)).filter(t => t.length > 1 && !FRENCH_STOP_WORDS.has(t))
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
          // This is mandatory — if subcategory was detected, only keep matching businesses
          if (detectedSubcategory) {
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
          if (detectedServices.length > 1) {
            // AND logic: business must have ALL distinct detected services
            const beforeCount = businesses.length;
            businesses = businesses.filter((b: any) => {
              const bServices = (b.services || []).map((s: string) => s.toLowerCase());
              return detectedServices.every(ds => 
                bServices.some(bs => bs.includes(ds.toLowerCase()) || ds.toLowerCase().includes(bs))
              );
            });
            console.log(`Multi-service AND post-filter [${detectedServices.join(", ")}]: ${beforeCount} → ${businesses.length}`);
            
            // When multi-service filter gives 0, keep 0 — don't fallback
            if (businesses.length === 0) {
              console.log(`Multi-service AND filter returned 0 results — no fallback`);
            }
          } else if (allCandidateServiceNames.length > 0) {
            // OR logic: business must have at least ONE of the candidate services
            const beforeCount = businesses.length;
            businesses = businesses.filter((b: any) => {
              const bServices = (b.services || []).map((s: string) => s.toLowerCase());
              return allCandidateServiceNames.some(cs => 
                bServices.some(bs => bs.includes(cs.toLowerCase()) || cs.toLowerCase().includes(bs))
              );
            });
            console.log(`Service OR post-filter [${allCandidateServiceNames.join(", ")}]: ${beforeCount} → ${businesses.length}`);
            
            // When service filter gives 0, keep 0 — don't fallback to unfiltered results
            // This prevents returning irrelevant businesses when the service simply doesn't exist in this city
            if (businesses.length === 0) {
              console.log(`Service OR filter returned 0 results — no fallback (service "${detectedService}" not found with these filters)`);
            }
          }
          
          // Neighborhood post-filter for Level 1 results
          if (detectedNeighborhood && businesses.length > 0) {
            const beforeNeighborhood = businesses.length;
            const neighborhoodFiltered = filterByNeighborhood(businesses, detectedNeighborhood);
            if (neighborhoodFiltered.length > 0) {
              businesses = neighborhoodFiltered;
            }
            console.log(`Neighborhood post-filter "${detectedNeighborhood}" (Level 1): ${beforeNeighborhood} → ${businesses.length}`);
          }

          searchLevel = "exact";
        }
      } else {
        // No text query, just filter by city/category
        let queryBuilder = supabase.from("businesses").select("*").eq("is_active", true);

        if (effectiveCity) {
          queryBuilder = queryBuilder.ilike("city", effectiveCity);
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
        fuzzyBuilder = fuzzyBuilder.ilike("city", effectiveCity);
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
              const bServices = (b.services || []).map((s: string) => s.toLowerCase());
              return allCandidateServiceNames.some(cs => 
                bServices.some(bs => bs.includes(cs.toLowerCase()) || cs.toLowerCase().includes(bs))
              );
            });
            console.log(`Service post-filter (Level 2): ${beforeSvc} → ${businesses.length}`);
          }

          // Neighborhood post-filter for Level 2 results
          if (detectedNeighborhood && businesses.length > 0) {
            const beforeNeighborhood = businesses.length;
            const neighborhoodFiltered = filterByNeighborhood(businesses, detectedNeighborhood);
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
    // LLM Re-ranking: apply only on exact/fuzzy results with a real query AND no superlative override (skip for autocomplete)
    else if (!isAutocomplete && effectiveQuery && businesses.length > 1 && (searchLevel === "exact" || searchLevel === "fuzzy")) {
      businesses = await llmRerank(effectiveQuery, businesses);
    }

    // Autocomplete mode: sort by best rating DESC, then return lightweight results
    if (isAutocomplete) {
      businesses = [...businesses].sort((a, b) => getBestRating(b) - getBestRating(a));
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

    const result: SearchResult = {
      businesses,
      searchLevel,
      message: getSearchLevelMessage(searchLevel, language),
      totalResults: businesses.length,
    };

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

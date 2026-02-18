import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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
  restaurant: ["resto", "café", "gastronomie", "cuisine", "brasserie", "table", "manger", "déjeuner", "dîner"],
  spa: ["hammam", "bien-être", "massage", "détente", "relaxation", "soin"],
  transport: ["taxi", "navette", "transfert", "voiture"],
  tour: ["excursion", "visite", "circuit", "guide"],
  shop: ["boutique", "artisanat", "souvenir", "shopping"],
  animaux: ["animaux", "animal", "chien", "chat", "pet"],
  piscine: ["piscine", "pool", "baignade"],
  parking: ["parking", "garage", "stationnement"],
  wifi: ["wifi", "internet", "connexion"],
  climatisation: ["climatisation", "climatisé", "clim", "ac"],
  terrasse: ["terrasse", "rooftop", "toit"],
  halal: ["halal", "casher", "végétarien", "vegan"],
  tapis: ["tapis", "berbere", "berberes", "kilim", "zellige", "artisanat", "tissage"],
  bijoux: ["bijoux", "bijou", "argent", "or", "joaillerie"],
  epices: ["epices", "épice", "herbes", "aromates", "souk"],
  cuir: ["cuir", "maroquinerie", "babouche", "sac"],
  poterie: ["poterie", "ceramique", "faience", "zellige"],
  plage: ["plage", "mer", "ocean", "océan", "bord de mer", "front de mer", "vue mer", "bord eau", "littoral", "cote", "côte", "atlantique"],
  bar: ["bar", "café", "lounge", "boire", "cocktail"],
  cafe: ["café", "café", "coffee", "thé", "pâtisserie"],
  art: ["art", "galerie", "galerie d'art", "artistique", "exposition", "expo", "musee", "musée", "culture", "culturel"],
  petanque: ["pétanque", "petanque", "boules", "boulodrome"],
  glacier: ["glacier", "glace", "glaces", "sorbet", "gelato", "creme glacee", "crème glacée"],
};

// Villes marocaines connues pour la détection automatique dans la query
const MOROCCAN_CITIES = [
  "Marrakech", "Casablanca", "Rabat", "Fès", "Fes", "Agadir", "Tanger", "Tangier",
  "Essaouira", "Meknès", "Meknes", "Oujda", "Kenitra", "Tétouan", "Tetouan",
  "Safi", "El Jadida", "Nador", "Béni Mellal", "Beni Mellal", "Khouribga",
  "Settat", "Berrechid", "Mohammedia", "Laâyoune", "Dakhla", "Ifrane",
  "Ouarzazate", "Merzouga", "Chefchaouen", "Asilah", "Taroudant", "Tiznit",
  "Zagora", "Erfoud", "Midelt", "Bouznika", "Azemmour",
];

function detectCityInQuery(query: string): string | null {
  const lower = query.toLowerCase();
  for (const city of MOROCCAN_CITIES) {
    if (lower.includes(city.toLowerCase())) return city;
  }
  return null;
}

// Sanitize a term for to_tsquery: remove apostrophes and special chars
function sanitizeTerm(term: string): string {
  return term.replace(/['']/g, "").replace(/[^a-zA-Z0-9àâäéèêëïîôùûüÿçœæÀÂÄÉÈÊËÏÎÔÙÛÜŸÇŒÆ]/g, "");
}

function expandQuery(query: string): string {
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 0);

  const groups = words.map(word => {
    const alternatives: string[] = [word];

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

    const sanitized = [...new Set(alternatives)].map(sanitizeTerm).filter(t => t.length > 1);
    return sanitized.length === 1 ? sanitized[0] : `(${sanitized.join(" | ")})`;
  });

  return groups.join(" & ");
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
    }: SearchParams & { language?: string } = await req.json();

    let businesses: Business[] = [];
    let searchLevel = "exact";

    // Auto-détection de ville dans la query si aucune ville n'est passée explicitement
    const detectedCity = (!city && query) ? detectCityInQuery(query) : null;
    const effectiveCity = city || detectedCity || undefined;

    // Level 1: Exact full-text search with city and category filter
    if (query || city || category) {
      const expandedQuery = query ? expandQuery(query) : null;

      let queryBuilder = supabase.from("businesses").select("*").eq("is_active", true);

      if (expandedQuery) {
        queryBuilder = queryBuilder.textSearch("search_vector", expandedQuery, {
          config: "simple",
        });
      }

      if (effectiveCity) {
        queryBuilder = queryBuilder.ilike("city", effectiveCity);
      }

      if (category) {
        queryBuilder = queryBuilder.or(`main_category.eq.${category},categories.cs.{"${category}"}`);
      }

      queryBuilder = queryBuilder
        .order("wtuce_status", { ascending: true })
        .order("priority_score", { ascending: false })
        .limit(limit);

      const { data, error } = await queryBuilder;

      if (!error && data && data.length > 0) {
        businesses = data.map((b) => ({
          ...b,
          distance_km:
            latitude && longitude && b.latitude && b.longitude
              ? calculateDistance(latitude, longitude, b.latitude, b.longitude)
              : null,
        }));
        searchLevel = "exact";
      }
    }

    // Level 2: Fuzzy search with trigram similarity
    if (businesses.length === 0 && query) {
      let fuzzyBuilder = supabase
        .from("businesses")
        .select("*")
        .eq("is_active", true)
        .or(
          `name.ilike.%${query}%,description.ilike.%${query}%,categories.cs.{${query}},services.cs.{${query}}`
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
        searchLevel = "fuzzy";
      }
    }

    // Level 3: Expand to radius (30km)
    if (businesses.length === 0 && latitude && longitude) {
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

    // Level 4: Expand to region
    if (businesses.length === 0 && region) {
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
    if (businesses.length === 0) {
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

    // LLM Re-ranking: apply only on exact/fuzzy results with a real query
    if (query && businesses.length > 1 && (searchLevel === "exact" || searchLevel === "fuzzy")) {
      businesses = await llmRerank(query, businesses);
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

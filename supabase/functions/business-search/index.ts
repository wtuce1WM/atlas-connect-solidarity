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
}
...
        const { data: missingBusinesses } = await supabase
          .from("businesses")
          .select("id, name, slug, description, categories, services, city, region, latitude, longitude, wtuce_status, priority_score, phone, email, website, address, logo_url, main_category, neighborhood, keywords, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, restaurant_guru_rating, restaurant_guru_review_count, trustpilot_rating, trustpilot_review_count, getyourguide_rating, getyourguide_review_count, viator_rating, viator_review_count, avis_verifies_rating, avis_verifies_review_count, tourradar_rating, tourradar_review_count, images, google_maps_url, badge_id, gamme_id, is_featured, default_service, hook_fr, hook_en, hook_ar, engagements, online_shop_url, opening_hours, is_open_24h, vacation_dates, zone_chalandise, is_visible_locale, zone_city_ids, business_type")
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
              return termWords.every(tw => queryWords.some(qw => {
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
    if (intentCategories.length > 1 && businesses.length > 0) {
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
    if (query && businesses.length > 1) {
      const qNormIso = stripAccentsGlobal(query.trim().toLowerCase());
      const exactBusiness = businesses.find(b => stripAccentsGlobal(b.name.toLowerCase().trim()) === qNormIso);
      if (exactBusiness) {
        // Check the query is NOT just a city name
        const isCityName = !!detectedCity && stripAccentsGlobal(detectedCity.toLowerCase()) === qNormIso;
        const cityDetResult2 = await detectCityInQueryDynamic(query, supabase);
        const isJustACity = !!cityDetResult2 && stripAccentsGlobal(cityDetResult2.matchedTerm.toLowerCase().trim()) === qNormIso;
        
        if (!isCityName && !isJustACity) {
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
            if (b.id === exactBusiness.id) return false;
            const bNameNorm = stripAccentsGlobal(b.name.toLowerCase().trim());
            return bNameNorm.includes(qNormIso) || qNormIso.includes(bNameNorm);
          });
          const nameContainIds = new Set(nameContainMatches.map(b => b.id));
          const keywordMatches = queryWords.length > 0 ? businesses.filter(b => {
            if (b.id === exactBusiness.id || nameContainIds.has(b.id)) return false;
            const bKeywords = (b.keywords ?? []).map((k: string) => stripAccentsGlobal(k.toLowerCase().trim()));
            return bKeywords.some((kw: string) => queryWords.some(qw => kw.includes(qw) || qw.includes(kw)));
          }) : [];
          businesses = [exactBusiness, ...nameContainMatches, ...keywordMatches];
          exactNameMatchIsolation = true;
          console.log(`🎯 Exact name match isolation: "${query}" → keeping ${businesses.length} results (exact + ${keywordMatches.length} keyword matches, was ${beforeIso})`);
        }
      }
    }

    // If results hit the limit, do a count query to get the true total
    // (works for city-scoped and national queries like "maroc")
    let totalCount: number | undefined;
    if (businesses.length >= limit) {
      try {
        let countBuilder = supabase
          .from("businesses")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true);

        if (effectiveCity) {
          countBuilder = countBuilder.ilike("city", effectiveCity);
        }
        if (effectiveCategory) {
          countBuilder = countBuilder.eq("main_category", effectiveCategory);
        }

        const { count, error: countError } = await countBuilder;
        console.log(`Count query (city=${effectiveCity || "all"}, category=${effectiveCategory || "all"}): count=${count}, error=${countError?.message || "none"}`);

        if (!countError && count !== null && count > businesses.length) {
          totalCount = count;
        }
      } catch (e) {
        console.warn("Count query failed:", e);
      }
    }

    // Determine disambiguation type
    // Skip disambiguation when few results (≤ 5) — the user already has a manageable list
    // Also skip when a business name exactly matches the query (name-pinning)
    const hasCity = !!effectiveCity;
    const hasSubcategory = !!detectedSubcategory;
    const queryNorm = stripAccentsGlobal(query.trim().toLowerCase());
    const hasExactNameMatch = businesses.some(b => stripAccentsGlobal(b.name.toLowerCase()) === queryNorm);
    let disambiguationType: "needs_category" | "needs_city" | null = null;
    if (!hasExactNameMatch && businesses.length > 5) {
      if (hasCity && !hasSubcategory && businesses.length > 10) {
        disambiguationType = "needs_category";
      } else if (hasSubcategory && !hasCity) {
        disambiguationType = "needs_city";
      }
    }

    // ── Post-search city inference: if no city was detected but all results share the same city, infer it ──
    if (!effectiveCity && businesses.length > 0 && businesses.length <= 50) {
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
    const result: SearchResult = {
      businesses,
      searchLevel,
      message: getSearchLevelMessage(searchLevel, language),
      totalResults: businesses.length,
      totalCount,
      detectedSubcategory: detectedSubcategory || null,
      detectedCity: effectiveCity || null,
      detectedNeighborhood: detectedNeighborhood || null,
      detectedCategory: intentCategory || null,
      detectedService: detectedService || null,
      intentSubcategoryConflict,
      searchMode: serviceShortcutActivated ? "service_shortcut" : "broad", // TEST: Force broad — was: (typeof subcategorySearchConfig !== 'undefined' && subcategorySearchConfig?.search_mode) || null,
      bundleTimeSlots: (typeof bundleTimeSlots !== 'undefined' && bundleTimeSlots.length > 0) ? bundleTimeSlots : undefined,
      disambiguationType,
      synonymUsed: synonymWasUsed || undefined,
      preciseMatch: preciseMatch || undefined,
      exactNameMatchIsolation: exactNameMatchIsolation || undefined,
    };

    // Async log to search_logs table (fire-and-forget, don't block response)
    const _totalLatencyMs = Date.now() - _searchStartMs;
    if (!isAutocomplete && effectiveQuery) {
      supabase.from("search_logs").insert({
        query: query || "",
        effective_query: effectiveQuery,
        detected_city: effectiveCity || null,
        detected_neighborhood: detectedNeighborhood || null,
        detected_subcategory: detectedSubcategory || null,
        search_mode: serviceShortcutActivated ? "service_shortcut" : (typeof subcategorySearchConfig !== 'undefined' ? subcategorySearchConfig?.search_mode : null) || null,
        search_level: searchLevel,
        total_results: businesses.length,
        rerank_applied: !!lastRerankMeta,
        rerank_latency_ms: lastRerankMeta?.latencyMs || null,
        total_latency_ms: _totalLatencyMs,
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

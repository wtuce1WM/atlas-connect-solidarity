import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fetchAiGateway, resolveCallerContext } from "../_shared/ai-gateway.ts";
import { loadRoutes, route as engineRoute } from "../_shared/ai-engine/index.ts";
import type { RouteCode } from "../_shared/ai-engine/types.ts";
import {
  matchCuratedByText, loadCuratedTargets, fetchBlogPostsCached,
  buildBlogArticleAnswer, buildPinnedAnswer,
} from "../_shared/ai-engine/routes/curated.ts";
import { loadEditorialBundle, formatEditorialBundle } from "../_shared/ai-engine/editorial.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};


// --- Moteur A/B/C : journalisation des tours (surface "search") ---
function svcClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

type SearchTurnLog = {
  user_message: string;
  route_taken: string;
  classifier_confidence?: number | null;
  chat_id?: string | null;
  city_detected?: string | null;
  ai_class: "A" | "B" | "C";
  model?: string | null;
  fallback_reason?: string | null;
  results_count?: number | null;
  language?: string | null;
  city_active?: string | null;
  had_error?: boolean;
  error_message?: string | null;
  latency_ms_total?: number | null;
  tokens_in?: number | null;
  tokens_out?: number | null;
  user_id?: string | null;
  affiliate_id?: string | null;
};

async function logSearchTurn(log: SearchTurnLog, sb?: any) {
  try {
    const client = sb ?? svcClient();
    const { error } = await client.from("ai_conversation_turns").insert({
      surface: "search",
      intent_classified: log.route_taken,
      stream_completed: true,
      ...log,
    });
    if (error) console.error("[ai-search-answer] logTurn error", error.message);
  } catch (e) {
    console.error("[ai-search-answer] logTurn threw", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const t0 = Date.now();
  try {
    const { query, spokenText, businesses = [], language = "fr", vary, mode, history = [], nearbyContext, userCoords, curatedRoute = null, focus = null, chatId = null } = await req.json();

    // --- Geolocation intent detection ---
    // "près de moi", "autour de moi", "à moins de X km", "dans un rayon de Y m", etc.
    const geoHaystack = [
      query,
      ...(Array.isArray(history)
        ? history.filter((m: any) => m && typeof m.content === "string").slice(-4).map((m: any) => m.content)
        : []),
    ].join(" \n ").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const NEAR_ME_RE = /\b(pres\s+de\s+moi|aupres\s+de\s+moi|autour\s+de\s+moi|a\s+cote\s+de\s+moi|a\s+proximite\s+de\s+moi|ma\s+position|ma\s+localisation|near\s+me|around\s+me|close\s+to\s+me|next\s+to\s+me|nearby\s+me)\b/;
    const RADIUS_RE = /(?:a\s+moins\s+de|moins\s+de|dans\s+un\s+rayon\s+de|rayon\s+de|within|less\s+than|under)\s+(\d+(?:[\.,]\d+)?)\s*(km|kms|kilom[eè]tres?|m|metres?|meters?|miles?|mi)\b/;
    const nearMeIntent = NEAR_ME_RE.test(geoHaystack);
    const radiusMatch = geoHaystack.match(RADIUS_RE);
    let maxDistanceKm: number | null = null;
    if (radiusMatch) {
      const value = parseFloat(radiusMatch[1].replace(",", "."));
      const unit = radiusMatch[2];
      if (/^m(etres?|eters?)?$/.test(unit)) maxDistanceKm = value / 1000;
      else if (/^miles?$|^mi$/.test(unit)) maxDistanceKm = value * 1.609344;
      else maxDistanceKm = value;
    }
    const geoIntent = nearMeIntent || maxDistanceKm !== null;
    const hasUserCoords = !!(userCoords && typeof userCoords.lat === "number" && typeof userCoords.lng === "number");

    // Ville par défaut : Essaouira si l'utilisateur est dans un rayon de 80 km autour
    // d'Essaouira, sinon TOUJOURS Marrakech (même sans géolocalisation).
    const ESSAOUIRA = { lat: 31.5085, lng: -9.7595 };
    const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const toRad = (d: number) => (d * Math.PI) / 180;
      const R = 6371;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(a));
    };
    const defaultCity = (hasUserCoords && haversineKm(userCoords.lat, userCoords.lng, ESSAOUIRA.lat, ESSAOUIRA.lng) <= 80)
      ? "Essaouira"
      : "Marrakech";

    // Si l'utilisateur exprime une intention de proximité physique mais que sa position
    // n'est pas connue → on demande l'autorisation de géolocalisation côté UI.
    if (geoIntent && !hasUserCoords) {
      const isEn = language === "en";
      await logSearchTurn({
        user_message: String(query || ""),
        route_taken: "clarify_geolocate",
        ai_class: "A",
        model: null,
        fallback_reason: "clarify_needed",
        language,
        latency_ms_total: Date.now() - t0,
      });
      return new Response(
        JSON.stringify({
          answer: "",
          clarify: {
            type: "geolocate",
            question: isEn
              ? "I need your location to find what's closest. Enable geolocation?"
              : "J'ai besoin de votre position pour trouver ce qui est le plus proche. Activer la géolocalisation ?",
            options: [
              {
                id: "enable_geo",
                label: isEn ? "Enable geolocation" : "Activer la géolocalisation",
                text: query,
              },
              {
                id: "skip_geo",
                label: isEn ? "Skip — search the whole area" : "Ignorer — chercher dans toute la zone",
                text: `${query} ${isEn ? "(anywhere in the current search area)" : "(partout dans la zone de recherche actuelle)"}`,
              },
            ],
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!query) {
      return new Response(JSON.stringify({ answer: "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Proximity ambiguity detection (refinement turns only) ---
    // When the user writes "à côté", "près de", "proche", etc. WITHOUT specifying
    // the referent (previous results / their location / a place), we don't guess —
    // we return a `clarify` payload so the UI can ask via clickable badges.
    const isRefinementTurn = Array.isArray(history) && history.length > 0;
    if (isRefinementTurn && !nearbyContext) {
      const PROX_RE = /\b(à\s+côté|a\s+cote|à\s+coté|près\b|pres\b|proche|à\s+proximité|a\s+proximite|autour|aux\s+alentours|near\b|close\s+to|next\s+to|around)\b/i;
      // Referent already explicit → no ambiguity.
      const REFERENT_RE = /\b(r[ée]sultats?\s+pr[ée]c[ée]dents?|d[ée]j[àa]\s+cit[ée]s?|de\s+moi|près\s+de\s+moi|pres\s+de\s+moi|ma\s+position|near\s+me|previous\s+results?|de\s+(la\s+|l[' ’]|le\s+)?[A-ZÉÈÀÂÎÔÛÇ][\wÀ-ÿ'’\- ]{2,})/i;
      if (PROX_RE.test(query) && !REFERENT_RE.test(query)) {
        const isEn = language === "en";
        await logSearchTurn({
          user_message: String(query || ""),
          route_taken: "clarify_proximity",
          ai_class: "A",
          model: null,
          fallback_reason: "clarify_needed",
          language,
          latency_ms_total: Date.now() - t0,
        });
        return new Response(
          JSON.stringify({
            answer: "",
            clarify: {
              type: "proximity",
              question: isEn
                ? "Close to what exactly?"
                : "À proximité de quoi exactement ?",
              options: [
                {
                  id: "near_previous",
                  label: isEn ? "Near the previous results" : "À côté des résultats précédents",
                  text: `${query} ${isEn ? "(near the previous results)" : "(à côté des résultats précédents)"}`,
                },
                {
                  id: "near_me",
                  label: isEn ? "Near my location" : "Près de ma position",
                  text: `${query} ${isEn ? "(near my current location)" : "(près de ma position actuelle)"}`,
                },
                {
                  id: "anywhere",
                  label: isEn ? "Anywhere in the search area" : "Partout dans la zone de recherche",
                  text: `${query} ${isEn ? "(anywhere in the current search area)" : "(partout dans la zone de recherche actuelle)"}`,
                },
              ],
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch AI config from DB
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    // Resolve caller context (optional — search may be anonymous)
    let callerContext = { userId: null as string | null, affiliateId: null as string | null };
    try {
      const authHeader = req.headers.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const userClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
        const { data: { user } } = await userClient.auth.getUser();
        if (user) {
          callerContext = await resolveCallerContext(sb, user.id);
        }
      }
    } catch (e) {
      console.error("[ai-search-answer] caller context error", e);
    }
    
    const { data: configRows } = await sb.from("ai_config").select("key, value");
    const cfg: Record<string, string> = {};
    (configRows || []).forEach((r: any) => { cfg[r.key] = r.value; });

    const persona = cfg.persona || "Tu es un concierge expert du Maroc, chaleureux et passionné. Tu aides les utilisateurs à trouver les meilleurs établissements.";
    const tone = cfg.tone || "Sois naturel et enthousiaste, comme un ami local passionné qui partage ses meilleures adresses.";
    const responseLength = cfg.response_length || "5-8";
    const baseModel = cfg.model || "openai/gpt-5.6-sol";
    const proModel = cfg.pro_model || "openai/gpt-5.6-sol";

    // --- Hybrid model routing ---
    // Promote to Pro on complex / open-ended requests where reasoning quality
    // visibly pays off (planning, multi-criteria, long prose, refinement chains).
    // Default stays on Flash to keep the ~$0.003/req baseline.
    // Modes "poi" / "destinations" stay on Flash (formatting-only outputs).
    const qLen = (query || "").length;
    const historyTurns = Array.isArray(history) ? history.length : 0;
    const COMPLEX_RE = /\b(itin[ée]raire|planifi|organise|propose[- ]?moi|recommande[- ]?moi|conseille[- ]?moi|compare|versus|vs\b|meilleur|top\s*\d|journ[ée]e|week[- ]?end|s[ée]jour|programme|sur\s+\d+\s*jours?|romantique|en\s+famille|avec\s+enfants?|budget|luxe|authentique|insolite|secret|cach[ée]|hors[- ]des[- ]sentiers|et\s+(?:aussi|ensuite|apr[èe]s|avant)|d'?abord.+(?:ensuite|puis))/i;
    const isComplex = !mode && (COMPLEX_RE.test(query || "") || qLen >= 110 || historyTurns >= 4);
    const model = isComplex ? proModel : baseModel;
    console.log(`[ai-search-answer] model=${model} complex=${isComplex} qLen=${qLen} turns=${historyTurns}`);
    const configuredMaxTokens = parseInt(cfg.max_tokens || "1200", 10);
    const maxTokens = Math.max(Number.isFinite(configuredMaxTokens) ? configuredMaxTokens : 0, 1800);
    const temperature = parseFloat(cfg.temperature || "0.7");
    const extraInstructions = cfg.extra_instructions || "";
    const noResultsCfg = cfg.no_results_instructions || "";
    const boostVerified = cfg.boost_verified !== "false";

    // --- AUTORITÉ CURATÉE (classe A, zéro token) ---
    // Texte libre rapproché d'un libellé de suggestion staff (matcher partagé) :
    // si la suggestion pointe vers un article de blog ou des établissements
    // épinglés, on rend le contenu éditorial tel quel, sans génération.
    if (!mode && (!Array.isArray(history) || history.length === 0)) {
      try {
        const m = await matchCuratedByText(sb, { text: String(query || ""), surface: "search", crossSurface: true });
        if (m) {
          const curated = await loadCuratedTargets(sb, { suggestionId: m.id });
          const pseudoHost: any = { id: null, city: defaultCity, name: null };
          const lang: "fr" | "en" | "ar" = language === "en" ? "en" : language === "ar" ? "ar" : "fr";
          let built: any = null;
          if (curated.blogPostIds.length) {
            const posts = await fetchBlogPostsCached(sb);
            const post = curated.blogPostIds.map((id) => posts.find((p) => p.id === id)).filter(Boolean)[0];
            if (post) built = await buildBlogArticleAnswer(sb, post, pseudoHost, lang);
          }
          if (!built && curated.pinnedBusinessIds.length) {
            built = await buildPinnedAnswer(sb, curated.pinnedBusinessIds, pseudoHost, lang, curated.label);
          }
          if (built?.text) {
            // Les marqueurs de rendu (ARTICLE_CARD…) ne sont pas interprétés par /search.
            const answer = String(built.text).replace(/<!--[A-Z_]+:[\s\S]*?-->/g, "").replace(/\n{3,}/g, "\n\n").trim();
            if (answer) {
              await logSearchTurn({
                user_message: String(query || ""),
                route_taken: built.route || "curated",
                ai_class: "A",
                model: null,
                fallback_reason: null,
                results_count: built.shown ?? null,
                language,
                city_active: defaultCity,
                chat_id: chatId,
                latency_ms_total: Date.now() - t0,
                tokens_in: 0,
                tokens_out: 0,
              }, sb);
              console.log(`[ai-search-answer] curated_text_match ${JSON.stringify(m)} route=${built.route}`);
              return new Response(
                JSON.stringify({ answer, citedBusinesses: built.knownBusinesses || [] }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } },
              );
            }
          }
        }
      } catch (e) {
        console.error("[ai-search-answer] curated_text_match_failed", String(e));
      }
    }

    // --- Moteur A/B/C (surface "search") ---
    // Curated input (suggestion / relance cliquée) → route imposée, classe A, zéro token.
    // Input libre → classifieur B en mode observation (la génération legacy reste l'autorité).
    let engineRouteCode: string = "search_answer";
    let engineClass: "A" | "B" | "C" = "C";
    let engineConfidence: number | null = null;
    let engineFallback: string | null = null;
    let engineCityDetected: string | null = null;
    let engineTokensIn = 0;
    let engineTokensOut = 0;
    try {
      const engineRoutes = await loadRoutes(sb);
      if (engineRoutes.length > 0) {
        const outcome = await engineRoute(
          {
            message: String(query || ""),
            surface: "search",
            curatedRoute: (curatedRoute || null) as RouteCode | null,
            focus: focus || undefined,
            activeCity: defaultCity,
            language,
            chatId: chatId || null,
          },
          engineRoutes,
          LOVABLE_API_KEY,
        );
        engineRouteCode = outcome.route;
        engineClass = outcome.aiClass;
        engineConfidence = outcome.confidence;
        engineFallback = outcome.fallbackReason;
        engineCityDetected = outcome.classifier?.city ?? null;
        engineTokensIn = outcome.tokensIn;
        engineTokensOut = outcome.tokensOut;
        console.log(`[ai-search-answer] engine route=${engineRouteCode} class=${engineClass} conf=${engineConfidence} curated=${curatedRoute ?? "-"}`);
      }
    } catch (e) {
      console.error("[ai-search-answer] engine decision failed", e);
      engineFallback = "route_failed";
    }


    // Keep enough businesses for the model to cite real DB results, especially when
    // the first visible page/ranking is broader than the user's text intent.
    const isRefinement = Array.isArray(history) && history.length > 0;
    const topBusinesses = businesses.slice(0, isRefinement ? 60 : 30);
    const hasResults = topBusinesses.length > 0;

    // --- Topic-change detection (refinement turns only) ---
    // If the new user query references a proper noun (place / entity) that does NOT
    // appear anywhere in the current business list, the user has likely moved on
    // to a new topic. We then switch the model to "general knowledge" mode instead
    // of forcing it to pick from the (now irrelevant) list.
    let topicChange = false;
    if (isRefinement && hasResults) {
      const STOP = new Set([
        "Je","Tu","Il","Elle","On","Nous","Vous","Ils","Elles","Le","La","Les","Un","Une","Des","Du","De","Au","Aux",
        "Et","Ou","Mais","Donc","Or","Ni","Car","Si","Que","Qui","Quoi","Quel","Quelle","Quels","Quelles","Comment","Pourquoi","Quand","Où",
        "Peut","Peux","Peuvent","Faire","Aller","Voir","Avoir","Être","Cette","Ce","Ces","Cet","Mon","Ma","Mes","Ton","Ta","Tes","Son","Sa","Ses",
        "Pour","Avec","Sans","Dans","Sur","Par","Plus","Moins","Là","Ici","Aussi","Très",
      ]);
      const properNouns: string[] = [];
      const re = /\b([A-ZÉÈÀÂÎÔÛÇ][\wÀ-ÿ'’\-]{2,}(?:\s+(?:d['’]|de\s+|du\s+|des\s+|la\s+|le\s+|les\s+)?[A-ZÉÈÀÂÎÔÛÇ][\wÀ-ÿ'’\-]{2,})*)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(query)) !== null) {
        const token = m[1].trim();
        const first = token.split(/\s+/)[0];
        if (STOP.has(first)) continue;
        if (token.length >= 4) properNouns.push(token.toLowerCase());
      }
      if (properNouns.length > 0) {
        const norm = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const haystack = norm(topBusinesses.map((b: any) =>
          [b.name, b.city, b.neighborhood, b.address, (b.categories || []).join(" "), b.main_category, b.hook_fr].filter(Boolean).join(" ")
        ).join(" \n "));
        const unknown = properNouns.filter((pn) => {
          const n = norm(pn);
          return !haystack.includes(n);
        });
        if (unknown.length > 0) {
          topicChange = true;
          console.log(`Topic change detected. Unknown proper nouns: ${unknown.join(", ")}`);
        }
      }
    }


    // Collect business IDs from results for direct linking.
    // On topic change, hide the previous business pool completely so stale results
    // cannot be cited or enriched back into the answer.
    let effectiveBusinesses = topicChange ? [] : topBusinesses;
    const effectiveHasResults = effectiveBusinesses.length > 0;
    const businessIds = effectiveBusinesses.map((b: any) => b.id).filter(Boolean);

    // Detect businesses explicitly named in the user query → unlock full reviews for them.
    const normTxt = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const qNorm = ` ${normTxt(query)} `;
    const focusedIds = new Set<string>(
      effectiveBusinesses
        .filter((b: any) => {
          const n = normTxt(b.name);
          return n.length >= 4 && qNorm.includes(` ${n} `);
        })
        .map((b: any) => b.id)
        .filter(Boolean),
    );

    // Enrich businesses with services, engagements, badges, video badges,
    // plus description, opening hours, prices, photos count, ratings and review snippets.
    const enrichment: Record<string, {
      services?: string[];
      engagements?: string[];
      badges?: string[];
      video_badges?: string[];
      videos?: string[];
      description?: string;
      ai_review_summary?: string;
      opening_hours?: any;
      price?: string;
      images_count?: number;
      ratings?: string;
      reviews?: string[];
      menus?: string[];
      blog?: string[];
    }> = {};
    const reviewsDisabled = new Set<string>();
    if (businessIds.length > 0) {
      const focusedArr = Array.from(focusedIds);
      const reviewsPromises: any[] = [
        sb.from("reviews")
          .select("business_id, source, rating, text_fr, text, language")
          .in("business_id", businessIds)
          .eq("is_hidden", false)
          .not("text", "is", null)
          .order("published_at", { ascending: false })
          .limit(businessIds.length * 8),
      ];
      if (focusedArr.length > 0) {
        reviewsPromises.push(
          sb.from("reviews")
            .select("business_id, source, rating, text_fr, text, language")
            .in("business_id", focusedArr)
            .eq("is_hidden", false)
            .not("text", "is", null)
            .order("published_at", { ascending: false })
            .limit(focusedArr.length * 40),
        );
      }
      const [bizRows, badgeLinks, videoRows, ytTitleRows, genericVideoRows, menuRows, reviewsStatusRows, reviewRows, focusedReviewRows] = await Promise.all([
        sb.from("businesses")
          .select("id, services, engagements, description, ai_review_summary, opening_hours, show_opening_hours, is_open_24h, min_price, manual_price_range, avg_price_range, images, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, restaurant_guru_rating, restaurant_guru_review_count, trustpilot_rating, trustpilot_review_count, getyourguide_rating, getyourguide_review_count, viator_rating, viator_review_count, avis_verifies_rating, avis_verifies_review_count, tourradar_rating, tourradar_review_count")
          .in("id", businessIds),
        sb.from("business_badges").select("business_id, badges(name_fr)").in("business_id", businessIds),
        sb.from("business_youtube_videos")
          .select("business_id, business_youtube_video_badges(badges(name_fr))")
          .in("business_id", businessIds)
          .eq("is_visible", true),
        sb.from("business_youtube_videos")
          .select("business_id, title")
          .in("business_id", businessIds)
          .eq("is_visible", true)
          .not("title", "is", null)
          .limit(businessIds.length * 10),
        sb.from("generic_video_businesses")
          .select("business_id, generic_videos(title, name, description)")
          .in("business_id", businessIds)
          .limit(businessIds.length * 10),
        sb.from("business_menu_summaries")
          .select("business_id, title, content, price_details")
          .in("business_id", businessIds)
          .order("sort_order", { ascending: true })
          .limit(businessIds.length * 6),
        sb.from("reviews").select("business_id, is_hidden").in("business_id", businessIds),
        ...reviewsPromises,
      ]);
      // Avis désactivés : business dont TOUS les avis existants sont masqués (is_hidden=true).
      const byBiz: Record<string, { total: number; hidden: number }> = {};
      (reviewsStatusRows.data || []).forEach((r: any) => {
        const s = byBiz[r.business_id] = byBiz[r.business_id] || { total: 0, hidden: 0 };
        s.total++;
        if (r.is_hidden) s.hidden++;
      });
      Object.entries(byBiz).forEach(([bid, s]) => {
        if (s.total > 0 && s.hidden === s.total) reviewsDisabled.add(bid);
      });
      const fmtHours = (oh: any, is24: boolean | null, show: boolean | null): string | undefined => {
        if (show === false) return undefined;
        if (is24) return "Ouvert 24h/24";
        if (!oh || typeof oh !== "object") return undefined;
        const days = ["mon","tue","wed","thu","fri","sat","sun"];
        const labels: Record<string,string> = { mon:"Lun", tue:"Mar", wed:"Mer", thu:"Jeu", fri:"Ven", sat:"Sam", sun:"Dim" };
        const out: string[] = [];
        for (const d of days) {
          const e: any = (oh as any)[d];
          if (!e) continue;
          if (e.closed) out.push(`${labels[d]}: fermé`);
          else if (e.continuous) out.push(`${labels[d]}: 24h`);
          else if (e.open && e.close) out.push(`${labels[d]}: ${e.open}-${e.close}`);
        }
        return out.length ? out.join(", ") : undefined;
      };
      const fmtPrice = (r: any): string | undefined => {
        if (r.min_price) return `Prix minimum constaté en réservation directe : ${Math.round(Number(r.min_price))} €`;
        if (r.manual_price_range) return String(r.manual_price_range);
        if (r.avg_price_range) return String(r.avg_price_range);
        return undefined;
      };
      const fmtRatings = (r: any): string | undefined => {
        const sources: [string, any, any][] = [
          ["Google", r.google_rating, r.google_review_count],
          ["TripAdvisor", r.tripadvisor_rating, r.tripadvisor_review_count],
          ["RestaurantGuru", r.restaurant_guru_rating, r.restaurant_guru_review_count],
          ["Trustpilot", r.trustpilot_rating, r.trustpilot_review_count],
          ["GetYourGuide", r.getyourguide_rating, r.getyourguide_review_count],
          ["Viator", r.viator_rating, r.viator_review_count],
          ["AvisVérifiés", r.avis_verifies_rating, r.avis_verifies_review_count],
          ["TourRadar", r.tourradar_rating, r.tourradar_review_count],
        ];
        const parts = sources
          .filter(([, rat]) => rat != null)
          .map(([name, rat, cnt]) => `${name} ${rat}/5${cnt ? ` (${cnt})` : ""}`);
        return parts.length ? parts.join(", ") : undefined;
      };
      (bizRows.data || []).forEach((r: any) => {
        const e = enrichment[r.id] = enrichment[r.id] || {};
        e.services = Array.isArray(r.services) ? r.services.filter(Boolean) : [];
        e.engagements = Array.isArray(r.engagements) ? r.engagements.filter(Boolean) : [];
        if (r.description) e.description = String(r.description).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 400);
        if (r.ai_review_summary) e.ai_review_summary = String(r.ai_review_summary).slice(0, 400);
        const hours = fmtHours(r.opening_hours, r.is_open_24h, r.show_opening_hours);
        if (hours) e.opening_hours = hours;
        const price = fmtPrice(r);
        if (price) e.price = price;
        if (Array.isArray(r.images)) e.images_count = r.images.filter(Boolean).length;
        const ratings = fmtRatings(r);
        if (ratings) e.ratings = ratings;
      });
      (badgeLinks.data || []).forEach((r: any) => {
        const name = r.badges?.name_fr;
        if (!name) return;
        enrichment[r.business_id] = enrichment[r.business_id] || {};
        (enrichment[r.business_id].badges = enrichment[r.business_id].badges || []).push(name);
      });
      (videoRows.data || []).forEach((r: any) => {
        const names = (r.business_youtube_video_badges || []).map((x: any) => x.badges?.name_fr).filter(Boolean);
        if (names.length === 0) return;
        enrichment[r.business_id] = enrichment[r.business_id] || {};
        const arr = (enrichment[r.business_id].video_badges = enrichment[r.business_id].video_badges || []);
        names.forEach((n: string) => { if (!arr.includes(n)) arr.push(n); });
      });
      const pushVideo = (bid: string, label: string) => {
        const t = (label || "").toString().replace(/\s+/g, " ").trim();
        if (!t) return;
        enrichment[bid] = enrichment[bid] || {};
        const arr = (enrichment[bid].videos = enrichment[bid].videos || []);
        const snippet = t.length > 160 ? t.slice(0, 160) + "…" : t;
        if (arr.length < 12 && !arr.includes(snippet)) arr.push(snippet);
      };
      (ytTitleRows?.data || []).forEach((r: any) => pushVideo(r.business_id, r.title));
      (genericVideoRows?.data || []).forEach((r: any) => {
        const g = r.generic_videos;
        if (!g) return;
        const label = [g.title || g.name, g.description].filter(Boolean).join(" — ");
        pushVideo(r.business_id, label);
      });
      (menuRows?.data || []).forEach((r: any) => {
        const parts = [r.title, r.content, r.price_details].filter(Boolean).map((s: any) => String(s).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
        const t = parts.join(" — ").trim();
        if (!t) return;
        enrichment[r.business_id] = enrichment[r.business_id] || {};
        const arr = (enrichment[r.business_id].menus = enrichment[r.business_id].menus || []);
        const snippet = t.length > 400 ? t.slice(0, 400) + "…" : t;
        if (arr.length < 6) arr.push(snippet);
      });
      // Blog posts mentioning the business name
      const bizNames = (effectiveBusinesses as any[])
        .filter((b: any) => b.id && businessIds.includes(b.id) && b.name && b.name.length >= 4)
        .map((b: any) => ({ id: b.id, name: b.name }));
      if (bizNames.length > 0) {
        const orFilters = bizNames
          .map((b) => {
            const esc = b.name.replace(/[%,()]/g, " ").trim();
            return `title_fr.ilike.%${esc}%,content_fr.ilike.%${esc}%`;
          })
          .join(",");
        const { data: blogRows } = await sb
          .from("blog_posts")
          .select("title_fr, excerpt_fr, content_fr")
          .eq("is_published", true)
          .or(orFilters)
          .limit(20);
        (blogRows || []).forEach((p: any) => {
          const hay = `${p.title_fr || ""} ${p.content_fr || ""}`.toLowerCase();
          bizNames.forEach((b) => {
            if (!hay.includes(b.name.toLowerCase())) return;
            const excerpt = (p.excerpt_fr || p.content_fr || "").toString().replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
            const snippet = excerpt.length > 220 ? excerpt.slice(0, 220) + "…" : excerpt;
            enrichment[b.id] = enrichment[b.id] || {};
            const arr = (enrichment[b.id].blog = enrichment[b.id].blog || []);
            if (arr.length < 4) arr.push(`"${p.title_fr}"${snippet ? ` — ${snippet}` : ""}`);
          });
        });
      }
      const pushReview = (r: any, cap: number) => {
        const txt = (r.text_fr || r.text || "").toString().replace(/\s+/g, " ").trim();
        if (!txt) return;
        enrichment[r.business_id] = enrichment[r.business_id] || {};
        const arr = (enrichment[r.business_id].reviews = enrichment[r.business_id].reviews || []);
        if (arr.length >= cap) return;
        const snippet = txt.length > 220 ? txt.slice(0, 220) + "…" : txt;
        arr.push(`${r.source || "source"}${r.rating != null ? ` ${r.rating}/5` : ""}: "${snippet}"`);
      };
      // Focused businesses first → fill up to 30 reviews each.
      if (focusedReviewRows?.data) {
        (focusedReviewRows.data as any[]).forEach((r) => pushReview(r, 30));
      }
      // Then the general pool → up to 6 reviews for non-focused businesses.
      (reviewRows.data || []).forEach((r: any) => {
        const cap = focusedIds.has(r.business_id) ? 30 : 6;
        pushReview(r, cap);
      });
    }

    // Contexte éditorial : TXT IA + titres/textes des popups d'images + offres.
    // Les notes de connaissances (knowledge_entries) sont internes/techniques → jamais injectées.
    let knowledgeContext = "";
    if (businessIds.length > 0) {
      const nameById: Record<string, string> = {};
      for (const b of effectiveBusinesses) if (b?.id) nameById[b.id] = b.name || "";
      const bundle = await loadEditorialBundle(sb, { businessIds, perBusiness: 5, limit: 12 });
      knowledgeContext = formatEditorialBundle(bundle, nameById);
      if (knowledgeContext) {
        const counts = (type: string) => bundle.items.filter((i: any) => i.type === type).length;
        console.log(
          `Editorial ctx for "${query}": ${counts("description")} desc, ${counts("hook")} hooks, ${counts("popup")} popups, ${counts("offer")} offres, ${counts("service")} services, ${counts("text")} TXT IA (${businessIds.length} businesses)`,
        );
      }
    }


    // Compute distance (km) from user to each business when geolocated.
    const distanceFromUser: Record<string, number> = {};
    if (hasUserCoords) {
      const toRad = (d: number) => (d * Math.PI) / 180;
      const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
        return 2 * R * Math.asin(Math.sqrt(a));
      };
      for (const b of effectiveBusinesses) {
        if (b?.id && typeof b.latitude === "number" && typeof b.longitude === "number") {
          distanceFromUser[b.id] = haversine(userCoords.lat, userCoords.lng, b.latitude, b.longitude);
        }
      }
    }

    // If a radius was specified and we have coords, filter the pool down to that radius.
    const distanceFilteredBusinesses = (geoIntent && hasUserCoords && maxDistanceKm !== null)
      ? effectiveBusinesses.filter((b: any) => {
          const d = b?.id ? distanceFromUser[b.id] : undefined;
          return typeof d === "number" && d <= (maxDistanceKm as number);
        })
      : effectiveBusinesses;

    // If a "near me" intent without explicit radius, sort by ascending distance.
    let renderBusinesses = (geoIntent && hasUserCoords)
      ? [...distanceFilteredBusinesses].sort((a: any, b: any) => {
          const da = a?.id ? distanceFromUser[a.id] : undefined;
          const db = b?.id ? distanceFromUser[b.id] : undefined;
          if (typeof da !== "number") return 1;
          if (typeof db !== "number") return -1;
          return da - db;
        })
      : effectiveBusinesses;

    let effectiveHasRenderResults = renderBusinesses.length > 0;

    const buildBusinessContext = (items: any[], hasItems: boolean) => hasItems
      ? items.map((b: any, i: number) => {
          const parts = [`${i + 1}. ${b.name}`];
          if (b.wtuce_status === "verified") parts.push(`[CONFIANCE]`);
          if (b.city) parts.push(`(${b.city}${b.neighborhood ? ` · ${b.neighborhood}` : ""})`);
          if (b.address) parts.push(`— Adresse: ${b.address}`);
          if (b.main_category) parts.push(`— ${b.main_category}`);
          if (b.hook_fr) parts.push(`— "${b.hook_fr}"`);
          if (b.categories?.length) parts.push(`— Sous-catégories: ${b.categories.join(", ")}`);
          const dist = b.id ? distanceFromUser[b.id] : undefined;
          if (typeof dist === "number") {
            const formatted = dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(dist < 10 ? 1 : 0)} km`;
            parts.push(`— Distance depuis l'utilisateur: ${formatted}`);
          }
          const enr = b.id ? enrichment[b.id] : undefined;
          if (enr?.description) parts.push(`— Description: ${enr.description}`);
          if (enr?.services?.length) parts.push(`— Services: ${enr.services.slice(0, 30).join(", ")}`);
          if (enr?.engagements?.length) parts.push(`— Engagements: ${enr.engagements.slice(0, 20).join(", ")}`);
          if (enr?.badges?.length) parts.push(`— Badges: ${enr.badges.slice(0, 15).join(", ")}`);
          if (enr?.video_badges?.length) parts.push(`— Badges vidéos: ${enr.video_badges.slice(0, 15).join(", ")}`);
          if (enr?.videos?.length) parts.push(`— Vidéos: ${enr.videos.join(" | ")}`);
          if (enr?.menus?.length) parts.push(`— Menus: ${enr.menus.join(" | ")}`);
          if (enr?.blog?.length) parts.push(`— Blog: ${enr.blog.join(" | ")}`);
          if (enr?.price) parts.push(`— Prix: ${enr.price}`);
          if (enr?.opening_hours) parts.push(`— Horaires: ${enr.opening_hours}`);
          if (enr?.images_count) parts.push(`— Photos: ${enr.images_count}`);
          if (enr?.ratings && !(b.id && reviewsDisabled.has(b.id))) parts.push(`— Notes: ${enr.ratings}`);
          if (enr?.ai_review_summary && !(b.id && reviewsDisabled.has(b.id))) parts.push(`— Résumé avis: ${enr.ai_review_summary}`);
          if (enr?.reviews?.length && !(b.id && reviewsDisabled.has(b.id))) parts.push(`— Avis clients: ${enr.reviews.join(" | ")}`);
          return parts.join(" ");
        }).join("\n")
      : (geoIntent && hasUserCoords && maxDistanceKm !== null
          ? `(Aucun établissement trouvé dans un rayon de ${maxDistanceKm < 1 ? Math.round(maxDistanceKm * 1000) + " m" : maxDistanceKm + " km"} autour de la position de l'utilisateur)`
          : "(Aucun établissement trouvé dans l'annuaire pour cette recherche)");
    let businessContext = buildBusinessContext(renderBusinesses, effectiveHasRenderResults);

    const langInstructions = language === "en"
      ? "WRITE YOUR ENTIRE ANSWER IN ENGLISH ONLY. Do not use any French words or phrases, even if the instructions and business data below are in French. Translate any French descriptive text into natural English."
      : language === "ar"
        ? "اكتب إجابتك بالكامل باللغة العربية فقط. لا تستخدم أي كلمات أو عبارات فرنسية، حتى لو كانت التعليمات وبيانات الأنشطة أدناه بالفرنسية. ترجم أي نص وصفي فرنسي إلى العربية الطبيعية."
        : "Réponds en français.";


    // noResultsInstructions est désormais inliné directement dans le prompt
    // pour pouvoir s'appuyer sur effectiveHasRenderResults (post-filtre proximité).

    // Build mode-specific prompt overrides for POI / Destinations tabs
    const modeInstructions = mode === "poi"
      ? `\n- MODE LIEUX D'INTÉRÊT : Présente les lieux d'intérêt (POI) fournis de façon vivante et enthousiaste. Décris chaque lieu en quelques mots (ambiance, histoire, ce qu'on peut y voir/faire). Cite jusqu'à 10 lieux par leur nom exact entouré de **doubles astérisques**.`
      : mode === "destinations"
      ? `\n- MODE DESTINATIONS : Présente les destinations fournies de façon inspirante et détaillée. Pour chaque destination, décris brièvement ce qui la rend unique (paysages, activités, culture). Cite jusqu'à 10 destinations par leur nom exact entouré de **doubles astérisques**.`
      : '';

    // Detect if the user is asking about opening hours / time availability
    // (across current query + recent history) → instruct the model to surface
    // each cited business's hours explicitly.
    const hoursHaystack = [
      query,
      ...(Array.isArray(history)
        ? history
            .filter((m: any) => m && typeof m.content === "string")
            .slice(-6)
            .map((m: any) => m.content)
        : []),
    ].join(" \n ").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const HOURS_RE = /\b(ouvert|ouverts?|ouverte?s?|ferme|fermes?|fermee?s?|fermeture|ouverture|horaires?|heures?|tard|tot|matin|midi|apres[- ]?midi|soir|soiree|nuit|minuit|aube|tot le matin|tard le soir|24\s*\/?\s*24|24h|non[- ]?stop|dimanche|lundi|mardi|mercredi|jeudi|vendredi|samedi|week[- ]?end|jour ferie|jours feries|open|opens|opened|closing|closes|hours?|late|early|night|midnight|morning|evening|noon|afternoon|weekend|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/;
    const focusHours = HOURS_RE.test(hoursHaystack);
    const hoursInstruction = focusHours && effectiveHasRenderResults && !mode
      ? `\n- FOCUS HORAIRES : La demande porte sur les horaires / la disponibilité (créneau, ouvert tard, tôt, week-end, nuit, etc.). Pour CHAQUE établissement cité, indique EXPLICITEMENT ses horaires (en gras avec **) tels que fournis dans le champ "Horaires", et mets clairement en avant ceux qui correspondent au créneau demandé. Si les horaires d'un établissement ne couvrent pas le créneau demandé, ne le cite pas. Si aucun établissement ne correspond, dis-le honnêtement.`
      : '';

    const geoInstruction = geoIntent && hasUserCoords && effectiveHasRenderResults && !mode
      ? `\n- FOCUS PROXIMITÉ : L'utilisateur recherche par rapport à SA position (géolocalisée). La liste fournie est déjà triée par distance croissante depuis l'utilisateur et chaque établissement indique son champ "Distance depuis l'utilisateur". ${maxDistanceKm !== null ? `Cite UNIQUEMENT les établissements situés dans un rayon de ${maxDistanceKm < 1 ? Math.round(maxDistanceKm * 1000) + " m" : maxDistanceKm + " km"} (déjà filtrés dans la liste).` : `Privilégie clairement les plus proches.`} Pour CHAQUE établissement cité, indique la distance en gras (ex. **à 850 m**, **à 2,3 km**) après son nom. Si aucun établissement n'est suffisamment proche, dis-le honnêtement et propose d'élargir le rayon.`
      : (geoIntent && hasUserCoords && !effectiveHasRenderResults && !mode
        ? `\n- AUCUN RÉSULTAT À PROXIMITÉ : ${maxDistanceKm !== null ? `Aucun établissement dans un rayon de ${maxDistanceKm < 1 ? Math.round(maxDistanceKm * 1000) + " m" : maxDistanceKm + " km"} autour de la position de l'utilisateur.` : "Aucun établissement proche de la position de l'utilisateur."} Dis-le clairement et propose d'élargir la zone de recherche.`
        : '');

    // ============================================================
    // HOTEL AVAILABILITY (SerpAPI Google Hotels)
    // Detect a date range + adults in the query/history. If present and the
    // current pool contains lodging businesses, call serpapi-hotels for the
    // detected city, match returned properties to our businesses via
    // hotel_mappings (serp_hotel_name + city → business_id), and inject the
    // availability/price block into the prompt with a strict filter.
    // ============================================================
    let hotelAvailabilityInstruction = "";
    let hotelAvailabilityBlock = "";
    let hotelAvailabilityBusinesses: any[] = [];
    try {
      const availHaystack = [
        query,
        ...(Array.isArray(history)
          ? history.filter((m: any) => m && typeof m.content === "string").slice(-4).map((m: any) => m.content)
          : []),
      ].join(" \n ");
      const availNorm = availHaystack.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      const MONTHS_FR: Record<string, number> = {
        janvier: 1, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6,
        juillet: 7, aout: 8, septembre: 9, octobre: 10, novembre: 11, decembre: 12,
        january: 1, february: 2, march: 3, april: 4, june: 6, july: 7,
        august: 8, september: 9, october: 10, november: 11, december: 12,
      };
      const monthAlt = Object.keys(MONTHS_FR).join("|");

      // Patterns:
      //  - "du 20 au 25 juillet" / "du 20 au 25 juillet 2026"
      //  - "du 20 juillet au 25 juillet"
      //  - "du 30 juillet au 5 aout"
      //  - "20-25 juillet"
      //  - "from july 20 to july 25" → harder, skip — covered by "20 to 25 july"
      let checkIn: string | null = null;
      let checkOut: string | null = null;
      const today = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const buildISO = (d: number, m: number, y?: number) => {
        let year = y ?? today.getFullYear();
        const candidate = new Date(`${year}-${pad(m)}-${pad(d)}T00:00:00Z`);
        if (!y && candidate.getTime() < today.getTime() - 86400000) year += 1;
        return `${year}-${pad(m)}-${pad(d)}`;
      };

      // 1. "du D1 au D2 MONTH (YEAR)?" — same month
      let m: RegExpMatchArray | null = null;
      m = availNorm.match(new RegExp(`du\\s+(\\d{1,2})\\s+au\\s+(\\d{1,2})\\s+(${monthAlt})(?:\\s+(\\d{4}))?`));
      if (m) {
        const d1 = parseInt(m[1], 10), d2 = parseInt(m[2], 10);
        const mo = MONTHS_FR[m[3]];
        const y = m[4] ? parseInt(m[4], 10) : undefined;
        checkIn = buildISO(d1, mo, y);
        checkOut = buildISO(d2, mo, y);
      }
      // 2. "du D1 MONTH1 au D2 MONTH2 (YEAR)?"
      if (!checkIn) {
        m = availNorm.match(new RegExp(`du\\s+(\\d{1,2})\\s+(${monthAlt})\\s+au\\s+(\\d{1,2})\\s+(${monthAlt})(?:\\s+(\\d{4}))?`));
        if (m) {
          const d1 = parseInt(m[1], 10), mo1 = MONTHS_FR[m[2]];
          const d2 = parseInt(m[3], 10), mo2 = MONTHS_FR[m[4]];
          const y = m[5] ? parseInt(m[5], 10) : undefined;
          checkIn = buildISO(d1, mo1, y);
          checkOut = buildISO(d2, mo2, y);
        }
      }
      // 3. "D1-D2 MONTH" or "D1 au D2 MONTH" without "du"
      if (!checkIn) {
        m = availNorm.match(new RegExp(`(\\d{1,2})\\s*(?:-|au|to)\\s*(\\d{1,2})\\s+(${monthAlt})(?:\\s+(\\d{4}))?`));
        if (m) {
          const d1 = parseInt(m[1], 10), d2 = parseInt(m[2], 10);
          const mo = MONTHS_FR[m[3]];
          const y = m[4] ? parseInt(m[4], 10) : undefined;
          checkIn = buildISO(d1, mo, y);
          checkOut = buildISO(d2, mo, y);
        }
      }
      // 4. ISO-ish "YYYY-MM-DD au YYYY-MM-DD" or "DD/MM(/YYYY)? au DD/MM(/YYYY)?"
      if (!checkIn) {
        m = availNorm.match(/(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\s*(?:au|-|to|->)\s*(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?/);
        if (m) {
          const d1 = parseInt(m[1], 10), mo1 = parseInt(m[2], 10);
          const y1 = m[3] ? parseInt(m[3].length === 2 ? `20${m[3]}` : m[3], 10) : undefined;
          const d2 = parseInt(m[4], 10), mo2 = parseInt(m[5], 10);
          const y2 = m[6] ? parseInt(m[6].length === 2 ? `20${m[6]}` : m[6], 10) : y1;
          checkIn = buildISO(d1, mo1, y1);
          checkOut = buildISO(d2, mo2, y2);
        }
      }

      // adults
      let adults = 2;
      const adultsMatch = availNorm.match(/(\d+)\s*(adultes?|adults?|personnes?|people|pax|voyageurs?|guests?)/);
      if (adultsMatch) adults = Math.max(1, Math.min(10, parseInt(adultsMatch[1], 10)));

      // Detect lodging intent: either query mentions lodging keywords OR
      // at least one cited business is a lodging.
      const LODGING_RE = /\b(hotel|hôtel|riad|riads|hebergement|hébergement|auberge|maison\s*d'?hote|guesthouse|lodge|villa|appart|camping|bivouac|ecolodge|écolodge)\b/i;
      const lodgingInQuery = LODGING_RE.test(query) || LODGING_RE.test(availHaystack);
      const lodgingBusinesses = (effectiveBusinesses as any[]).filter((b) => {
        const hay = `${b.main_category || ""} ${(b.categories || []).join(" ")}`.toLowerCase();
        return /hebergement|hébergement|hotel|hôtel|riad|villa|appartement|camping|bivouac|ecolodge|écolodge/.test(hay);
      });
      const hasLodgingContext = lodgingInQuery || lodgingBusinesses.length >= 3;

      if (checkIn && checkOut && hasLodgingContext) {
        // Most common city among (lodging) businesses, fallback to defaultCity
        const cityCounts: Record<string, number> = {};
        (lodgingBusinesses.length ? lodgingBusinesses : effectiveBusinesses).forEach((b: any) => {
          if (b?.city) cityCounts[b.city] = (cityCounts[b.city] || 0) + 1;
        });
        const cityName = Object.entries(cityCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || defaultCity;

        console.log(`Hotel availability intent: ${cityName} ${checkIn}→${checkOut} adults=${adults}`);

        // Load SerpAPI name → business mappings for this city
        const { data: mappingRows } = await sb
          .from("hotel_mappings")
          .select("serp_hotel_name, business_id, city")
          .ilike("city", cityName);
        const allMappings = (mappingRows || []) as any[];
        const optimalMaxPages = Math.max(1, Math.ceil(allMappings.length / 20));

        const normalize = (s: string) => s.toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, " ").trim();

        const serpNameToBiz = new Map<string, string>();
        allMappings.forEach((r: any) => {
          if (r.serp_hotel_name && r.business_id) serpNameToBiz.set(normalize(r.serp_hotel_name), r.business_id);
        });

        type AvailRow = { id: string; name: string; price?: string; rating?: number; reviews?: number; business?: any };
        const matched: AvailRow[] = [];

        const { data: serpData, error: serpErr } = await sb.functions.invoke("serpapi-hotels", {
          body: {
            cityName,
            checkIn,
            checkOut,
            adults,
            currency: "EUR",
            language: "fr",
            country: "ma",
            maxPages: optimalMaxPages,
          },
        });

        if (serpErr) {
          console.error("serpapi-hotels invoke error:", serpErr);
        } else {
          const hotels = (serpData?.data || []) as any[];
          const matchedByBusinessId = new Map<string, any>();
          hotels.forEach((h: any) => {
            const key = normalize(String(h.name || ""));
            if (!key) return;
            const bizId = serpNameToBiz.get(key);
            if (!bizId) return;
            if (!matchedByBusinessId.has(bizId)) matchedByBusinessId.set(bizId, h);
          });

          const matchedBizIds = Array.from(matchedByBusinessId.keys());
          if (matchedBizIds.length > 0) {
            const { data: matchedBusinesses } = await sb
              .from("businesses")
              .select("id, name, city, main_category, categories, hook_fr, wtuce_status, images, logo_url, neighborhood, address, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, restaurant_guru_rating, restaurant_guru_review_count, latitude, longitude")
              .in("id", matchedBizIds)
              .eq("is_active", true)
              .eq("main_category", "Hôtellerie");

            (matchedBusinesses || []).forEach((biz: any) => {
              const h = matchedByBusinessId.get(biz.id);
              if (!h || !biz?.name) return;
              if (matched.some((x) => x.name === biz.name)) return;
              const amt = h.ratePerNight?.amount;
              const cur = h.ratePerNight?.currency || "EUR";
              const formattedCur = cur === "EUR" ? "€" : cur;
              const price = amt ? `${amt} ${formattedCur}/nuit` : undefined;
              matched.push({ id: biz.id, name: biz.name, price, rating: h.overallRating, reviews: h.reviewCount, business: biz });
            });
          }
        }

        if (matched.length > 0) {
          hotelAvailabilityBlock = `\n\nDISPONIBILITÉ HÔTELS (SerpAPI Google Hotels — ${cityName}, ${checkIn} → ${checkOut}, ${adults} adulte${adults > 1 ? "s" : ""}) :\n` +
            matched.map((r) => `- ${r.name}${r.price ? ` — ${r.price}` : ""}${r.rating ? ` — ${r.rating}/5${r.reviews ? ` (${r.reviews} avis)` : ""}` : ""}`).join("\n");
          hotelAvailabilityInstruction = `\n- DISPONIBILITÉ HÔTELS (RÈGLE STRICTE) : L'utilisateur demande des hôtels disponibles du ${checkIn} au ${checkOut} pour ${adults} adulte${adults > 1 ? "s" : ""}. Cite OBLIGATOIREMENT TOUS les ${matched.length} hôtels listés dans la section "DISPONIBILITÉ HÔTELS" ci-dessous (sans exception, ne fais pas de sélection). FORMAT IMPÉRATIF : rédige en PROSE FLUIDE, en séparant chaque hôtel ou paragraphe par un DOUBLE saut de ligne (saut de paragraphe) pour une excellente lisibilité. Lie les paragraphes par des connecteurs naturels ("par ailleurs", "à proximité", "dans un autre style", etc.). INTERDICTION ABSOLUE d'utiliser une liste à puces (pas de "-", pas de "*" en début de ligne) ou une liste numérotée (pas de "1.", "2.", "3."). Pour CHAQUE hôtel cité, entoure OBLIGATOIREMENT son nom exact de doubles astérisques (ex. **Riad XYZ**) — c'est indispensable pour que la vignette et le marqueur s'affichent. Indique aussi son prix par nuit en gras précédé de "à partir de" (ex. à partir de **120 €/nuit**). Termine obligatoirement ton introduction d'accroche par un caractère deux-points (":") juste avant le premier double saut de ligne (ex: "Voici les hôtels disponibles du... : \n\n"). Ajoute obligatoirement un double saut de ligne (saut de paragraphe) après le dernier établissement décrit et avant d'écrire ta phrase de conclusion généraliste (du type "N'hésitez pas à me solliciter..."). INTERDICTION ABSOLUE de mentionner, recommander ou citer d'autres établissements (hôtels, riads, restaurants, lieux à visiter, pépites architecturales, musées, etc.) — ils n'ont pas de disponibilité confirmée et ne sont PAS pertinents pour cette demande. Pas de section "en complément", pas de "à découvrir aussi", pas de suggestions annexes.`;
          effectiveBusinesses = (effectiveBusinesses as any[]).filter((b: any) => matched.some((m) => m.id === b.id));
          renderBusinesses = (renderBusinesses as any[]).filter((b: any) => matched.some((m) => m.id === b.id));
          effectiveHasRenderResults = effectiveBusinesses.length > 0;
          businessContext = buildBusinessContext(renderBusinesses, effectiveHasRenderResults);
          hotelAvailabilityBusinesses = matched.map((m) => m.business).filter(Boolean);
        } else {
          hotelAvailabilityInstruction = `\n- DISPONIBILITÉ HÔTELS : Aucun hôtel de l'annuaire n'a de disponibilité confirmée du ${checkIn} au ${checkOut} pour ${adults} adulte${adults > 1 ? "s" : ""}. Dis-le clairement et propose d'élargir les dates ou de vérifier directement sur les fiches. NE cite AUCUN autre établissement (restaurants, lieux à visiter, etc.) en complément — la question porte uniquement sur la disponibilité hôtelière.`;
        }


      }
    } catch (e) {
      console.error("Hotel availability block failed:", e);
    }


    const languageHeader = language === "en"
      ? "OUTPUT LANGUAGE: ENGLISH. The entire answer must be written in English, regardless of the language used in the instructions or business data below.\n\n"
      : language === "ar"
        ? "لغة الإخراج: العربية. يجب كتابة الإجابة بأكملها باللغة العربية، بغض النظر عن اللغة المستخدمة في التعليمات أو بيانات الأنشطة أدناه.\n\n"
        : "";

    const systemPrompt = `${languageHeader}${persona}

RÈGLES :
- ${langInstructions}

- ${effectiveHasRenderResults ? "Réponds avec une accroche courte puis un paragraphe distinct par établissement cité. Ne te limite pas artificiellement à 5-8 phrases quand plusieurs adresses nécessitent chacune une vraie description." : `Réponds en ${responseLength} phrases, de façon détaillée, chaleureuse et enthousiaste.`}
- Utilise des émojis pertinents pour rendre la réponse vivante (🍽️ 🐟 🌊 ⭐ 🏨 ☕ 🎶 🌅 📍 👨‍🍳 💎 🔥 etc.).${modeInstructions || (effectiveHasRenderResults ? `
- Base-toi UNIQUEMENT sur les établissements fournis ci-dessous. Ne mentionne JAMAIS d'établissement qui n'est pas dans la liste.
- Cite OBLIGATOIREMENT au moins 3 établissements de la liste par leur nom exact si la liste en contient 3 ou plus. Ne dis JAMAIS que tu n'as pas d'établissement spécifique ou que l'annuaire est vide quand cette liste est fournie.
- Cite 3 à 6 établissements maximum de la liste par leur nom exact, en expliquant pourquoi ils correspondent à la recherche (ambiance, spécialités, vue, etc.). Si la liste en contient davantage, privilégie les plus pertinents plutôt que de tout citer sans description.
- CRITIQUE : Écris chaque nom EXACTEMENT comme dans la liste fournie, caractère pour caractère (mêmes accents, majuscules, ponctuation). N'ajoute JAMAIS de suffixe, de ville, de quartier, de parenthèses, de tiret descriptif, ni d'article ("Le", "La", "Restaurant", etc.) qui ne figure pas dans le nom original. Pas de reformulation, pas de traduction du nom.
- Ne mentionne JAMAIS de note, score ou classement chiffré (pas de "/20", "/10", "étoiles", etc.).` : '')}${boostVerified && effectiveHasRenderResults && !mode ? `\n- Les établissements marqués [CONFIANCE] sont des adresses de confiance. Privilégie-les dans ta réponse mais ne mentionne JAMAIS le mot "vérifié", "confiance", "[CONFIANCE]" ou tout badge similaire dans ta réponse.` : ''}${!mode && !effectiveHasRenderResults ? `\n- ${noResultsCfg || "Utilise tes connaissances générales sur le Maroc pour donner des conseils utiles."}
- IMPORTANT : Ne cite AUCUN nom d'établissement spécifique. Tu ne connais pas notre annuaire, donc n'invente pas de noms. Donne uniquement des conseils généraux sur la thématique ou la destination.
- VILLE PAR DÉFAUT : La recherche concerne ${defaultCity}. Ne suggère JAMAIS à l'utilisateur de chercher dans une autre ville (ni Fès, ni Casablanca, ni Rabat, ni aucune autre). Ne propose JAMAIS de "préciser une ville" ou de "choisir une ville comme Marrakech ou Fès" — la ville est déjà ${defaultCity}. Concentre toute ta réponse exclusivement sur ${defaultCity}.
- Propose à l'utilisateur d'affiner sa recherche avec d'autres mots-clés (quartier, type de cuisine, ambiance, budget…), mais TOUJOURS dans ${defaultCity}.` : (!mode ? `\n- Si la liste contient peu de résultats (1-2), complète ta réponse avec des conseils généraux sur la destination/thématique pour enrichir l'expérience.` : '')}
- Si la liste ne semble pas correspondre à la question, dis-le honnêtement.
- PRIX — RÈGLE STRICTE : N'invente JAMAIS de tarifs, fourchettes de prix ou "entre X et Y €". Utilise UNIQUEMENT le champ "— Prix:" fourni dans les données de l'établissement. Si ce champ existe et commence par "Prix minimum constaté en réservation directe :", cite-le TEL QUEL (mets le montant en gras, ex. "Prix minimum constaté en réservation directe : **200 €**"). Si aucun "— Prix:" n'est fourni pour un établissement, ne mentionne AUCUN tarif pour lui.
- Entoure chaque nom de doubles astérisques, par exemple **Nom**.
- FORMATAGE STRICT : Rédige UNIQUEMENT en prose fluide, avec des sauts de paragraphe (\\n\\n) entre chaque établissement. INTERDICTION ABSOLUE d'utiliser des listes à puces ("- ", "* ", "• ") ou numérotées ("1.", "2.") en début de ligne. INTERDICTION ABSOLUE d'utiliser l'italique simple (*texte*) — n'utilise QUE le gras avec doubles astérisques (**texte**) et uniquement pour les noms d'établissements, prix, distances ou horaires. Pas de titres (#). Pour CHAQUE établissement cité, commence un nouveau paragraphe par son nom en gras puis donne une description immersive et sensorielle complète (2-3 phrases : ambiance, spécialités, ce qui le rend unique, vue/cadre, expérience vécue) avant de passer au suivant. Ne regroupe JAMAIS deux établissements dans la même phrase ou le même paragraphe.
- Commence par une phrase d'accroche engageante liée à la recherche, puis laisse DEUX lignes vides avant de continuer avec les recommandations.
- ${tone}
- Commence par une accroche engageante liée à la recherche de l'utilisateur.${geoInstruction}${hoursInstruction}${hotelAvailabilityInstruction}${extraInstructions ? `\n- ${extraInstructions}` : ''}${spokenText ? `\n- CONTEXTE IMPORTANT : L'utilisateur a dit textuellement : "${spokenText}". Utilise ce contexte pour mieux comprendre son intention réelle et ne recommande QUE les établissements qui correspondent à cette intention. Si certains établissements de la liste ne correspondent pas au contexte (mauvaise ville, mauvais type), ignore-les.` : ''}${vary ? `\n- IMPORTANT : L'utilisateur demande une suggestion DIFFÉRENTE (tentative #${vary}). Change l'angle d'approche, l'ordre de présentation, le style d'accroche et mets en avant des établissements différents ou des aspects différents. Sois créatif et surprenant.` : ''}${isRefinement && topicChange ? `\n- CHANGEMENT DE SUJET DÉTECTÉ : La nouvelle question de l'utilisateur porte sur un lieu ou un sujet qui n'est PAS représenté dans la liste d'établissements fournie. N'essaie PAS de piocher un établissement de la liste pour répondre. Réponds librement en t'appuyant sur tes connaissances générales du Maroc (paysages, activités, culture, conseils pratiques). Ne cite AUCUN nom d'établissement de la liste — ils ne sont pas pertinents pour cette question. Invite l'utilisateur à lancer une nouvelle recherche s'il souhaite des adresses concrètes sur ce sujet.` : isRefinement ? `\n- AFFINEMENT : L'utilisateur précise sa recherche initiale avec un nouveau critère. Filtre STRICTEMENT la liste fournie pour ne citer QUE les établissements qui correspondent réellement à ce critère. Analyse TOUS les champs disponibles pour chaque établissement : nom, ville, quartier, adresse, sous-catégories, hook, Services, Engagements (RSE/certifications), Badges (badges de l'établissement) et Badges vidéos (thématiques des vidéos liées). Si le critère est un lieu (quartier, route, rue, avenue, secteur…), considère qu'un établissement correspond dès que ce lieu apparaît dans son adresse OU son quartier. Cite TOUS les établissements pertinents de la liste (jusqu'à 10), pas seulement 2 ou 3 — la liste fournie peut contenir jusqu'à 60 candidats. N'hésite PAS à re-citer un établissement déjà mentionné précédemment s'il correspond au nouveau critère — la pertinence prime sur la nouveauté. Si AUCUN établissement de la liste ne correspond clairement au critère, dis-le honnêtement plutôt que d'en citer qui ne correspondent pas. Ne cite jamais un établissement uniquement parce qu'il n'a pas encore été mentionné.` : ''}${hotelAvailabilityBlock}

${mode === "poi" ? "LIEUX D'INTÉRÊT" : mode === "destinations" ? "DESTINATIONS" : "ÉTABLISSEMENTS TROUVÉS"} :
${businessContext}${knowledgeContext ? `

CONTEXTE ÉDITORIAL DES ÉTABLISSEMENTS ([TXT IA] textes rédigés par l'établissement/affilié, [IMAGE POPUP] titres et textes des photos, [OFFRE] offres et promotions ; intègre-les naturellement pour enrichir la description, ne mets pas en avant un établissement uniquement parce qu'il a du contenu ici) :
${knowledgeContext}` : ''}${
  nearbyContext && Array.isArray(nearbyContext.items) && nearbyContext.items.length > 0 ? `

CONTEXTE PROXIMITÉ — INSTRUCTION SPÉCIALE :
L'utilisateur a affiné sa recherche en demandant "${nearbyContext.entity}" À PROXIMITÉ des résultats précédents${
    Array.isArray(nearbyContext.anchorNames) && nearbyContext.anchorNames.length > 0
      ? ` (${nearbyContext.anchorNames.slice(0, 6).join(", ")})`
      : ""
  }.
Voici les "${nearbyContext.entity}" trouvés à moins de 5 km de ces résultats, déjà inclus dans la liste ÉTABLISSEMENTS TROUVÉS ci-dessus : ${
    nearbyContext.items.map((i: any) => `**${i.name}**${i.city ? ` (${i.city})` : ""}`).join(", ")
  }.
Cite OBLIGATOIREMENT chacun de ces "${nearbyContext.entity}" par son nom exact entre **doubles astérisques**, en précisant brièvement leur proximité avec les résultats précédents. Tu peux aussi rappeler 1 à 2 des résultats précédents pertinents pour faire le lien. NE filtre PAS la liste ; ces établissements correspondent au critère par construction (proximité géographique vérifiée).` : ''
}`;

    const effectiveTemperature = vary ? Math.min(temperature + 0.3, 1.5) : temperature;

    // Les modèles GPT-5 refusent `max_tokens` et toute `temperature` non par défaut.
    // On adapte le corps de requête au modèle sélectionné (cf. politique modèle projet).
    const isGpt5 = model.startsWith("openai/gpt-5");
    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...(Array.isArray(history)
        ? history
            .filter((m: any) => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant"))
            .slice(-10)
            .map((m: any) => ({ role: m.role, content: m.content }))
        : []),
      { role: "user", content: query },
    ];

    const response = await fetchAiGateway("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        isGpt5
          ? {
              model,
              messages: chatMessages,
              max_completion_tokens: maxTokens,
              reasoning_effort: "none",
            }
          : {
              model,
              messages: chatMessages,
              max_tokens: maxTokens,
              temperature: effectiveTemperature,
            },
      ),
    }, {
      supabase: sb,
      userId: callerContext.userId,
      affiliateId: callerContext.affiliateId,
      context: "ai-search-answer",
      model,
      metadata: { is_complex: isComplex, has_businesses: effectiveBusinesses.length },
    });

    if (!response.ok) {
      if (response.status === 429) {
        await logSearchTurn({ user_message: String(query || ""), route_taken: engineRouteCode, ai_class: engineClass, classifier_confidence: engineConfidence, chat_id: chatId, city_detected: engineCityDetected, model, fallback_reason: "route_failed", had_error: true, error_message: "rate_limited", language, results_count: effectiveBusinesses.length, latency_ms_total: Date.now() - t0, user_id: callerContext.userId, affiliate_id: callerContext.affiliateId }, sb);
        return new Response(JSON.stringify({ error: "Rate limit exceeded", answer: "" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        await logSearchTurn({ user_message: String(query || ""), route_taken: engineRouteCode, ai_class: engineClass, classifier_confidence: engineConfidence, chat_id: chatId, city_detected: engineCityDetected, model, fallback_reason: "route_failed", had_error: true, error_message: "payment_required", language, results_count: effectiveBusinesses.length, latency_ms_total: Date.now() - t0, user_id: callerContext.userId, affiliate_id: callerContext.affiliateId }, sb);
        return new Response(JSON.stringify({ error: "Payment required", answer: "" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error(`AI gateway error [${response.status}]:`, errorText);
      await logSearchTurn({ user_message: String(query || ""), route_taken: engineRouteCode, ai_class: engineClass, classifier_confidence: engineConfidence, chat_id: chatId, city_detected: engineCityDetected, model, fallback_reason: "route_failed", had_error: true, error_message: `gateway_${response.status}`, language, results_count: effectiveBusinesses.length, latency_ms_total: Date.now() - t0, user_id: callerContext.userId, affiliate_id: callerContext.affiliateId }, sb);
      return new Response(JSON.stringify({ answer: "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const rawAnswer = data.choices?.[0]?.message?.content?.trim() ?? "";

    // Hard cleanup: never expose verification badges/wording or leaked prompt instructions
    const answer = rawAnswer
      .replace(/[^.!?\n]*✅\s*V[ée]rifi[ée]s?[^.!?\n]*[.!?]?/gi, "")
      .replace(/[^.!?\n]*\bV[ée]rifi[ée]s?\b[^.!?\n]*[.!?]?/gi, "")
      .replace(/\[\s*CONFIANCE\s*\]/gi, "")
      // Remove leaked prompt/formatting instructions
      .replace(/N['']?utilise pas d['']autre formatage markdown[^.!?\n]*[.!?]?/gi, "")
      .replace(/[ÉE]cris en texte simple avec [ée]mojis\.?[\s✨]*/gi, "")
      .replace(/Pas de (titres?|listes? [àa] puces?|#)[^.!?\n]*[.!?]?/gi, "")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/[ \t]+([,.;!?])/g, "$1")
      .replace(/[ \t]*\n[ \t]*/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    console.log(`AI answer for "${query}": ${answer.substring(0, 100)}...`);

    await logSearchTurn({
      user_message: String(query || ""),
      route_taken: engineRouteCode,
      ai_class: engineClass,
      classifier_confidence: engineConfidence,
      chat_id: chatId,
      city_detected: engineCityDetected,
      model,
      fallback_reason: engineFallback ?? (answer ? null : "empty_response"),
      results_count: effectiveBusinesses.length,
      language,
      city_active: defaultCity,
      latency_ms_total: Date.now() - t0,
      tokens_in: (data?.usage?.prompt_tokens ?? 0) + engineTokensIn,
      tokens_out: (data?.usage?.completion_tokens ?? 0) + engineTokensOut,
      user_id: callerContext.userId,
      affiliate_id: callerContext.affiliateId,
    }, sb);


    return new Response(JSON.stringify({ answer, citedBusinesses: hotelAvailabilityBusinesses }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("AI search answer error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error", answer: "" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

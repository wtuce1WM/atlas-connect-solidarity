import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fetchAiGateway, resolveCallerContext } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
// Modèle "pro" pour précision et meilleur raisonnement multi-tools.
// Cost optimization: default to flash (≈6× cheaper than pro). Pro is only used as upgrade fallback for degeneracy.
const MODEL = "google/gemini-3-flash-preview";
const FALLBACK_MODEL = "google/gemini-3-flash-preview";

type Msg = { role: "system" | "user" | "assistant" | "tool"; content: string; tool_calls?: any[]; tool_call_id?: string; name?: string };

const tools = [
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "Météo d'une ville du Maroc : conditions actuelles, prévisions horaires (toutes les 3h sur 24h) et prévisions journalières sur 5 jours. Utilise les champs `hourly` et `daily` pour décrire l'évolution de la journée.",
      parameters: {
        type: "object",
        properties: { city: { type: "string", description: "Nom de la ville" } },
        required: ["city"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_businesses",
      description:
        "Recherche des établissements RÉELS dans la base One World Morocco. À utiliser systématiquement avant de citer un lieu. Combine nom, catégorie, ville, quartier, badges ET services. Les badges qualifient finement l'expérience (#Authentique, Rooftop, Famille, Gastronomique, Piscine, Spa, Beach Club, Vue sur mer, Démarche éco-responsable…) ; les services décrivent l'équipement/prestation (« Avec piscine », « Spa », « Hammam », « Restaurant », « Parking », « Wifi », « Climatisation »…). IMPORTANT : pour une intention comme « avec piscine », passe la valeur à la fois dans badges ET dans services — la fonction fait l'UNION et trouvera les établissements qui ont soit le badge soit le service correspondant. Si l'utilisateur exprime une intention (« authentique », « romantique », « pour enfants », « avec piscine », « avec spa »…), pense à remplir badges + services.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Mot-clé ou nom partiel (optionnel si category/badges/services fourni)" },
          category: { type: "string", description: "Catégorie principale: restaurant, hotel, spa, activité, bar, café, etc. (optionnel)" },
          city: { type: "string", description: "Ville (ex: Marrakech, Essaouira, Casablanca)" },
          neighborhood: { type: "string", description: "Quartier (ex: Gueliz, Médina, Hivernage)" },
          badges: {
            type: "array",
            items: { type: "string" },
            description: "Badges (name_fr, avec ou sans #) à matcher. Ex: ['#Authentique'], ['Rooftop','Vue sur mer'], ['Piscine']. Combiné en UNION avec `services`.",
          },
          services: {
            type: "array",
            items: { type: "string" },
            description: "Services / équipements à matcher (name_fr partiel). Ex: ['piscine'], ['spa','hammam'], ['restaurant']. Combiné en UNION avec `badges` : un établissement matche s'il porte au moins un badge OU un service de la liste.",
          },
          limit: { type: "number", description: "Nombre de résultats à retourner (max 30, défaut 12). Augmente jusqu'à 30 si le membre demande une carte ou une vue d'ensemble.", default: 12 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_business_details",
      description: "Détails complets d'un établissement par son slug : description, horaires, adresse, prix, contact. À utiliser quand l'utilisateur veut en savoir plus sur un lieu précis.",
      parameters: {
        type: "object",
        properties: { slug: { type: "string", description: "Slug exact retourné par search_businesses" } },
        required: ["slug"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_my_bookmarks",
      description: "Liste les établissements sauvegardés (bookmarks) de l'utilisateur connecté.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "list_my_saved_chats",
      description: "Liste les conversations IA précédentes sauvegardées par l'utilisateur (titre + date).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_my_taste_profile",
      description: "Renvoie un résumé des goûts du membre (catégories préférées, villes, quartiers, personas) déduit de ses bookmarks, likes vidéos, recherches.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "suggest_similar_to_my_bookmarks",
      description: "Suggère des établissements 1WM similaires aux bookmarks du membre, en croisant catégories/villes dominantes.",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "Restreindre à une ville (optionnel)" },
          limit: { type: "number", description: "Nombre max de suggestions (max 10)", default: 6 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Recherche web temps réel via Firecrawl + Google. À utiliser UNIQUEMENT pour des infos factuelles non présentes dans la base 1WM : pharmacies de garde, numéros d'urgence officiels, horaires d'événements publics, transports, démarches administratives, actualités. NE PAS utiliser pour recommander des établissements (utilise search_businesses). Retourne titres, snippets et URLs sources que tu DOIS citer.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Requête de recherche en langage naturel (ex: 'pharmacie de garde Marrakech aujourd'hui')" },
          limit: { type: "number", description: "Nombre de résultats (3-8, défaut 5)", default: 5 },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_events",
      description:
        "Recherche des ÉVÉNEMENTS / AGENDA culturel & festif référencés dans 1WM (concerts, festivals, expositions, soirées, marchés, etc.). Par défaut filtré sur le badge #Agenda et les événements à venir. Utilise systématiquement cet outil quand le membre demande 'que faire ce week-end', 'quoi voir ce soir', 'événements', 'agenda', 'concerts', 'festivals'.",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "Ville (ex: Marrakech, Essaouira)" },
          query: { type: "string", description: "Mot-clé sur le nom/description (optionnel)" },
          from_date: { type: "string", description: "Date début ISO (YYYY-MM-DD). Défaut : aujourd'hui." },
          to_date: { type: "string", description: "Date fin ISO (YYYY-MM-DD). Défaut : +30 jours." },
          include_all_badges: { type: "boolean", description: "Si true, n'applique pas le filtre #Agenda. Défaut false.", default: false },
          limit: { type: "number", description: "Max 10", default: 8 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_my_trips",
      description:
        "Liste les voyages du membre (titre, description, dates, heures, ville(s), établissements liés). Par défaut : voyages en cours ou à venir, triés par date d'arrivée. Utilise-le quand le membre dit 'mon voyage', 'mes voyages', 'mon séjour à X', 'prépare mon week-end à…', 'planning', ou pour personnaliser une recommandation autour de ses dates et adresses déjà sauvegardées.",
      parameters: {
        type: "object",
        properties: {
          include_past: { type: "boolean", description: "Inclure les voyages passés (défaut false).", default: false },
          limit: { type: "number", description: "Max 10", default: 6 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "link_business_to_trip",
      description:
        "Lie un établissement (par slug) à l'un des voyages du membre (par trip_id ou par titre de voyage). Demande la confirmation du membre avant d'appeler cet outil si la cible n'est pas évidente. Retourne le voyage mis à jour.",
      parameters: {
        type: "object",
        properties: {
          business_slug: { type: "string", description: "Slug exact de l'établissement (issu de search_businesses)." },
          trip_id: { type: "string", description: "ID du voyage cible (préféré si connu)." },
          trip_title: { type: "string", description: "Titre exact ou approchant du voyage (fallback si trip_id absent)." },
        },
        required: ["business_slug"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "show_on_map",
      description:
        "Affiche une sélection d'établissements sur une carte Google Maps (mini-aperçu dans la bulle + panneau latéral avec carte plein écran). Utilise cet outil dès que le membre dit 'montre-moi sur une carte', 'sur une carte', 'situe les', 'où sont-ils', 'localise', ou quand il est utile de visualiser géographiquement plusieurs adresses citées. Passe UNIQUEMENT des slugs valides obtenus via search_businesses, list_my_bookmarks, get_my_trips ou suggest_similar_to_my_bookmarks. Tu peux ensuite continuer ta réponse textuelle normalement — la carte sera rendue automatiquement.",
      parameters: {
        type: "object",
        properties: {
          business_slugs: {
            type: "array",
            items: { type: "string" },
            description: "Liste des slugs (2 à 30) des établissements à afficher sur la carte. Passe tous les résultats utiles de search_businesses (jusqu'à 30).",
          },
          title: { type: "string", description: "Titre court de la carte (ex: 'Hôtels avec piscine à Marrakech'). Optionnel." },
        },
        required: ["business_slugs"],
      },
    },
  },

];




// ----- Taste profile helper -----
async function computeTasteProfile(userId: string, supabase: any) {
  const [bks, vlikes, vbks, sh, personas] = await Promise.all([
    supabase.from("bookmarks").select("business_id").eq("user_id", userId).limit(100),
    supabase.from("video_likes").select("video_id").eq("user_id", userId).limit(100),
    supabase.from("video_bookmarks").select("video_id").eq("user_id", userId).limit(100),
    supabase.from("search_history").select("query,city").eq("user_id", userId).order("created_at", { ascending: false }).limit(30),
    supabase
      .from("club_member_personas")
      .select("personas:persona_id(slug,name_fr), member:member_id!inner(user_id)")
      .eq("member.user_id", userId),
  ]);

  const bizIds = (bks.data || []).map((b: any) => b.business_id).filter(Boolean);
  const categories: Record<string, number> = {};
  const cities: Record<string, number> = {};
  const neighborhoods: Record<string, number> = {};
  const bookmarkedNames: string[] = [];

  if (bizIds.length) {
    const { data: bizs } = await supabase
      .from("businesses")
      .select("name,main_category,city,neighborhood,categories")
      .in("id", bizIds);
    for (const b of bizs || []) {
      if (b.name) bookmarkedNames.push(b.name);
      if (b.main_category) categories[b.main_category] = (categories[b.main_category] || 0) + 2;
      for (const c of b.categories || []) categories[c] = (categories[c] || 0) + 1;
      if (b.city) cities[b.city] = (cities[b.city] || 0) + 1;
      if (b.neighborhood) neighborhoods[b.neighborhood] = (neighborhoods[b.neighborhood] || 0) + 1;
    }
  }

  const recentSearches = (sh.data || []).map((s: any) => s.query).filter(Boolean).slice(0, 10);
  const personaNames = (personas.data || [])
    .map((p: any) => p.personas?.name_fr)
    .filter(Boolean);

  const top = (obj: Record<string, number>, n = 5) =>
    Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);

  return {
    bookmarks_count: bizIds.length,
    video_likes_count: (vlikes.data || []).length,
    video_bookmarks_count: (vbks.data || []).length,
    top_categories: top(categories, 6),
    top_cities: top(cities, 4),
    top_neighborhoods: top(neighborhoods, 4),
    recent_searches: recentSearches,
    personas: personaNames,
    sample_bookmarked: bookmarkedNames.slice(0, 8),
    _bizIds: bizIds,
  };
}

function tasteSummaryLine(t: any): string {
  if (!t) return "";
  const parts: string[] = [];
  if (t.top_categories?.length) parts.push(`catégories favorites ${t.top_categories.join(", ")}`);
  if (t.top_cities?.length) parts.push(`villes ${t.top_cities.join(", ")}`);
  if (t.personas?.length) parts.push(`personas ${t.personas.join(", ")}`);
  if (t.recent_searches?.length) parts.push(`recherches récentes ${t.recent_searches.slice(0, 5).join(" · ")}`);
  return parts.length ? `Profil de goûts du membre — ${parts.join(" ; ")}.` : "";
}

async function runTool(name: string, args: any, ctx: { userId: string; supabase: any; lastUserMessage?: string; language?: string }) {
  try {
    if (name === "get_weather") {
      const { data, error } = await ctx.supabase.functions.invoke("get-weather", { body: { city: args.city } });
      if (error) return { error: String(error) };
      return data;
    }
    if (name === "search_businesses") {
      const limit = Math.min(Math.max(Number(args.limit) || 12, 1), 30);

      // Construit une requête en langage naturel qui combine tous les critères
      // pour bénéficier de la MÊME logique que /search (synonymes, badges, services,
      // sous-catégories, détection ville/quartier, ranking, etc.)
      const qParts: string[] = [];
      if (args.query) qParts.push(String(args.query));
      if (args.category) qParts.push(String(args.category));
      const badgesIn: string[] = Array.isArray(args.badges) ? args.badges.filter(Boolean) : [];
      const servicesIn: string[] = Array.isArray(args.services) ? args.services.filter(Boolean) : [];
      badgesIn.forEach((b) => qParts.push(String(b).replace(/^#/, "")));
      servicesIn.forEach((s) => qParts.push(String(s).replace(/^#/, "")));
      if (args.neighborhood) qParts.push(String(args.neighborhood));
      const aiQuery = qParts.filter(Boolean).join(" ").trim();
      const lastUserQuery = String(ctx.lastUserMessage || "")
        .replace(/\b(montre|montres|affiche|affiches|situe|localise|localises|cherche|trouve|peux-tu|pouvez-vous|sur une carte|carte)\b/gi, " ")
        .replace(/[?!.,;:()"“”«»]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const fullQuery = lastUserQuery.length >= 4 ? lastUserQuery : aiQuery;

      // Appel business-search (même moteur que /search) — direct fetch pour éviter
      // les aléas de `functions.invoke` depuis Deno (parfois body non transmis).
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      let sres: any = null;
      let sErr: string | null = null;
      try {
        const body = {
          query: fullQuery || undefined,
          spoken: fullQuery || undefined,
          language: ctx.language || (args.language as string) || "fr",
          pageSize: limit,
          offset: 0,
          compact: "card",
          city: args.city || undefined,
        };
        const r = await fetch(`${supabaseUrl}/functions/v1/business-search`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        const text = await r.text();
        try { sres = JSON.parse(text); } catch { sres = null; }
        if (!r.ok) sErr = `HTTP ${r.status}: ${text.slice(0, 200)}`;
        console.log("club-ai-chat → business-search", JSON.stringify({ args, aiQuery, fullQuery, status: r.status, total: sres?.totalCount, n: Array.isArray(sres?.businesses) ? sres.businesses.length : 0, detectedCity: sres?.detectedCity, detectedCategory: sres?.detectedCategory, detectedService: sres?.detectedService }));
      } catch (e) {
        sErr = String(e);
        console.error("club-ai-chat → business-search fetch exception", e);
      }
      if (sErr) {
        return { results: [], error: sErr, hint: "Réessaie avec des critères plus simples." };
      }
      const businesses: any[] = Array.isArray(sres?.businesses) ? sres.businesses : [];
      const total = typeof sres?.totalCount === "number" ? sres.totalCount : businesses.length;
      if (!businesses.length) {
        return {
          results: [],
          total_count: 0,
          note: `Aucun établissement trouvé (query="${fullQuery}", city="${args.city || ""}"). Dis-le franchement à l'utilisateur et propose-lui une alternative (autre quartier, élargir la catégorie) au lieu d'inventer.`,
        };
      }

      // Enrichissement : description + highlights (blocs) pour les résultats affichés
      const ids = businesses.map((b) => b.id).filter(Boolean);
      const [descRes, hlRes] = await Promise.all([
        ctx.supabase.from("businesses").select("id,description").in("id", ids),
        ctx.supabase
          .from("front_highlights")
          .select("business_id,icon,title_fr,title_en,title_ar,description_fr,description_en,description_ar,section_title_fr,section_title_en,section_title_ar,metric_title_fr,metric_title_en,metric_title_ar,metric_value_fr,metric_value_en,metric_value_ar,sort_order")
          .in("business_id", ids)
          .order("sort_order", { ascending: true }),
      ]);
      const descById = new Map<string, string | null>();
      (descRes.data || []).forEach((r: any) => descById.set(r.id, r.description ?? null));
      const hlByBiz = new Map<string, any[]>();
      (hlRes.data || []).forEach((h: any) => {
        const arr = hlByBiz.get(h.business_id) || [];
        arr.push({
          icon: h.icon || null,
          section_title: h.section_title_fr || h.section_title_en || h.section_title_ar || null,
          title: h.title_fr || h.title_en || h.title_ar || null,
          description: h.description_fr || h.description_en || h.description_ar || null,
          metric_title: h.metric_title_fr || h.metric_title_en || h.metric_title_ar || null,
          metric_value: h.metric_value_fr || h.metric_value_en || h.metric_value_ar || null,
        });
        hlByBiz.set(h.business_id, arr);
      });

      const results = businesses.map((b: any) => ({
        id: b.id,
        name: b.name,
        slug: b.slug ?? null,
        url: b.slug ? `https://oneworldmorocco.com/b/${b.slug}` : null,
        city: b.city ?? null,
        neighborhood: b.neighborhood ?? null,
        main_category: b.main_category ?? null,
        categories: b.categories ?? null,
        services: b.services ?? null,
        phone: b.phone ?? null,
        google_rating: b.google_rating ?? null,
        google_review_count: b.google_review_count ?? null,
        priority_score: b.priority_score ?? null,
        hook_fr: b.hook_fr ?? null,
        hook_en: b.hook_en ?? null,
        hook_ar: b.hook_ar ?? null,
        description: descById.get(b.id) ?? null,
        highlights: hlByBiz.get(b.id) || [],
      }));

      return {
        results,
        returned_count: results.length,
        total_count: total,
        has_more: total > results.length,
        detected: {
          city: sres?.detectedCity || null,
          neighborhood: sres?.detectedNeighborhood || null,
          category: sres?.detectedCategory || null,
          service: sres?.detectedService || null,
          subcategory: sres?.detectedSubcategory || null,
        },
      };
    }
    if (name === "get_business_details") {
      const { data, error } = await ctx.supabase
        .from("businesses")
        .select("id,name,slug,city,neighborhood,address,main_category,categories,description,phone,website,google_rating,google_review_count,min_price,opening_hours")
        .eq("slug", args.slug)
        .eq("is_active", true)
        .maybeSingle();
      if (error) return { error: error.message };
      if (!data) return { error: "Établissement introuvable" };
      return { ...data, url: `https://oneworldmorocco.com/b/${data.slug}` };
    }
    if (name === "list_my_bookmarks") {
      const { data: bks } = await ctx.supabase
        .from("bookmarks")
        .select("business_id")
        .eq("user_id", ctx.userId)
        .limit(30);
      const ids = (bks || []).map((b: any) => b.business_id);
      if (!ids.length) return { results: [] };
      const { data } = await ctx.supabase
        .from("businesses")
        .select("id,name,slug,city,main_category")
        .in("id", ids);
      return { results: (data || []).map((b: any) => ({ ...b, url: `https://oneworldmorocco.com/b/${b.slug}` })) };
    }
    if (name === "list_my_saved_chats") {
      const { data } = await ctx.supabase
        .from("ai_chats")
        .select("id,title,city,updated_at")
        .eq("user_id", ctx.userId)
        .eq("is_bookmarked", true)
        .order("updated_at", { ascending: false })
        .limit(20);
      return { results: data || [] };
    }
    if (name === "get_my_taste_profile") {
      const t = await computeTasteProfile(ctx.userId, ctx.supabase);
      const { _bizIds, ...pub } = t;
      return pub;
    }
    if (name === "suggest_similar_to_my_bookmarks") {
      const t = await computeTasteProfile(ctx.userId, ctx.supabase);
      const limit = Math.min(Number(args.limit) || 6, 10);
      if (!t.top_categories.length) return { results: [], note: "Aucun bookmark exploitable." };
      let q = ctx.supabase
        .from("businesses")
        .select("id,name,slug,city,neighborhood,main_category,google_rating,google_review_count,priority_score")
        .eq("is_active", true)
        .or(t.top_categories.map((c: string) => `main_category.eq.${c}`).join(","))
        .order("priority_score", { ascending: false, nullsFirst: false })
        .limit(limit * 3);
      if (args.city) q = q.ilike("city", `%${args.city}%`);
      else if (t.top_cities.length) q = q.in("city", t.top_cities);
      const { data, error } = await q;
      if (error) return { error: error.message };
      const excluded = new Set(t._bizIds);
      const results = (data || []).filter((b: any) => !excluded.has(b.id)).slice(0, limit);
      return { results, based_on: { categories: t.top_categories, cities: t.top_cities } };
    }
    if (name === "search_events") {
      const limit = Math.min(Number(args.limit) || 8, 10);
      const today = new Date().toISOString().slice(0, 10);
      const from = (args.from_date && String(args.from_date).slice(0, 10)) || today;
      const to = (args.to_date && String(args.to_date).slice(0, 10))
        || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

      let eventIds: string[] | null = null;
      if (!args.include_all_badges) {
        // Badge #Agenda
        const { data: badge } = await ctx.supabase
          .from("badges").select("id").ilike("name_fr", "%agenda%").limit(1).maybeSingle();
        if (badge?.id) {
          const { data: eb } = await ctx.supabase
            .from("event_badges").select("event_id").eq("badge_id", badge.id);
          eventIds = (eb || []).map((r: any) => r.event_id).filter(Boolean);
          if (!eventIds.length) return { results: [], note: "Aucun événement avec le badge #Agenda." };
        }
      }

      let q = ctx.supabase
        .from("events")
        .select("id,name,hook,description,start_date,end_date,recurrence,days_of_week,start_time,end_time,url,city_id,cities:city_id(name_fr),neighborhoods:neighborhood_id(name_fr)")
        .or(`and(start_date.gte.${from},start_date.lte.${to}),and(start_date.lte.${to},end_date.gte.${from}),recurrence.not.is.null`)
        .order("start_date", { ascending: true, nullsFirst: false })
        .limit(limit * 2);
      if (eventIds) q = q.in("id", eventIds.slice(0, 500));
      if (args.query) {
        const qv = String(args.query).replace(/[,()"]/g, " ").trim();
        if (qv) q = q.or(`name.ilike.%${qv}%,description.ilike.%${qv}%,hook.ilike.%${qv}%`);
      }
      const { data, error } = await q;
      if (error) { console.error("search_events error", error); return { results: [], error: error.message }; }
      let results = data || [];
      if (args.city) {
        const cv = String(args.city).toLowerCase();
        results = results.filter((e: any) => (e.cities?.name_fr || "").toLowerCase().includes(cv));
      }
      results = results.slice(0, limit).map((e: any) => ({
        id: e.id,
        name: e.name,
        hook: e.hook,
        description: e.description,
        start_date: e.start_date,
        end_date: e.end_date,
        recurrence: e.recurrence,
        days_of_week: e.days_of_week,
        start_time: e.start_time,
        end_time: e.end_time,
        city: e.cities?.name_fr || null,
        neighborhood: e.neighborhoods?.name_fr || null,
        url: e.url || null,
      }));
      if (!results.length) return { results: [], note: `Aucun événement trouvé entre ${from} et ${to}${args.city ? ` à ${args.city}` : ""}.` };
      return { results, period: { from, to } };
    }
    if (name === "get_my_trips") {
      const limit = Math.min(Number(args.limit) || 6, 10);
      const today = new Date().toISOString().slice(0, 10);
      let q = ctx.supabase
        .from("club_trips")
        .select("id,title,description,arrival_date,departure_date,arrival_time,departure_time")
        .eq("user_id", ctx.userId)
        .order("arrival_date", { ascending: true, nullsFirst: false })
        .limit(limit);
      if (!args.include_past) q = q.gte("departure_date", today);
      const { data: trips, error } = await q;
      if (error) return { error: error.message, results: [] };
      const tripIds = (trips || []).map((t: any) => t.id);
      let linksByTrip: Record<string, any[]> = {};
      if (tripIds.length) {
        const { data: links } = await ctx.supabase
          .from("club_trip_businesses")
          .select("trip_id,sort_order,businesses:business_id(id,name,slug,city,neighborhood,main_category)")
          .in("trip_id", tripIds)
          .order("sort_order", { ascending: true });
        for (const l of links || []) {
          if (!l.businesses) continue;
          (linksByTrip[l.trip_id] ||= []).push({
            ...l.businesses,
            url: `https://oneworldmorocco.com/b/${l.businesses.slug}`,
          });
        }
      }
      const results = (trips || [])
        .map((t: any) => ({
          ...t,
          businesses: linksByTrip[t.id] || [],
          is_ongoing: t.arrival_date <= today && t.departure_date >= today,
        }))
        .sort((a: any, b: any) => {
          if (a.is_ongoing !== b.is_ongoing) return a.is_ongoing ? -1 : 1;
          return String(a.arrival_date).localeCompare(String(b.arrival_date));
        });
      if (!results.length) return { results: [], note: "Aucun voyage à venir enregistré." };
      return { results };
    }
    if (name === "link_business_to_trip") {
      const slug = String(args.business_slug || "").trim();
      if (!slug) return { error: "business_slug requis" };
      const { data: biz } = await ctx.supabase
        .from("businesses")
        .select("id,name,slug,city")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (!biz) return { error: `Établissement '${slug}' introuvable.` };

      let tripId: string | null = args.trip_id || null;
      let trip: any = null;
      if (tripId) {
        const { data } = await ctx.supabase
          .from("club_trips").select("id,title,arrival_date,departure_date")
          .eq("id", tripId).eq("user_id", ctx.userId).maybeSingle();
        trip = data;
      } else if (args.trip_title) {
        const { data } = await ctx.supabase
          .from("club_trips").select("id,title,arrival_date,departure_date")
          .eq("user_id", ctx.userId)
          .ilike("title", `%${String(args.trip_title).replace(/[%_]/g, "")}%`)
          .order("arrival_date", { ascending: true })
          .limit(1).maybeSingle();
        trip = data;
        tripId = data?.id || null;
      }
      if (!trip || !tripId) return { error: "Voyage cible introuvable. Demande au membre de préciser le titre exact du voyage." };

      const { data: existing } = await ctx.supabase
        .from("club_trip_businesses")
        .select("id").eq("trip_id", tripId).eq("business_id", biz.id).maybeSingle();
      if (existing) return { ok: true, already_linked: true, trip, business: biz };

      const { data: maxRow } = await ctx.supabase
        .from("club_trip_businesses").select("sort_order")
        .eq("trip_id", tripId).order("sort_order", { ascending: false }).limit(1).maybeSingle();
      const nextOrder = (maxRow?.sort_order ?? -1) + 1;

      const { error: insErr } = await ctx.supabase
        .from("club_trip_businesses")
        .insert({ trip_id: tripId, business_id: biz.id, sort_order: nextOrder });
      if (insErr) return { error: insErr.message };
      return { ok: true, linked: true, trip, business: biz };
    }
    if (name === "web_search") {
      const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
      if (!FIRECRAWL_API_KEY) return { error: "FIRECRAWL_API_KEY non configurée" };
      const limit = Math.min(Math.max(Number(args.limit) || 5, 3), 8);
      const query = String(args.query || "").trim();
      if (!query) return { error: "Requête vide" };
      try {
        const r = await fetch("https://api.firecrawl.dev/v2/search", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query, limit, lang: "fr", country: "ma" }),
        });
        if (!r.ok) {
          const txt = await r.text();
          console.error("firecrawl search error", r.status, txt);
          return { error: `Firecrawl ${r.status}`, results: [] };
        }
        const data = await r.json();
        // v2 retourne { success, data: { web: [...], news: [...], images: [...] } } OU { data: [...] }
        const rawList: any[] = Array.isArray(data?.data?.web)
          ? data.data.web
          : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.web)
          ? data.web
          : [];
        const results = rawList.slice(0, limit).map((it: any) => ({
          title: it.title || it.name || "",
          url: it.url || it.link || "",
          snippet: (it.description || it.snippet || it.markdown || "").toString().slice(0, 400),
        }));
        return {
          query,
          results,
          instruction: "Synthétise une réponse courte basée sur ces résultats et cite TOUJOURS les sources sous forme [titre](url). Si les résultats sont contradictoires ou incertains, dis-le.",
        };
      } catch (e) {
        console.error("web_search exception", e);
        return { error: String(e), results: [] };
      }
    }
    if (name === "show_on_map") {
      const slugs: string[] = Array.isArray(args.business_slugs)
        ? args.business_slugs.filter((s: any) => typeof s === "string" && s.trim()).slice(0, 30)
        : [];
      if (!slugs.length) return { error: "Aucun slug fourni", count: 0 };
      const { data, error } = await ctx.supabase
        .from("businesses")
        .select("id,name,slug,city,neighborhood,address,phone,whatsapp,main_category,categories,latitude,longitude,wtuce_status,logo_url,images,hook_fr,google_rating,google_review_count,tripadvisor_rating,tripadvisor_review_count,engagements")
        .in("slug", slugs)
        .eq("is_active", true);
      if (error) return { error: error.message, count: 0 };
      const withCoords = (data || []).filter((b: any) => b.latitude != null && b.longitude != null);
      const missing = slugs.filter((s) => !(data || []).some((b: any) => b.slug === s));
      const noCoords = (data || []).filter((b: any) => b.latitude == null || b.longitude == null).map((b: any) => b.slug);
      return {
        ok: true,
        count: withCoords.length,
        businesses: withCoords,
        missing_slugs: missing,
        no_coords_slugs: noCoords,
        instruction:
          "La carte sera affichée automatiquement côté UI. Poursuis ta réponse normalement sans recoller la liste si elle vient juste d'être donnée. Mentionne uniquement les établissements éventuellement sans coordonnées (no_coords_slugs) ou introuvables (missing_slugs) si pertinent.",
      };
    }
  } catch (e) {
    return { error: String(e) };
  }
  return { error: "unknown tool" };
}


serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const callerContext = await resolveCallerContext(admin, user.id);

    const { chatId, messages = [], clientContext = {}, language = "fr" }: { chatId?: string; messages: Msg[]; clientContext?: { activeCity?: string; localTime?: string; coords?: { lat: number; lng: number } }; language?: string } = await req.json();
    const lang = (language === "en" || language === "ar") ? language : "fr";
    const languageInstruction = lang === "en"
      ? "IMPORTANT: Always reply in English, regardless of the language of tool results or the system prompt language. Keep the same warm, concise tone."
      : lang === "ar"
      ? "مهم: أجب دائماً بالعربية، بغض النظر عن لغة نتائج الأدوات أو لغة التعليمات. حافظ على نبرة دافئة وموجزة."
      : "IMPORTANT : réponds toujours en français, sauf si l'utilisateur écrit dans une autre langue.";

    // ----- Fixed-response shortcut -----
    // If the last user message matches (case-insensitive, trimmed) a suggestion
    // label in club_ai_suggestions AND a fixed_response_<lang> is set, return it
    // verbatim — no AI call, no tokens, deterministic content maintained by staff.
    try {
      const lastUserMsgRaw = [...messages].reverse().find((m) => m.role === "user")?.content || "";
      const norm = (s: string) => String(s || "").trim().toLowerCase();
      const key = norm(lastUserMsgRaw);
      if (key) {
        const col = lang === "en" ? "fixed_response_en" : lang === "ar" ? "fixed_response_ar" : "fixed_response_fr";
        const { data: fixedRows } = await admin
          .from("club_ai_suggestions")
          .select(`label_fr,label_en,label_ar,${col}`)
          .eq("is_active", true)
          .not(col, "is", null);
        const match = (fixedRows || []).find((r: any) =>
          norm(r.label_fr) === key || norm(r.label_en) === key || norm(r.label_ar) === key
        );
        const fixedAnswer = match ? String((match as any)[col] || "").trim() : "";
        if (fixedAnswer) {
          const newMessages = [...messages, { role: "assistant", content: fixedAnswer }];
          let resultChatId: string | null = null;
          if (chatId) {
            const { data: existing } = await admin
              .from("ai_chats").select("id").eq("id", chatId).eq("user_id", user.id).maybeSingle();
            if (existing?.id) {
              await admin.from("ai_chats").update({ messages: newMessages, updated_at: new Date().toISOString() }).eq("id", chatId).eq("user_id", user.id);
              resultChatId = chatId;
            }
          }
          if (!resultChatId) {
            const title = lastUserMsgRaw.slice(0, 200) || "Nouvelle conversation";
            const { data: inserted } = await admin
              .from("ai_chats").insert({ user_id: user.id, kind: "club", title, messages: newMessages }).select("id").single();
            resultChatId = inserted?.id ?? null;
          }
          return new Response(JSON.stringify({ answer: fixedAnswer, chatId: resultChatId, followups: [] }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    } catch (e) {
      console.error("fixed-response lookup error", e);
    }




    // Load Club member profile (lightweight context)
    const { data: member } = await admin
      .from("club_members")
      .select("first_name,nickname,city,country")
      .eq("user_id", user.id)
      .maybeSingle();

    const profileLine = member
      ? `Profil utilisateur: ${member.first_name || member.nickname || "Membre"}${member.city ? ` · ${member.city}` : ""}${member.country ? ` (${member.country})` : ""}.`
      : "";

    // ----- Enriched temporal / seasonal context -----
    // Morocco is UTC+1 year-round. Derive weekday, part of day, weekend flag, season.
    const enrichContext = () => {
      const now = new Date();
      // Force Casablanca timezone (Africa/Casablanca)
      const fmt = new Intl.DateTimeFormat("fr-FR", {
        timeZone: "Africa/Casablanca",
        weekday: "long", year: "numeric", month: "long", day: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: false,
      });
      const parts = fmt.formatToParts(now);
      const get = (t: string) => parts.find(p => p.type === t)?.value || "";
      const weekday = get("weekday");
      const day = get("day"), month = get("month"), year = get("year");
      const hourNum = parseInt(get("hour") || "12", 10);
      const dayJs = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Casablanca" }));
      const dow = dayJs.getDay(); // 0=Sun
      const isWeekend = dow === 5 || dow === 6 || dow === 0; // ven soir / sam / dim = weekend au Maroc
      const partOfDay =
        hourNum < 6 ? "nuit" :
        hourNum < 12 ? "matinée" :
        hourNum < 14 ? "midi (heure de déjeuner)" :
        hourNum < 18 ? "après-midi" :
        hourNum < 22 ? "soirée (heure de dîner)" :
        "nuit";
      const m = dayJs.getMonth();
      const season =
        m >= 2 && m <= 4 ? "printemps (temps doux, très agréable au Maroc)" :
        m >= 5 && m <= 8 ? "été (chaud, surtout à Marrakech ; côte plus tempérée à Essaouira)" :
        m >= 9 && m <= 10 ? "automne (temps doux)" :
        "hiver (frais le soir, journées douces)";
      return { weekday, day, month, year, hourNum, isWeekend, partOfDay, season };
    };
    const t = enrichContext();
    const contextLines = [
      clientContext.activeCity ? `- Ville active: **${clientContext.activeCity}**` : "",
      `- Date locale: ${t.weekday} ${t.day} ${t.month} ${t.year} · ${t.partOfDay} (${t.hourNum}h) · ${t.isWeekend ? "WEEKEND" : "en semaine"}`,
      `- Saison: ${t.season}`,
      clientContext.coords ? `- Position GPS: ${clientContext.coords.lat.toFixed(3)},${clientContext.coords.lng.toFixed(3)}` : "",
    ].filter(Boolean).join("\n");

    // Compute taste profile once per call (cheap: 5 small queries)
    let tasteLine = "";
    try {
      const taste = await computeTasteProfile(user.id, admin);
      tasteLine = tasteSummaryLine(taste);
    } catch (e) {
      console.error("taste profile error", e);
    }

    // ----- Proactive RAG: pre-fetch candidate businesses from last user message -----
    // The model can still call search_businesses to refine, but starting with real
    // candidates in context cuts hallucination and unnecessary tool round-trips.
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content || "";
    let prefetchBlock = "";
    try {
      const q = String(lastUserMsg).trim().slice(0, 200);
      const city = clientContext.activeCity || "";
      if (q.length >= 4) {
        const clean = (s: string) => s.replace(/[,()"]/g, " ").trim();
        const terms = clean(q).split(/\s+/).filter((w) => w.length >= 3).slice(0, 5);
        if (terms.length) {
          const orParts: string[] = [];
          for (const w of terms) {
            orParts.push(`name.ilike.%${w}%`, `description.ilike.%${w}%`, `main_category.ilike.%${w}%`);
          }
          let pq = admin
            .from("businesses")
            .select("name,slug,city,neighborhood,main_category,hook_fr,google_rating")
            .eq("is_active", true)
            .or(orParts.join(","))
            .order("priority_score", { ascending: false, nullsFirst: false })
            .limit(8);
          if (city) pq = pq.ilike("city", `%${city}%`);
          const { data: candidates } = await pq;
          if (candidates && candidates.length) {
            const lines = candidates.map((b: any) =>
              `  • ${b.name} — ${b.main_category || "?"}${b.neighborhood ? `, ${b.neighborhood}` : ""}${b.city ? `, ${b.city}` : ""} (slug: ${b.slug})${b.google_rating ? ` · ★${b.google_rating}` : ""}`
            ).join("\n");
            prefetchBlock = `\nCANDIDATS RÉELS PRÉ-CHARGÉS depuis la base 1WM (message: "${q.slice(0, 80)}"):\n${lines}\n\nUtilise-les en priorité pour ta réponse. Si aucun ne correspond finement à l'intention (ambiance, badge, service, quartier précis), appelle search_businesses pour affiner. Ne mentionne JAMAIS d'établissement qui ne provient pas soit de cette liste, soit d'un appel d'outil.`;
          }
        }
      }
    } catch (e) {
      console.error("prefetch candidates error", e);
    }

    const system = `Tu es l'assistant personnel du Club One World Morocco. Tu aides un membre connecté à découvrir et retrouver des établissements RÉELS référencés dans la base 1WM.

${profileLine}

CONTEXTE SESSION:
${contextLines}

${tasteLine}
${prefetchBlock}

RÈGLES DE PRÉCISION (critiques) :
1. N'INVENTE JAMAIS un établissement, une adresse, un horaire, un prix ou un numéro. Toutes ces informations DOIVENT provenir d'un appel d'outil (search_businesses, get_business_details, list_my_bookmarks…).
2. Avant de recommander un lieu, appelle search_businesses avec les filtres pertinents (city, category, neighborhood). Si la ville n'est pas précisée ET pas évidente dans le contexte, pose UNE courte question de clarification au lieu de deviner.
3. Pour donner des détails (horaires, prix, adresse, téléphone), appelle get_business_details avec le slug exact obtenu via search_businesses.
4. Si une recherche ne renvoie rien, dis-le franchement et propose une reformulation — ne complète pas avec des lieux génériques.
5. Quand tu cites un établissement, écris simplement son **Nom exact** en gras (le nom sera automatiquement cliquable côté UI pour ouvrir la fiche). N'ajoute JAMAIS de lien markdown type [voir la fiche](...) ni d'URL /b/SLUG visible.
6. Reste concis, chaleureux, en français (sauf si l'utilisateur écrit dans une autre langue). Markdown léger (gras, listes courtes). Dans une réponse textuelle, mets en avant 3 à 5 suggestions vraiment ciblées — mais quand le membre demande une carte ou une vue d'ensemble, appelle search_businesses avec limit=30 pour alimenter la carte. **OBLIGATOIRE** : à chaque réponse qui s'appuie sur search_businesses ou search_events, commence (ou termine) par une ligne explicite du type « **N résultats affichés sur M trouvés** » (N = nombre que tu cites/affiches réellement, M = \`total_count\` retourné par l'outil). Si beaucoup d'autres résultats existent, propose d'élargir ou d'affiner (« veux-tu que je filtre par quartier ? »). **NE PROPOSE JAMAIS de filtrer par budget, prix, gamme de prix ou tarif.**
6bis. **PRIX & TARIFS (interdiction stricte)** : tu ne disposes PAS de données fiables de prix/tarifs pour les établissements. N'annonce JAMAIS un prix, une fourchette de tarif, une gamme de prix, un « pas cher / cher / moyen », et ne propose JAMAIS de filtrer/trier par budget ou par tarif. Si le membre pose une question liée au tarif ou au budget (hors nuitées d'hôtel), réponds franchement : « Je ne dispose pas encore de l'information des prix/tarifs pour cette catégorie. Je peux en revanche te proposer une sélection par quartier, ambiance, type de cuisine, etc. » SEULE EXCEPTION : les **nuitées d'hôtel** (tarifs hôteliers issus du moteur de prix dédié) — là tu peux mentionner un prix s'il est explicitement retourné par un outil.
7. Utilise naturellement les goûts du membre pour personnaliser, sans les réciter.
8. **Événements / agenda** : pour toute demande type « que faire ce soir / ce week-end », « concerts », « festival », « expo », « soirée », « agenda culturel » → appelle search_events (filtre #Agenda + ville + dates). N'invente jamais un événement, et précise toujours la date/horaire renvoyés par l'outil. Si rien ne sort, dis-le franchement.
9. **Recherche web (web_search)** : appelle-la UNIQUEMENT pour des infos factuelles temps réel absentes de 1WM (pharmacie de garde, numéros d'urgence officiels, événements/festivals publics non référencés, horaires transports, démarches admin, actualités). JAMAIS pour recommander des restaurants, hôtels, spas, etc. — ceux-là doivent venir de search_businesses ; et pour l'agenda, passe d'abord par search_events. Maximum 1 appel web_search par message. Cite TOUJOURS les sources sous forme [titre](url) à la fin de ta réponse, et préviens si l'info peut avoir changé.
10. **Voyages du membre (get_my_trips)** : dès que le membre évoque « mon voyage », « mon séjour », « prépare », « planning », un week-end / des dates précises, ou qu'il faut s'appuyer sur ses adresses sauvegardées pour un séjour, appelle get_my_trips. Croise ensuite ville + dates + établissements liés pour proposer un planning ou des compléments via search_businesses / search_events. Ne réinvente jamais ses dates, ses villes ou ses adresses liées.

Outils disponibles : get_weather, search_businesses, get_business_details, search_events, get_my_trips, link_business_to_trip, list_my_bookmarks, list_my_saved_chats, get_my_taste_profile, suggest_similar_to_my_bookmarks, web_search, show_on_map.

11. **Lier une adresse à un voyage (link_business_to_trip)** : si le membre demande explicitement « ajoute X à mon voyage Y », appelle d'abord get_my_trips pour récupérer trip_id et search_businesses pour obtenir le slug exact, puis link_business_to_trip. Confirme ensuite poliment ce qui a été ajouté. Si plusieurs voyages possibles, demande au membre lequel cibler avant d'agir.
12. **Affichage sur carte (show_on_map) — DÉCLENCHEMENT OBLIGATOIRE** : tu DOIS appeler show_on_map SANS ATTENDRE une seconde demande dès que la question du membre contient l'un des mots/expressions déclencheurs suivants (FR/EN/AR, insensible aux accents et à la casse) : « carte », « map », « sur une carte », « on a map », « situe », « situer », « localise », « localiser », « où sont », « où se trouvent », « where are », « geoloc », « géolocalise », « خريطة ». Dans ces cas : (a) appelle d'abord search_businesses avec limit: 30, (b) puis appelle show_on_map avec TOUS les slugs retournés (jusqu'à 30) DANS LE MÊME TOUR, avant de rédiger ta réponse texte. Ne demande JAMAIS confirmation avant d'ouvrir la carte quand un de ces mots est présent. Appelle aussi show_on_map spontanément quand visualiser géographiquement aide vraiment la décision (≥ 3 lieux dispersés). La carte et le panneau s'affichent automatiquement côté UI ; tu n'as donc pas à répéter la liste ni à coller une URL Google Maps. Indique le nombre total (total_count) — par exemple « Voici 18 hôtels avec piscine à Marrakech affichés sur la carte (sur 47 au total) ». Ne l'appelle pas pour 1 seul lieu.

${languageInstruction}`;


    // Strip SHOW_ON_MAP markers (huge JSON payloads with images) from prior assistant
    // messages before sending them back to the LLM. Otherwise the model:
    //  1) bloats its context with URLs/coords it doesn't need,
    //  2) tends to echo/regurgitate a truncated marker in its next reply,
    //     which the client-side regex can't match and displays as raw JSON.
    const sanitizedMessages: Msg[] = messages.map((m) =>
      m.role === "assistant" && typeof m.content === "string"
        ? { ...m, content: m.content.replace(/<!--SHOW_ON_MAP:[\s\S]*?-->/g, "").replace(/<!--SHOW_ON_MAP:[\s\S]*$/g, "").trim() }
        : m
    );
    const convo: Msg[] = [{ role: "system", content: system }, ...sanitizedMessages];
    const ctx = { userId: user.id, supabase: admin, lastUserMessage: lastUserMsg, language: lang };

    // Tool-calling loop (max 4 iterations — reduced from 6 for cost control)
    let finalAnswer = "";
    let modelToUse = MODEL;
    const mapPayloads: Array<{ title?: string; businesses: any[] }> = [];
    let lastSearchSlugs: string[] = [];
    let lastSearchTitle: string | undefined;
    for (let i = 0; i < 4; i++) {
      const resp = await fetchAiGateway(GATEWAY_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: modelToUse, messages: convo, tools, tool_choice: "auto", temperature: 0.5, max_tokens: 1800, frequency_penalty: 0.6, presence_penalty: 0.3 }),
      }, {
        supabase: admin,
        userId: callerContext.userId,
        affiliateId: callerContext.affiliateId,
        chatId: chatId || null,
        context: "club-ai-chat",
        model: modelToUse,
        metadata: { iteration: i, active_city: clientContext?.activeCity || null },
      });

      if (resp.status === 429) return new Response(JSON.stringify({ error: "rate_limit" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: "credits_exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (!resp.ok) {
        const txt = await resp.text();
        console.error("gateway error", resp.status, txt);
        // Fallback once on pro model failure
        if (modelToUse === MODEL) { modelToUse = FALLBACK_MODEL; continue; }
        return new Response(JSON.stringify({ error: "gateway_error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const data = await resp.json();
      const choice = data.choices?.[0]?.message;
      if (!choice) break;

      if (choice.tool_calls && choice.tool_calls.length) {
        convo.push({ role: "assistant", content: choice.content || "", tool_calls: choice.tool_calls });
        for (const tc of choice.tool_calls) {
          let args: any = {};
          try { args = JSON.parse(tc.function?.arguments || "{}"); } catch {/* noop */}
          const result = await runTool(tc.function?.name, args, ctx);
          if (tc.function?.name === "show_on_map" && (result as any)?.ok && Array.isArray((result as any).businesses) && (result as any).businesses.length) {
            mapPayloads.push({ title: args.title, businesses: (result as any).businesses });
          }
          if (tc.function?.name === "search_businesses" && Array.isArray((result as any)?.results) && (result as any).results.length) {
            lastSearchSlugs = (result as any).results.map((r: any) => r.slug).filter(Boolean);
            lastSearchTitle = args.query || args.city || undefined;
          }
          convo.push({ role: "tool", tool_call_id: tc.id, name: tc.function?.name, content: JSON.stringify(result) });
        }
        continue;
      }

      finalAnswer = (choice.content || "").trim();
      // Degeneracy guard: if the model emitted a single token looped many times, retry once on fallback.
      const degenerate = /(\b\w{3,}\b)(\s*\1){15,}/i.test(finalAnswer) || /(.{3,40}?)\1{10,}/.test(finalAnswer);
      if (degenerate && modelToUse !== "google/gemini-3-pro-preview") {
        console.warn("degenerate output detected, upgrading to pro model");
        modelToUse = "google/gemini-3-pro-preview";
        finalAnswer = "";
        continue;
      }
      break;
    }


    // Safety net: si l'utilisateur a explicitement demandé une carte mais le modèle
    // n'a pas appelé show_on_map, on l'injecte automatiquement à partir des derniers
    // résultats de search_businesses.
    const MAP_TRIGGER_RE = /\b(sur\s+une?\s+cartes?|une?\s+cartes?|la\s+cartes?|cartes?|maps?|situe(?:z|s|r|nt)?|localise(?:z|s|r|nt)?|o[uù]\s+sont|o[uù]\s+se\s+trouvent|where\s+are|geoloc|g[ée]oloc)\b|خريطة/i;
    if (!mapPayloads.length && lastSearchSlugs.length >= 2 && MAP_TRIGGER_RE.test(lastUserMsg || "")) {
      try {
        const forced = await runTool("show_on_map", { business_slugs: lastSearchSlugs.slice(0, 30), title: lastSearchTitle }, ctx);
        if ((forced as any)?.ok && Array.isArray((forced as any).businesses) && (forced as any).businesses.length) {
          mapPayloads.push({ title: lastSearchTitle, businesses: (forced as any).businesses });
        }
      } catch (e) { console.warn("auto show_on_map failed", e); }
    }

    // Append map markers (hidden HTML comment) for the client to render slide-panel + mini-card.
    if (mapPayloads.length && finalAnswer) {
      for (const p of mapPayloads) {
        const safe = JSON.stringify(p).replace(/-->/g, "--&gt;");
        finalAnswer += `\n\n<!--SHOW_ON_MAP:${safe}-->`;
      }
    }


    // Safety net: if the model exited tool loop without producing prose, force a final synthesis call without tools.
    if (!finalAnswer) {
      try {
        const finalResp = await fetchAiGateway(GATEWAY_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: FALLBACK_MODEL,
            messages: [...convo, { role: "user", content: lang === "en" ? "Now synthesize a clear, warm reply for the member in English, based only on the tool results above. If nothing usable, politely propose a reformulation." : lang === "ar" ? "الآن قدّم جواباً واضحاً ودافئاً للعضو بالعربية، بالاعتماد فقط على نتائج الأدوات أعلاه. إذا لم يكن هناك شيء مفيد، اقترح إعادة صياغة مؤدباً." : "Synthétise maintenant une réponse claire et chaleureuse pour le membre, en français, en t'appuyant uniquement sur les résultats d'outils ci-dessus. Si aucun résultat exploitable, propose poliment une reformulation." }],
            temperature: 0.4,
            max_tokens: 1500,
          }),
        }, {
          supabase: admin,
          userId: callerContext.userId,
          affiliateId: callerContext.affiliateId,
          chatId: chatId || null,
          context: "club-ai-chat",
          model: FALLBACK_MODEL,
          metadata: { fallback: true, active_city: clientContext?.activeCity || null },
        });
        if (finalResp.ok) {
          const fd = await finalResp.json();
          finalAnswer = (fd.choices?.[0]?.message?.content || "").trim();
        }
      } catch (e) {
        console.error("final synthesis error", e);
      }
      if (!finalAnswer) {
        finalAnswer = "Désolé, je n'ai pas pu formuler de réponse cette fois-ci. Peux-tu reformuler ta demande (ville, type de cuisine, quartier) ?";
      }
    }

    // Persist conversation
    const userTurns = messages.filter((m) => m.role === "user");
    const lastUser = userTurns[userTurns.length - 1]?.content || "";
    const newMessages = [...messages, { role: "assistant", content: finalAnswer }];

    let resultChatId: string | null = null;
    if (chatId) {
      // Only update when the chat still exists for this user — otherwise
      // (deleted client-side, stale URL, etc.) fall through to INSERT so we
      // never "resurrect" a deleted conversation under its old id.
      const { data: existing } = await admin
        .from("ai_chats")
        .select("id")
        .eq("id", chatId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (existing?.id) {
        await admin.from("ai_chats").update({ messages: newMessages, updated_at: new Date().toISOString() }).eq("id", chatId).eq("user_id", user.id);
        resultChatId = chatId;
      }
    }
    if (!resultChatId) {
      const title = lastUser.slice(0, 200) || "Nouvelle conversation";
      const { data: inserted } = await admin
        .from("ai_chats")
        .insert({ user_id: user.id, kind: "club", title, messages: newMessages })
        .select("id")
        .single();
      resultChatId = inserted?.id ?? null;
    }

    // Generate 3 contextual follow-up suggestions (best-effort, non-blocking on failure)
    let followups: string[] = [];
    try {
      const lang = (language || "fr").toLowerCase();
      const langLabel = lang === "en" ? "English" : lang === "ar" ? "Arabic" : "French";
      const followupSystem = `You generate exactly 3 short, natural follow-up questions the user might ask next, in ${langLabel}. Each under 60 chars, no numbering, no quotes, one per line. They must extend the current conversation naturally (drill down, alternative, next step). Return ONLY the 3 lines.`;
      const lastAssistant = finalAnswer.replace(/<!--SHOW_ON_MAP:[\s\S]*?-->/g, "").slice(0, 1200);
      const lastUserMsg = lastUser.slice(0, 400);
      const fResp = await fetchAiGateway(GATEWAY_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: FALLBACK_MODEL,
          messages: [
            { role: "system", content: followupSystem },
            { role: "user", content: `User asked: ${lastUserMsg}\n\nAssistant answered: ${lastAssistant}\n\nGive 3 follow-up questions.` },
          ],
          temperature: 0.8,
          max_tokens: 200,
        }),
      }, {
        supabase: admin,
        userId: callerContext.userId,
        affiliateId: callerContext.affiliateId,
        chatId: resultChatId || chatId || null,
        context: "club-ai-chat-followups",
        model: FALLBACK_MODEL,
        metadata: { active_city: clientContext?.activeCity || null },
      });
      if (fResp.ok) {
        const fData = await fResp.json();
        const raw = fData?.choices?.[0]?.message?.content || "";
        followups = raw
          .split("\n")
          .map((s: string) => s.replace(/^[-*\d.)\s]+/, "").replace(/^["'«»]+|["'«»]+$/g, "").trim())
          .filter((s: string) => s && s.length > 3 && s.length < 120)
          .slice(0, 3);
      }
    } catch (e) {
      console.error("followup gen error", e);
    }

    return new Response(JSON.stringify({ answer: finalAnswer, chatId: resultChatId, followups }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

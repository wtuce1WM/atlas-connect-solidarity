import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
// Modèle "pro" pour précision et meilleur raisonnement multi-tools.
const MODEL = "google/gemini-3-pro-preview";
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
        "Recherche des établissements RÉELS dans la base One World Morocco. À utiliser systématiquement avant de citer un lieu. Combine nom, catégorie, ville, quartier, ET badges (très important : les badges qualifient finement l'expérience — ex: #Authentique, Rooftop, Famille, Cuisine marocaine, Gastronomique, Piscine, Spa, Beach Club, Dîner-Spectacle, Vue sur mer, Démarche éco-responsable, etc.). Si l'utilisateur exprime une intention (« authentique », « pas cher », « romantique », « pour enfants »…), pense à passer le badge correspondant.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Mot-clé ou nom partiel (optionnel si category/badges fourni)" },
          category: { type: "string", description: "Catégorie principale: restaurant, hotel, spa, activité, bar, café, etc. (optionnel)" },
          city: { type: "string", description: "Ville (ex: Marrakech, Essaouira, Casablanca)" },
          neighborhood: { type: "string", description: "Quartier (ex: Gueliz, Médina, Hivernage)" },
          badges: {
            type: "array",
            items: { type: "string" },
            description: "Badges (name_fr, avec ou sans #) à matcher. Ex: ['#Authentique'], ['Rooftop','Vue sur mer'], ['Famille']. Plusieurs badges = filtrage AND.",
          },
          limit: { type: "number", description: "Max 10", default: 6 },
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

async function runTool(name: string, args: any, ctx: { userId: string; supabase: any }) {
  try {
    if (name === "get_weather") {
      const { data, error } = await ctx.supabase.functions.invoke("get-weather", { body: { city: args.city } });
      if (error) return { error: String(error) };
      return data;
    }
    if (name === "search_businesses") {
      const limit = Math.min(Number(args.limit) || 6, 10);
      // Échapper les caractères qui cassent la syntaxe PostgREST .or()
      const clean = (s: string) => String(s).replace(/[,()"]/g, " ").trim();

      // Résolution des badges -> business_ids (AND si plusieurs badges)
      let badgeBizIds: string[] | null = null;
      const badgesIn: string[] = Array.isArray(args.badges) ? args.badges.filter(Boolean) : [];
      if (badgesIn.length) {
        const lists: string[][] = [];
        for (const raw of badgesIn) {
          const term = clean(String(raw).replace(/^#/, ""));
          if (!term) continue;
          const { data: bs } = await ctx.supabase
            .from("badges")
            .select("id")
            .ilike("name_fr", `%${term}%`)
            .limit(10);
          const badgeIds = (bs || []).map((b: any) => b.id);
          if (!badgeIds.length) { lists.push([]); continue; }
          const { data: bb } = await ctx.supabase
            .from("business_badges")
            .select("business_id")
            .in("badge_id", badgeIds);
          lists.push((bb || []).map((r: any) => r.business_id).filter(Boolean));
        }
        // intersection
        badgeBizIds = lists.reduce<string[] | null>((acc, cur) => {
          if (acc === null) return cur;
          const set = new Set(cur);
          return acc.filter((id) => set.has(id));
        }, null);
        if (!badgeBizIds || badgeBizIds.length === 0) {
          return { results: [], note: `Aucun établissement ne porte le(s) badge(s) ${badgesIn.join(", ")} avec ces critères. Propose une alternative honnête au lieu d'inventer.` };
        }
      }

      let q = ctx.supabase
        .from("businesses")
        .select("id,name,slug,city,neighborhood,main_category,categories,description,phone,google_rating,google_review_count,priority_score")
        .eq("is_active", true)
        .order("priority_score", { ascending: false, nullsFirst: false })
        .limit(limit);
      if (badgeBizIds) q = q.in("id", badgeBizIds.slice(0, 500));
      if (args.city) q = q.ilike("city", `%${clean(args.city)}%`);
      if (args.neighborhood) q = q.ilike("neighborhood", `%${clean(args.neighborhood)}%`);
      // Combiner query + category dans UN SEUL .or() — sinon PostgREST télescope les filtres
      const orParts: string[] = [];
      if (args.query) {
        const qv = clean(args.query);
        if (qv) {
          orParts.push(`name.ilike.%${qv}%`, `description.ilike.%${qv}%`, `main_category.ilike.%${qv}%`);
          const firstWord = qv.split(/\s+/)[0];
          if (firstWord && firstWord !== qv) {
            orParts.push(`name.ilike.%${firstWord}%`, `main_category.ilike.%${firstWord}%`, `description.ilike.%${firstWord}%`);
          }
        }
      }
      if (args.category) {
        const cv = clean(args.category);
        if (cv) {
          orParts.push(`main_category.ilike.%${cv}%`);
          const firstWord = cv.split(/\s+/)[0];
          if (firstWord && firstWord !== cv) orParts.push(`main_category.ilike.%${firstWord}%`);
        }
      }
      if (orParts.length) q = q.or(orParts.join(","));
      const { data, error } = await q;
      if (error) {
        console.error("search_businesses error", error, "args=", JSON.stringify(args));
        return { results: [], error: error.message, hint: "Réessaie avec des critères plus simples (une seule ville, un mot-clé court)." };
      }
      const results = (data || []).map((b: any) => ({ ...b, url: `https://oneworldmorocco.com/b/${b.slug}` }));
      if (!results.length) {
        return { results: [], note: `Aucun établissement trouvé (query="${args.query || ""}", category="${args.category || ""}", city="${args.city || ""}"). Dis-le franchement à l'utilisateur et propose-lui une alternative (autre quartier, élargir la catégorie) au lieu d'inventer.` };
      }
      return { results };
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

    const { chatId, messages = [], clientContext = {} }: { chatId?: string; messages: Msg[]; clientContext?: { activeCity?: string; localTime?: string; coords?: { lat: number; lng: number } } } = await req.json();

    // Load Club member profile (lightweight context)
    const { data: member } = await admin
      .from("club_members")
      .select("first_name,nickname,city,country")
      .eq("user_id", user.id)
      .maybeSingle();

    const profileLine = member
      ? `Profil utilisateur: ${member.first_name || member.nickname || "Membre"}${member.city ? ` · ${member.city}` : ""}${member.country ? ` (${member.country})` : ""}.`
      : "";

    const contextLine = [
      clientContext.activeCity ? `Ville active: ${clientContext.activeCity}` : "",
      clientContext.localTime ? `Heure locale: ${clientContext.localTime}` : "",
      clientContext.coords ? `Position: ${clientContext.coords.lat.toFixed(3)},${clientContext.coords.lng.toFixed(3)}` : "",
    ].filter(Boolean).join(" · ");

    // Compute taste profile once per call (cheap: 5 small queries)
    let tasteLine = "";
    try {
      const taste = await computeTasteProfile(user.id, admin);
      tasteLine = tasteSummaryLine(taste);
    } catch (e) {
      console.error("taste profile error", e);
    }

    const system = `Tu es l'assistant personnel du Club One World Morocco. Tu aides un membre connecté à découvrir et retrouver des établissements RÉELS référencés dans la base 1WM.

${profileLine}
${contextLine ? `Contexte session: ${contextLine}.` : ""}
${tasteLine}

RÈGLES DE PRÉCISION (critiques) :
1. N'INVENTE JAMAIS un établissement, une adresse, un horaire, un prix ou un numéro. Toutes ces informations DOIVENT provenir d'un appel d'outil (search_businesses, get_business_details, list_my_bookmarks…).
2. Avant de recommander un lieu, appelle search_businesses avec les filtres pertinents (city, category, neighborhood). Si la ville n'est pas précisée ET pas évidente dans le contexte, pose UNE courte question de clarification au lieu de deviner.
3. Pour donner des détails (horaires, prix, adresse, téléphone), appelle get_business_details avec le slug exact obtenu via search_businesses.
4. Si une recherche ne renvoie rien, dis-le franchement et propose une reformulation — ne complète pas avec des lieux génériques.
5. Quand tu cites un établissement, format obligatoire : **Nom exact** suivi du lien markdown [voir la fiche](https://oneworldmorocco.com/b/SLUG). Utilise toujours le slug renvoyé par les outils.
6. Reste concis, chaleureux, en français (sauf si l'utilisateur écrit dans une autre langue). Markdown léger (gras, listes courtes). Évite les listes interminables : 3 à 5 suggestions maximum, vraiment ciblées.
7. Utilise naturellement les goûts du membre pour personnaliser, sans les réciter.
8. **Événements / agenda** : pour toute demande type « que faire ce soir / ce week-end », « concerts », « festival », « expo », « soirée », « agenda culturel » → appelle search_events (filtre #Agenda + ville + dates). N'invente jamais un événement, et précise toujours la date/horaire renvoyés par l'outil. Si rien ne sort, dis-le franchement.
9. **Recherche web (web_search)** : appelle-la UNIQUEMENT pour des infos factuelles temps réel absentes de 1WM (pharmacie de garde, numéros d'urgence officiels, événements/festivals publics non référencés, horaires transports, démarches admin, actualités). JAMAIS pour recommander des restaurants, hôtels, spas, etc. — ceux-là doivent venir de search_businesses ; et pour l'agenda, passe d'abord par search_events. Maximum 1 appel web_search par message. Cite TOUJOURS les sources sous forme [titre](url) à la fin de ta réponse, et préviens si l'info peut avoir changé.

Outils disponibles : get_weather, search_businesses, get_business_details, search_events, list_my_bookmarks, list_my_saved_chats, get_my_taste_profile, suggest_similar_to_my_bookmarks, web_search.`;

    const convo: Msg[] = [{ role: "system", content: system }, ...messages];
    const ctx = { userId: user.id, supabase: admin };

    // Tool-calling loop (max 6 iterations)
    let finalAnswer = "";
    let modelToUse = MODEL;
    for (let i = 0; i < 6; i++) {
      const resp = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: modelToUse, messages: convo, tools, tool_choice: "auto", temperature: 0.3, max_tokens: 2500 }),
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
          convo.push({ role: "tool", tool_call_id: tc.id, name: tc.function?.name, content: JSON.stringify(result) });
        }
        continue;
      }

      finalAnswer = (choice.content || "").trim();
      break;
    }

    // Safety net: if the model exited tool loop without producing prose, force a final synthesis call without tools.
    if (!finalAnswer) {
      try {
        const finalResp = await fetch(GATEWAY_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: FALLBACK_MODEL,
            messages: [...convo, { role: "user", content: "Synthétise maintenant une réponse claire et chaleureuse pour le membre, en français, en t'appuyant uniquement sur les résultats d'outils ci-dessus. Si aucun résultat exploitable, propose poliment une reformulation." }],
            temperature: 0.4,
            max_tokens: 1500,
          }),
        });
        if (finalResp.ok) {
          const fd = await finalResp.json();
          finalAnswer = (fd.choices?.[0]?.message?.content || "").trim();
        }
      } catch (e) {
        console.error("final synthesis error", e);
      }
      if (!finalAnswer) {
        finalAnswer = "Désolé, je n'ai pas pu formuler de réponse cette fois-ci. Peux-tu reformuler ta demande (ville, type de cuisine, budget) ?";
      }
    }

    // Persist conversation
    const userTurns = messages.filter((m) => m.role === "user");
    const lastUser = userTurns[userTurns.length - 1]?.content || "";
    const newMessages = [...messages, { role: "assistant", content: finalAnswer }];

    let resultChatId = chatId || null;
    if (chatId) {
      await admin.from("ai_chats").update({ messages: newMessages, updated_at: new Date().toISOString() }).eq("id", chatId).eq("user_id", user.id);
    } else {
      const title = lastUser.slice(0, 60) || "Nouvelle conversation";
      const { data: inserted } = await admin
        .from("ai_chats")
        .insert({ user_id: user.id, kind: "club", title, messages: newMessages })
        .select("id")
        .single();
      resultChatId = inserted?.id ?? null;
    }

    return new Response(JSON.stringify({ answer: finalAnswer, chatId: resultChatId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

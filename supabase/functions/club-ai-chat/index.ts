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
      description: "Météo actuelle pour une ville du Maroc (Marrakech, Essaouira, Casablanca, etc.).",
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
        "Recherche des établissements RÉELS dans la base One World Morocco. À utiliser systématiquement avant de citer un lieu. Combine nom, catégorie, ville, quartier. Tri par pertinence (priority_score).",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Mot-clé ou nom partiel (optionnel si category fourni)" },
          category: { type: "string", description: "Catégorie principale: restaurant, hotel, spa, activité, bar, café, etc. (optionnel)" },
          city: { type: "string", description: "Ville (ex: Marrakech, Essaouira, Casablanca)" },
          neighborhood: { type: "string", description: "Quartier (ex: Gueliz, Médina, Hivernage)" },
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
      let q = ctx.supabase
        .from("businesses")
        .select("id,name,slug,city,neighborhood,main_category,categories,description_fr,google_rating,google_review_count,priority_score")
        .eq("is_active", true)
        .order("priority_score", { ascending: false, nullsFirst: false })
        .limit(limit);
      if (args.query) q = q.or(`name.ilike.%${args.query}%,description_fr.ilike.%${args.query}%`);
      if (args.city) q = q.ilike("city", `%${args.city}%`);
      if (args.neighborhood) q = q.ilike("neighborhood", `%${args.neighborhood}%`);
      if (args.category) q = q.or(`main_category.ilike.%${args.category}%,categories.cs.{${args.category}}`);
      const { data, error } = await q;
      if (error) return { error: error.message };
      return { results: (data || []).map((b: any) => ({ ...b, url: `https://oneworldmorocco.com/b/${b.slug}` })) };
    }
    if (name === "get_business_details") {
      const { data, error } = await ctx.supabase
        .from("businesses")
        .select("id,name,slug,city,neighborhood,address,main_category,categories,description_fr,phone,website,google_rating,google_review_count,min_price,opening_hours")
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

    const { chatId, messages = [] }: { chatId?: string; messages: Msg[] } = await req.json();

    // Load Club member profile (lightweight context)
    const { data: member } = await admin
      .from("club_members")
      .select("first_name,nickname,city,country")
      .eq("user_id", user.id)
      .maybeSingle();

    const profileLine = member
      ? `Profil utilisateur: ${member.first_name || member.nickname || "Membre"}${member.city ? ` · ${member.city}` : ""}${member.country ? ` (${member.country})` : ""}.`
      : "";

    // Compute taste profile once per call (cheap: 5 small queries)
    let tasteLine = "";
    try {
      const taste = await computeTasteProfile(user.id, admin);
      tasteLine = tasteSummaryLine(taste);
    } catch (e) {
      console.error("taste profile error", e);
    }

    const system = `Tu es l'assistant personnel du Club One World Morocco. Tu aides l'utilisateur connecté à retrouver ses adresses sauvegardées, ses conversations précédentes, et tu réponds à ses questions sur le Maroc (météo, lieux, recommandations).
${profileLine}
${tasteLine}
Règles:
- Réponds en français par défaut, sauf si l'utilisateur écrit dans une autre langue.
- Reste concis et chaleureux. Markdown léger autorisé (gras, listes courtes).
- Tu connais déjà les goûts du membre (ci-dessus) : utilise-les naturellement pour personnaliser tes suggestions, sans les énumérer mécaniquement.
- Utilise les outils quand pertinent: get_weather (météo), search_businesses (lieu précis), list_my_bookmarks, list_my_saved_chats, get_my_taste_profile (détail des goûts), suggest_similar_to_my_bookmarks (recommandations alignées sur les bookmarks).
- Quand tu cites un établissement, mets son nom exact entre **doubles astérisques**.`;

    const convo: Msg[] = [{ role: "system", content: system }, ...messages];
    const ctx = { userId: user.id, supabase: admin };

    // Tool-calling loop (max 4 iterations)
    let finalAnswer = "";
    for (let i = 0; i < 4; i++) {
      const resp = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: MODEL, messages: convo, tools, tool_choice: "auto", temperature: 0.6, max_tokens: 1500 }),
      });

      if (resp.status === 429) return new Response(JSON.stringify({ error: "rate_limit" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: "credits_exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (!resp.ok) {
        const txt = await resp.text();
        console.error("gateway error", resp.status, txt);
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

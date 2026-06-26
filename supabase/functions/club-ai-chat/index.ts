import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

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
      description: "Recherche d'établissements (restaurants, hôtels, activités) par nom ou mot-clé dans la base One World Morocco.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Nom ou mot-clé" },
          city: { type: "string", description: "Ville (optionnel)" },
          limit: { type: "number", description: "Nombre de résultats (max 8)", default: 5 },
        },
        required: ["query"],
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
];

async function runTool(name: string, args: any, ctx: { userId: string; supabase: any }) {
  try {
    if (name === "get_weather") {
      const { data, error } = await ctx.supabase.functions.invoke("get-weather", { body: { city: args.city } });
      if (error) return { error: String(error) };
      return data;
    }
    if (name === "search_businesses") {
      const limit = Math.min(Number(args.limit) || 5, 8);
      let q = ctx.supabase
        .from("businesses")
        .select("id,name,slug,city,main_category,description_fr,google_rating,google_review_count")
        .eq("is_active", true)
        .ilike("name", `%${args.query}%`)
        .limit(limit);
      if (args.city) q = q.ilike("city", `%${args.city}%`);
      const { data, error } = await q;
      if (error) return { error: error.message };
      return { results: data || [] };
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
      return { results: data || [] };
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

    const system = `Tu es l'assistant personnel du Club One World Morocco. Tu aides l'utilisateur connecté à retrouver ses adresses sauvegardées, ses conversations précédentes, et tu réponds à ses questions sur le Maroc (météo, lieux, recommandations).
${profileLine}
Règles:
- Réponds en français par défaut, sauf si l'utilisateur écrit dans une autre langue.
- Reste concis et chaleureux. Markdown léger autorisé (gras, listes courtes).
- Utilise les outils quand pertinent: get_weather pour la météo, search_businesses pour trouver un lieu précis, list_my_bookmarks et list_my_saved_chats pour le contexte personnel.
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

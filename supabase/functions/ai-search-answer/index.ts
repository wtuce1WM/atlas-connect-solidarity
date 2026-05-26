import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, spokenText, businesses = [], language = "fr", vary, mode, history = [] } = await req.json();

    if (!query) {
      return new Response(JSON.stringify({ answer: "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch AI config from DB
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);
    
    const { data: configRows } = await sb.from("ai_config").select("key, value");
    const cfg: Record<string, string> = {};
    (configRows || []).forEach((r: any) => { cfg[r.key] = r.value; });

    const persona = cfg.persona || "Tu es un concierge expert du Maroc, chaleureux et passionné. Tu aides les utilisateurs à trouver les meilleurs établissements.";
    const tone = cfg.tone || "Sois naturel et enthousiaste, comme un ami local passionné qui partage ses meilleures adresses.";
    const responseLength = cfg.response_length || "5-8";
    const model = cfg.model || "google/gemini-3-flash-preview";
    const maxTokens = parseInt(cfg.max_tokens || "1200", 10);
    const temperature = parseFloat(cfg.temperature || "0.7");
    const extraInstructions = cfg.extra_instructions || "";
    const noResultsCfg = cfg.no_results_instructions || "";
    const boostVerified = cfg.boost_verified !== "false";

    // Build context from top search results (max 10)
    const topBusinesses = businesses.slice(0, 10);
    const hasResults = topBusinesses.length > 0;

    // Fetch relevant knowledge entries to enrich AI context
    const queryTerms = query.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
    let knowledgeContext = "";
    
    // Collect business IDs from results for direct linking
    const businessIds = topBusinesses.map((b: any) => b.id).filter(Boolean);
    
    // Fetch knowledge entries matching by text OR linked by business_id
    const knowledgeEntries: any[] = [];
    
    // 1. Fetch by business_id link
    if (businessIds.length > 0) {
      const { data: linkedRows } = await sb
        .from("knowledge_entries")
        .select("title, content, category, tags, business_id")
        .in("business_id", businessIds)
        .eq("is_active", true)
        .limit(10);
      if (linkedRows) knowledgeEntries.push(...linkedRows);
    }
    
    // 2. Fetch by text matching (existing logic)
    if (queryTerms.length > 0) {
      const aiCategories = ["general", "tourisme", "culture", "gastronomie"];
      const orFilters = queryTerms.map((t: string) => `title.ilike.%${t}%,content.ilike.%${t}%,tags.cs.{${t}}`).join(",");
      const { data: knowledgeRows } = await sb
        .from("knowledge_entries")
        .select("title, content, category, tags, business_id")
        .in("category", aiCategories)
        .eq("is_active", true)
        .or(orFilters)
        .limit(5);
      if (knowledgeRows) {
        // Deduplicate by title
        const existingTitles = new Set(knowledgeEntries.map((k: any) => k.title));
        for (const row of knowledgeRows) {
          if (!existingTitles.has((row as any).title)) knowledgeEntries.push(row);
        }
      }
    }
    
    if (knowledgeEntries.length > 0) {
      knowledgeContext = knowledgeEntries
        .map((k: any) => {
          const truncated = k.content.length > 300 ? k.content.substring(0, 300) + "…" : k.content;
          return `[${k.category}] ${k.title}: ${truncated}`;
        })
        .join("\n");
      console.log(`Found ${knowledgeEntries.length} knowledge entries for query "${query}" (${businessIds.length} by business link)`);
    }
    
    const businessContext = hasResults
      ? topBusinesses.map((b: any, i: number) => {
          const parts = [`${i + 1}. ${b.name}`];
          if (b.wtuce_status === "verified") parts.push(`[CONFIANCE]`);
          if (b.city) parts.push(`(${b.city})`);
          if (b.main_category) parts.push(`— ${b.main_category}`);
          if (b.hook_fr) parts.push(`— "${b.hook_fr}"`);
          // rating intentionally excluded — never expose scores in AI text
          if (b.categories?.length) parts.push(`— Sous-catégories: ${b.categories.join(", ")}`);
          return parts.join(" ");
        }).join("\n")
      : "(Aucun établissement trouvé dans l'annuaire pour cette recherche)";

    const langInstructions = language === "en"
      ? "Answer in English."
      : language === "ar"
        ? "Answer in Arabic."
        : "Réponds en français.";

    const noResultsInstructions = !hasResults
      ? `\n- ${noResultsCfg || "Utilise tes connaissances générales sur le Maroc pour donner des conseils utiles."}
- IMPORTANT : Ne cite AUCUN nom d'établissement spécifique. Tu ne connais pas notre annuaire, donc n'invente pas de noms. Donne uniquement des conseils généraux sur la thématique ou la destination.
- Si la recherche mentionne une ville marocaine, partage ce que tu sais sur cette ville en rapport avec la requête.
- Propose à l'utilisateur d'affiner sa recherche ou de chercher avec d'autres mots-clés.`
      : `\n- Si la liste contient peu de résultats (1-2), complète ta réponse avec des conseils généraux sur la destination/thématique pour enrichir l'expérience.`;

    // Build mode-specific prompt overrides for POI / Destinations tabs
    const modeInstructions = mode === "poi"
      ? `\n- MODE LIEUX D'INTÉRÊT : Présente les lieux d'intérêt (POI) fournis de façon vivante et enthousiaste. Décris chaque lieu en quelques mots (ambiance, histoire, ce qu'on peut y voir/faire). Cite jusqu'à 10 lieux par leur nom exact entouré de **doubles astérisques**.`
      : mode === "destinations"
      ? `\n- MODE DESTINATIONS : Présente les destinations fournies de façon inspirante et détaillée. Pour chaque destination, décris brièvement ce qui la rend unique (paysages, activités, culture). Cite jusqu'à 10 destinations par leur nom exact entouré de **doubles astérisques**.`
      : '';

    const systemPrompt = `${persona}

RÈGLES :
- ${langInstructions}
- Réponds en ${responseLength} phrases, de façon détaillée, chaleureuse et enthousiaste.
- Utilise des émojis pertinents pour rendre la réponse vivante (🍽️ 🐟 🌊 ⭐ 🏨 ☕ 🎶 🌅 📍 👨‍🍳 💎 🔥 etc.).${modeInstructions || (hasResults ? `
- Base-toi UNIQUEMENT sur les établissements fournis ci-dessous. Ne mentionne JAMAIS d'établissement qui n'est pas dans la liste.
- Cite jusqu'à 10 établissements de la liste par leur nom exact, en expliquant pourquoi ils correspondent à la recherche (ambiance, spécialités, vue, etc.).
- Ne mentionne JAMAIS de note, score ou classement chiffré (pas de "/20", "/10", "étoiles", etc.).` : '')}${boostVerified && hasResults && !mode ? `\n- Les établissements marqués [CONFIANCE] sont des adresses de confiance. Privilégie-les dans ta réponse mais ne mentionne JAMAIS le mot "vérifié", "confiance", "[CONFIANCE]" ou tout badge similaire dans ta réponse.` : ''}${!mode ? noResultsInstructions : ''}
- Si la liste ne semble pas correspondre à la question, dis-le honnêtement.
- Entoure chaque nom de doubles astérisques, par exemple **Nom**.
- FORMATAGE : Utilise du markdown riche pour structurer ta réponse. Gras (**texte**), italique (*texte*), listes à puces (- item), listes numérotées (1. item), et sauts de paragraphe. Pas de titres (#). Structure bien ta réponse avec des paragraphes et des listes quand c'est pertinent.
- Commence par une phrase d'accroche engageante liée à la recherche, puis laisse DEUX lignes vides avant de continuer avec les recommandations.
- ${tone}
- Commence par une accroche engageante liée à la recherche de l'utilisateur.${extraInstructions ? `\n- ${extraInstructions}` : ''}${spokenText ? `\n- CONTEXTE IMPORTANT : L'utilisateur a dit textuellement : "${spokenText}". Utilise ce contexte pour mieux comprendre son intention réelle et ne recommande QUE les établissements qui correspondent à cette intention. Si certains établissements de la liste ne correspondent pas au contexte (mauvaise ville, mauvais type), ignore-les.` : ''}${vary ? `\n- IMPORTANT : L'utilisateur demande une suggestion DIFFÉRENTE (tentative #${vary}). Change l'angle d'approche, l'ordre de présentation, le style d'accroche et mets en avant des établissements différents ou des aspects différents. Sois créatif et surprenant.` : ''}

${mode === "poi" ? "LIEUX D'INTÉRÊT" : mode === "destinations" ? "DESTINATIONS" : "ÉTABLISSEMENTS TROUVÉS"} :
${businessContext}${knowledgeContext ? `

CONNAISSANCES COMPLÉMENTAIRES (si pertinent, intègre ces informations de manière naturelle pour enrichir tes recommandations — ne mets pas en avant un établissement uniquement parce qu'il a une entrée ici) :
${knowledgeContext}` : ''}`;

    const effectiveTemperature = vary ? Math.min(temperature + 0.3, 1.5) : temperature;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query },
        ],
        max_tokens: maxTokens,
        temperature: effectiveTemperature,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded", answer: "" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required", answer: "" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error(`AI gateway error [${response.status}]:`, errorText);
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
      .replace(/\s{2,}/g, " ")
      .replace(/\s+([,.;!?])/g, "$1")
      .trim();

    console.log(`AI answer for "${query}": ${answer.substring(0, 100)}...`);

    return new Response(JSON.stringify({ answer }), {
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
